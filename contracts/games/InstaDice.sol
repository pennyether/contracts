pragma solidity ^0.4.23;

import "../common/Bankrollable.sol";
import "../roles/UsingAdmin.sol";


/*********************************************************
*********************** INSTADICE ************************
**********************************************************

This contract allows for users to wager a limited amount on then
outcome of a random roll between [1, 100]. The user may choose
a number, and if the roll is less than or equal to that number,
they will win a payout that is inversely proportional to the
number they chose (lower numbers pay out more).

When a roll is "finalized", it means the result was determined
and the payout paid to the user if they won. Each time somebody 
rolls, their previous roll is finalized. Roll results are based
on blockhash, and since only the last 256 blockhashes are 
available (who knows why it is so limited...), the user must
finalize within 256 blocks or their roll loses.

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
    struct User {
        uint32 id;
        uint32 r_id;
        uint32 r_block;
        uint8 r_number;
        uint72 r_payout;
    }

    // These stats are updated on each roll.
    struct Stats {
        uint32 numUsers;
        uint32 numRolls;
        uint96 totalWagered;
        uint96 totalWon;
    }
    
    // Admin controlled settings
    struct Settings {
        uint64 minBet;    //
        uint64 maxBet;    // 
        uint8 minNumber;  // they get ~20x their bet
        uint8 maxNumber;  // they get ~1.01x their bet
        uint16 feeBips;   // each bip is .01%, eg: 100 = 1% fee.
    }

    mapping (address => User) public users;
    Stats stats;
    Settings settings;
    uint8 constant public version = 2;
    
    // Admin events
    event Created(uint time);
    event SettingsChanged(uint time, address indexed admin);

    // Events
    event RollWagered(uint time, uint32 indexed id, address indexed user, uint bet, uint8 number, uint payout);
    event RollRefunded(uint time, address indexed user, string msg, uint bet, uint8 number);
    event RollFinalized(uint time, uint32 indexed id, address indexed user, uint8 result, uint payout);
    event PayoutError(uint time, string msg);

    constructor(address _registry)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        public
    {
        // populate with prev contracts' stats
        stats.totalWagered = 3650000000000000000;
        stats.totalWon = 3537855001272912000;
        stats.numRolls = 123;
        stats.numUsers = 19;

        // default settings
        settings.maxBet = .3 ether;
        settings.minBet = .001 ether;
        settings.minNumber = 5;
        settings.maxNumber = 98;
        settings.feeBips = 100;
        emit Created(now);
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
        emit SettingsChanged(now, msg.sender);
    }
    

    ///////////////////////////////////////////////////
    ////// PUBLIC FUNCTIONS ///////////////////////////
    ///////////////////////////////////////////////////

    // Resolves the last roll for the user.
    // Then creates a new roll.
    // Gas:
    //    Total: 56k (new), or up to 44k (repeat)
    //    Overhead: 36k
    //       22k: tx overhead
    //        2k: SLOAD
    //        3k: execution
    //        2k: curMaxBet()
    //        5k: update stats
    //        2k: RollWagered event
    //    New User: 20k
    //       20k: create user
    //    Repeat User: 8k, 16k
    //        5k: update user
    //        3k: RollFinalized event
    //        8k: pay last roll
    function roll(uint8 _number)
        public
        payable
        returns (bool _success)
    {
        // Ensure bet and number are valid.
        if (!_validateBetOrRefund(_number)) return;

        // Ensure one bet per block.
        User memory _prevUser = users[msg.sender];
        if (_prevUser.r_block == uint32(block.number)){
            _errorAndRefund("Only one bet per block allowed.", msg.value, _number);
            return false;
        }

        // Create and write new user data before finalizing last roll
        Stats memory _stats = stats;
        User memory _newUser = User({
            id: _prevUser.id == 0 ? _stats.numUsers + 1 : _prevUser.id,
            r_id: _stats.numRolls + 1,
            r_block: uint32(block.number),
            r_number: _number,
            r_payout: computePayout(msg.value, _number)
        });
        users[msg.sender] = _newUser;

        // Finalize last roll, if there was one.
        // This will throw if user won, but we couldn't pay.
        if (_prevUser.r_block != 0) _finalizePreviousRoll(_prevUser, _stats);

        // Increment stats data
        _stats.numUsers = _prevUser.id == 0 ? _stats.numUsers + 1 : _stats.numUsers;
        _stats.numRolls = stats.numRolls + 1;
        _stats.totalWagered = stats.totalWagered + uint96(msg.value);
        stats = _stats;

        // Save user in one write.
        emit RollWagered(now, _newUser.r_id, msg.sender, msg.value, _newUser.r_number, _newUser.r_payout);
        return true;
    }

    // Finalizes the previous roll and pays out user if they won.
    // Gas: 45k
    //   21k: tx overhead
    //    1k: SLOADs
    //    2k: execution
    //    8k: send winnings
    //    5k: update user
    //    5k: update stats
    //    3k: RollFinalized event
    function payoutPreviousRoll()
        public
        returns (bool _success)
    {
        // Load last roll in one SLOAD.
        User memory _prevUser = users[msg.sender];
        // Error if on same block.
        if (_prevUser.r_block == uint32(block.number)){
            emit PayoutError(now, "Cannot payout roll on the same block");
            return false;
        }
        // Error if nothing to payout.
        if (_prevUser.r_block == 0){
            emit PayoutError(now, "No roll to pay out.");
            return false;
        }

        // Clear last roll data
        User storage _user = users[msg.sender];
        _user.r_id = 0;
        _user.r_block = 0;
        _user.r_number = 0;
        _user.r_payout = 0;

        // Finalize previous roll and update stats
        Stats memory _stats = stats;
        _finalizePreviousRoll(_prevUser, _stats);
        stats.totalWon = _stats.totalWon;
        return true;
    }


    ////////////////////////////////////////////////////////
    ////// PRIVATE FUNCTIONS ///////////////////////////////
    ////////////////////////////////////////////////////////

    // Validates the bet, or refunds the user.
    function _validateBetOrRefund(uint8 _number)
        private
        returns (bool _isValid)
    {
        Settings memory _settings = settings;
        if (_number < _settings.minNumber) {
            _errorAndRefund("Roll number too small.", msg.value, _number);
            return false;
        }
        if (_number > _settings.maxNumber){
            _errorAndRefund("Roll number too large.", msg.value, _number);
            return false;
        }
        if (msg.value < _settings.minBet){
            _errorAndRefund("Bet too small.", msg.value, _number);
            return false;
        }
        if (msg.value > _settings.maxBet){
            _errorAndRefund("Bet too large.", msg.value, _number);
            return false;
        }
        if (msg.value > curMaxBet()){
            _errorAndRefund("May be unable to payout on a win.", msg.value, _number);
            return false;
        }
        return true;
    }

    // Finalizes the previous roll for the _user.
    // This will modify _stats, but not _user.
    // Throws if unable to pay user on a win.
    function _finalizePreviousRoll(User memory _user, Stats memory _stats)
        private
    {
        assert(_user.r_block != uint32(block.number));
        assert(_user.r_block != 0);
        
        // compute result and isWinner
        uint8 _result = computeResult(_user.r_block, _user.r_id);
        bool _isWinner = _result <= _user.r_number;
        if (_isWinner) {
            require(msg.sender.call.value(_user.r_payout)());
            _stats.totalWon += _user.r_payout;
        }
        // they won and we paid, or they lost. roll is finalized.
        emit RollFinalized(now, _user.r_id, msg.sender, _result, _isWinner ? _user.r_payout : 0);
    }

    // Only called from above.
    // Refunds user the full value, and logs an error
    function _errorAndRefund(string _msg, uint _bet, uint8 _number)
        private
    {
        require(msg.sender.call.value(msg.value)());
        emit RollRefunded(now, msg.sender, _msg, _bet, _number);
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
        uint _feeBips = settings.feeBips;   // Cast to uint, makes below math cheaper.
        uint _bigBet = _bet * 1e32;         // Will not overflow unless _bet >> ~1e40
        uint _bigPayout = (_bigBet * 100) / _number;
        uint _bigFee = (_bigPayout * _feeBips) / 10000;
        return uint72( (_bigPayout - _bigFee) / 1e32 );
    }

    // Returns a number between 1 and 100 (inclusive)
    // If blockNumber is too far past, returns 101.
    function computeResult(uint32 _blockNumber, uint32 _id)
        public
        view
        returns (uint8 _result)
    {
        bytes32 _blockHash = blockhash(_blockNumber);
        if (_blockHash == 0) { return 101; }
        return uint8(uint(keccak256(_blockHash, _id)) % 100 + 1);
    }

    // Expose all Stats /////////////////////////////////
    function numUsers() public view returns (uint32) {
        return stats.numUsers;
    }
    function numRolls() public view returns (uint32) {
        return stats.numRolls;
    }
    function totalWagered() public view returns (uint) {
        return stats.totalWagered;
    }
    function totalWon() public view returns (uint) {
        return stats.totalWon;
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