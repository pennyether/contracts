pragma solidity ^0.4.19;

import "../common/Bankrollable.sol";
import "../roles/UsingAdmin.sol";


/*********************************************************
*********************** INSTADICE ************************
**********************************************************

This contract allows for users to wager a limited amount on then
outcome of a random roll between [1, 100]. The user may choose
a number, and if the roll is less than or equal ot that number,
they will win a payout that is inversely proportional to the
number they chose (lower numbers pay out more).

When a roll is "finalized", it means the result was determined
and the payout to the user if they won. Each time somebody rolls,
up to between 1 or 2 previous rolls are finalized. This ensures
rolls are automatically finalized and paid out.

One exception is with multiple rolls in the same block. When this
occurs, the finalization queue grows. All N rolls in one block
will be finalized once (at most) N rolls occur in later blocks.

Note about randomness:
  Although using blockhash for randomness is not advised,
  it is perfectly acceptable if the results of the block
  are not worth an expected value greater than that of:
    (full block reward - uncle block reward) = ~.625 Eth

  In other words, a miner is better of mining honestly and
  getting a full block reward than trying to game this contract,
  unless the maximum bet is increased to about .625, which
  this contract forbids.
*/
contract InstaDice is
    Bankrollable,
    UsingAdmin
{
    // Each roll will be 1 256-bit value stored in a map.
    struct Roll {
        // [first 256-bit segment]
        uint32 id;      // id, for convenience
        uint32 userId;  // cheaper to look-up than to store address
        uint64 bet;     // max of 18 ether
        uint8 number;   // max of 255
        uint72 payout;  // max of > 1m ether
        uint32 block;   // max of 4b (120 yrs from now)
        uint8 result;   // max of 255
        bool isPaid;    // true after paid
    }

    // These variables are the only ones modifiable.
    // We put them in a struct with the hopes that optimizer
    //   will do one write if any/all of them change.
    struct Vars {
        uint32 curId;
        uint32 curUserId;
        uint64 totalWageredGwei;
        uint32 finalizeId;
        uint64 totalWonGwei;
    }
    
    // Admin controlled settings
    struct Settings {
        uint64 minBet;    //
        uint64 maxBet;    // 
        uint8 minNumber;  // they get ~20x their bet
        uint8 maxNumber;  // they get ~1.01x their bet
        uint16 feeBips;   // each bip is .01%, eg: 100 = 1% fee.
    }

    // Keep track of all rolls
    mapping (uint32 => Roll) public rolls;

    // Store a two-way mapping of address <=> userId
    // If we've seen a user before, rolling will be just 1 write
    //  per Roll struct vs 2 writes.
    // The trade-off is 3 writes for new users. Seems fair.
    mapping (address => uint32) public userIds;
    mapping (uint32 => address) public userAddresses;

    Vars vars;
    Settings settings;
    uint8 constant public version = 1;
    
    // Admin events
    event Created(uint time);
    event SettingsChanged(uint time, address indexed admin);

    // Events
    event RollWagered(uint time, uint32 indexed id, address indexed user, uint bet, uint8 number, uint payout);
    event RollRefunded(uint time, address indexed user, string msg, uint bet, uint8 number);
    event RollFinalized(uint time, uint32 indexed id, address indexed user, uint8 result, uint payout);
    event PayoutSuccess(uint time, uint32 indexed id, address indexed user, uint payout);
    event PayoutFailure(uint time, uint32 indexed id, address indexed user, uint payout);

    function InstaDice(address _registry)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        public
    {
        vars.finalizeId = 1;
        settings.maxBet = .3 ether;
        settings.minBet = .001 ether;
        settings.minNumber = 5;
        settings.maxNumber = 98;
        settings.feeBips = 100;
        Created(now);
    }


    ///////////////////////////////////////////////////
    ////// ADMIN FUNCTIONS ////////////////////////////
    ///////////////////////////////////////////////////

    // Changes the settings
    function changeSettings(
        uint64 _minBet,
        uint64 _maxBet,
        uint8 _minNumber,
        uint8 _maxNumber,
        uint16 _feeBips
    )
        public
        fromAdmin
    {
        require(_minBet <= _maxBet);    // makes sense
        require(_maxBet <= .625 ether); // capped at (block reward - uncle reward)
        require(_minNumber >= 1);       // not advisible, but why not
        require(_maxNumber <= 99);      // over 100 makes no sense
        require(_feeBips <= 500);       // max of 5%
        settings.minBet = _minBet;
        settings.maxBet = _maxBet;
        settings.minNumber = _minNumber;
        settings.maxNumber = _maxNumber;
        settings.feeBips = _feeBips;
        SettingsChanged(now, msg.sender);
    }
    

    ///////////////////////////////////////////////////
    ////// PUBLIC FUNCTIONS ///////////////////////////
    ///////////////////////////////////////////////////

    // Adds a new roll to the rolls map.
    // The result will be immediately available: .getRollResult() / .getRollPayout()
    // Automatically finalizes one or two rolls in the queue.
    // This means this roll will be finalized eventually (usually next)
    //
    // Painstakingly optimized for Gas Cost:
    //
    //   - creating roll:                55k, 95k (new roller)
    //      - 22k: tx overhead
    //      -  3k: validation
    //      -  5k: _createNewRoll()
    //      - 20k: if new roller, via _createNewRoll()
    //      -  3k: event (RollWagered)
    //      -  2k: SLOADs, execution 
    //
    //   - resolving nothing:            56k, 96k (new roller)
    //      - 55k, 95k: [above]
    //      -  1k: SLOADs, execution
    //
    //   - resolving one losing roll:    72k, 112k (new roller)
    //      - 55k, 95k: [above]
    //      - 10k: 2 updates: roll.result, finalizeId
    //      -  3k: event (RollFinalized)
    //      -  3k: SLOADs, execution
    //
    //   - resolving two losing rolls:   90k, 130k (new roller)
    //      - 55k, 95k: above
    //      - 16k: resolving first roll [above]
    //      - 16k: resolving second roll [above]
    //      -  2k: SLOADs, execution
    //
    //   - resolving a winning roll:     95k, 135k (new roller)
    //      - 55k, 95k: [above]
    //      - 21k: send winnings
    //      - 10k: 3 updates: [roll.result,isPaid], [totalWonGwei,finalizeId]
    //      -  5k: events (PayoutSuccess, RollFinalized)
    //      -  3k: SLOADs, execution
    function roll(uint8 _number)
        public
        payable
    {
        // Ensure bet and number are valid
        // To save SLOADs, read entire settings to memory.
        Settings memory _settings = settings;
        if (_number < _settings.minNumber)
            return _errorAndRefund("Roll number too small.", msg.value, _number);
        if (_number > _settings.maxNumber)
            return _errorAndRefund("Roll number too large.", msg.value, _number);
        if (msg.value < _settings.minBet)
            return _errorAndRefund("Bet too small.", msg.value, _number);
        if (msg.value > _settings.maxBet)
            return _errorAndRefund("Bet too large.", msg.value, _number);
        if (msg.value > curMaxBet())
            return _errorAndRefund("May be unable to payout on a win.", msg.value, _number);

        // safe to cast: msg.value < minBet < .625 ETH < 2**64
        uint64 _bet = uint64(msg.value);
        uint72 _payout = computePayout(_bet, _number);
        
        // Create the Roll (and _userId)
        uint32 _curId = _createNewRoll(_bet, _number, _payout);
        RollWagered(now, _curId, msg.sender, _bet, _number, _payout);

        // Finalize no rolls, 1 winning roll, or two losing rolls.
        _finalizeSomeRolls();
    }
        // Only called from above.
        // Refunds user the full value, and logs an error
        function _errorAndRefund(string _msg, uint _bet, uint8 _number)
            private
        {
            require(msg.sender.call.value(msg.value)());
            RollRefunded(now, msg.sender, _msg, _bet, _number);
        }

    // Pays out a user for a roll, if they won and .isPaid is false.
    // If sent 0, defaults to latest roll
    function payoutRoll(uint32 _id)
        public
    {
        if (_id == 0) _id = vars.curId;

        Roll storage _r = rolls[_id];
        // Ensure roll exists, and is not of the same block.
        if (_r.block==0 || _r.block==block.number) return;
        // Finalize the roll. This may attempt to pay user.
        _finalizeRoll(_r);
        // If not paid yet, and won, try to pay with full gas.
        if (_r.result<=_r.number && !_r.isPaid) _attemptPayout(_r, true);
    }

    // Finalizes a number of rolls in the queue
    // Just in case Queue gets too large.
    function finalizeRolls(uint _num)
        public
        returns (uint32 _numFinalized)
    {
        while (_numFinalized < _num) {
            var (_didFinalize, ) = _finalizeNext(false);
            if (!_didFinalize) break;
            else _numFinalized++;
        }
        return _numFinalized;
    }

    ////////////////////////////////////////////////////
    ////// PRIVATE FUNCTIONS ///////////////////////////
    ////////////////////////////////////////////////////

    // Only called from roll()
    // Gets or creates user (2 possible writes)
    // Saves roll in 1 write.
    function _createNewRoll(uint64 _bet, uint8 _number, uint72 _payout)
        private
        returns (uint32 _curId)
    {
        // get or create userId
        uint32 _curUserId = vars.curUserId;
        uint32 _userId = userIds[msg.sender];
        if (_userId == 0) {
            _curUserId++;
            userIds[msg.sender] = _curUserId;
            userAddresses[_curUserId] = msg.sender;
            _userId = _curUserId;
        }

        // Increment vars together (1 update)
        _curId = vars.curId + 1;
        uint64 _totalWagered = vars.totalWageredGwei + _bet / 1e9;
        vars.curUserId = _curUserId;
        vars.totalWageredGwei = _totalWagered;
        vars.curId = _curId;

        _saveRoll(_curId, _userId, _bet, _number, _payout);
    }
    // Does 1 write.
    function _saveRoll(uint32 _curId, uint32 _userId, uint64 _bet, uint8 _number, uint72 _payout)
        private
    {
        Roll storage _r = rolls[_curId];
        _r.id = _curId;
        _r.userId = _userId;
        _r.bet = _bet;
        _r.number = _number;
        _r.payout = _payout;
        _r.block = uint32(block.number);
        _r.result = 0;
        _r.isPaid = false;
    }
    
    // Finalizes a roll's results. Only callable once per roll.
    //
    //   On Win: stores the result, tries to pay the user.
    //   On Loss: emits RollFinalized() event. changes no state.
    //   Throws: if roll is invalid, or not yet resolvable
    //   Returns:
    //     - If the roll was finalized as a win or loss.
    function _finalizeRoll(Roll storage _r)
        private
        returns (bool _didPayment)
    {
        // Should never try to finalize invalid rolls.
        // Or rolls of the current block.
        assert(_r.block > 0);
        assert(_r.block != block.number);
        // Already finalized. Return false.
        if (_r.result != 0) return false;
        
        // Get the result, isWinner, and payout.
        // Return false if !isWinner.
        address _user = userAddresses[_r.userId];
        uint8 _result = computeResult(_r.block, _r.id);
        bool _isWinner = _result <= _r.number;
        if (!_isWinner) {
            _r.result = _result;
            RollFinalized(now, _r.id, _user, _result, 0);
            return false;
        }

        // Update stats. Calling this first saves gas.
        vars.totalWonGwei += uint64(_r.payout / 1e9);

        // Update roll result, try to payout with min gas.
        _r.result = _result;
        _attemptPayout(_r, false);

        // emit event
        RollFinalized(now, _r.id, _user, _result, _r.payout);
        return true;
    }

    // Finalizes 0 rolls, 1 winning roll, or 2 losing rolls.
    function _finalizeSomeRolls()
        private
    {
        // Finalize the next in queue.
        bool _didFinalize; bool _didPayment;
        (_didFinalize, _didPayment) = _finalizeNext(false);

        // If didn't finalize (eg, same block or empty queue)
        //  or if it did finalize and roll won, then stop.
        if (!_didFinalize || _didPayment) return;

        // See if the next exists, and finalize if it's a loss.
        _finalizeNext(true);
    }

    // Finalizes the next in queue, or returns (false, false)
    // Note: If roll is already finalized, it will still return (true, ?)
    function _finalizeNext(bool _onlyIfLoss)
        private
        returns (bool _didFinalize, bool _didPayment)
    {
        // Can't finalize a nonexistant roll.
        if (vars.finalizeId > vars.curId) return;

        // Get roll. Return if its of this block, or its a win (and _onlyIfLoss)
        Roll storage _r = rolls[vars.finalizeId];
        if (_r.block == block.number) return;
        if (_onlyIfLoss && computeResult(_r.block, _r.id) <= _r.number) return;
        
        // Otherwise, finalize it, and Increment Id.
        _didPayment = _finalizeRoll(_r);
        vars.finalizeId++;

        // Return values, in case somebody cares.
        return (true, _didPayment);
    }

    // Pays the user the payout of the roll.
    // If the roll is finalized, won, and not already paid.
    function _attemptPayout(Roll storage _r, bool _useFullGas)
        private
        returns (bool _didPayment)
    {
        // Make sure roll is finalized, won, and not paid.
        assert(_r.result!=0 && _r.result <= _r.number && !_r.isPaid);
        
        // Set .isPaid to true, pay user. Rollback on failure.
        address _user = userAddresses[_r.userId];
        uint _payout = _r.payout;
        _r.isPaid = true;
        _didPayment = _useFullGas
            ? _user.call.value(_payout)()
            : _user.send(_payout);
        if (_didPayment) {
            PayoutSuccess(now, _r.id, _user, _payout);
        } else {
            _r.isPaid = false;
            PayoutFailure(now, _r.id, _user, _payout);
        }
    }



    ///////////////////////////////////////////////////
    ////// PUBLIC VIEWS ///////////////////////////////
    ///////////////////////////////////////////////////

    // IMPLEMENTS: Bankrollable.getCollateral()
    // This contract has no collateral, as it pays out in near realtime.
    function getCollateral() public view returns (uint _amount) {
        return 0;
    }

    // IMPLEMENTS: Bankrollable.getWhitelistOwner()
    // Ensures contract always has at least bankroll + totalCredits.
    function getWhitelistOwner() public view returns (address _wlOwner)
    {
        return getAdmin();
    }

    // Returns the largest bet such that we could pay out 10 maximum wins.
    // The likelihood that 10 maximum bets (with highest payouts) are won
    //  within a short period of time are extremely low.
    function curMaxBet() public view returns (uint _amount) {
        // Return largest bet such that 10*bet*payout = bankrollable()
        uint _maxPayout = 10 * 100 / uint(settings.minNumber);
        return bankrollAvailable() / _maxPayout;
    }

    // Return the less of settings.maxBet and curMaxBet()
    function effectiveMaxBet() public view returns (uint _amount) {
        uint _curMax = curMaxBet();
        return _curMax > settings.maxBet ? settings.maxBet : _curMax;
    }

    // Computes the payout amount for the current _feeBips
    function computePayout(uint _bet, uint _number)
        public
        view
        returns (uint72 _wei)
    {
        // Cast to uint, makes below math cheaper.
        uint _feeBips = settings.feeBips;
        // This is safely castable to uint72 (max value of 4.7e21: 4,700 Ether)
        // Maxbet is 1e18, and max multiple is 100, so max payout < 1,000 Ether.
        return uint72(
            // The forumula: feeBips/10000 * 100/_number * _bet
            // For accuracy, we multiply by 1e32 and divide by it at the end.
            // We move multiplication to front and division to back
            // The largest this can get (before dividing at the end) is:
            //   1e32 * 1e5 (bips) * 1e2 (100) * 1e18 (max bet) = 1e57
            // This is well under uint256 overflow of 1e77 
            1e32 * (10000-_feeBips) * 100 * _bet / _number / 10000 / 1e32
        );
    }

    // Return the result, or compute it and return it.
    // Note: providers may compute the result incorrectly
    //       due to a delay in updating block.blockhash().
    //       This will cause a result of 101.
    function getRollResult(uint32 _id)
        public
        view
        returns (uint8 _result)
    {
        require(_id <= vars.curId && _id > 0);
        Roll storage _r = rolls[_id];
        return _r.result == 0
            ? computeResult(_r.block, _id)
            : _r.result;
    }

    // Returns how much payout resulted from a roll
    // Note: providers may compute the result incorrectly
    //       due to a delay in updating block.blockhash().
    //       This will cause a result of 0.
    function getRollPayout(uint32 _id)
        public
        view
        returns (uint _amount)
    {
        require(_id <= vars.curId && _id > 0);
        Roll storage _r = rolls[_id];
        return getRollResult(_id) <= _r.number
            ? _r.payout
            : 0;
    }

    // Returns a number between 1 and 100 (inclusive)
    // If blockNumber is too far past, returns 101.
    function computeResult(uint32 _blockNumber, uint32 _id)
        public
        view
        returns (uint8 _result)
    {
        bytes32 _blockHash = block.blockhash(_blockNumber);
        if (_blockHash == 0) { return 101; }
        return uint8(uint(keccak256(_blockHash, _id)) % 100 + 1);
    }

    // Expose all Vars /////////////////////////////////
    function curId() public view returns (uint32) {
        return vars.curId;
    }
    function curUserId() public view returns (uint32) {
        return vars.curUserId;
    }
    function finalizeId() public view returns (uint32) {
        return vars.finalizeId;
    }
    function totalWagered() public view returns (uint) {
        return uint(vars.totalWageredGwei) * 1e9;
    }
    function totalWon() public view returns (uint) {
        return uint(vars.totalWonGwei) * 1e9;
    }
    function getNumUnfinalized() public view returns (uint) {
        return vars.curId - (vars.finalizeId-1);
    }
    //////////////////////////////////////////////////////

    // Expose all Settings ///////////////////////////////
    function minBet() public view returns (uint) {
        return settings.minBet;
    }
    function maxBet() public view returns (uint) {
        return settings.maxBet;
    }
    function minNumber() public view returns (uint8) {
        return settings.minNumber;
    }
    function maxNumber() public view returns (uint8) {
        return settings.maxNumber;
    }
    function feeBips() public view returns (uint16) {
        return settings.feeBips;
    }
    //////////////////////////////////////////////////////

}