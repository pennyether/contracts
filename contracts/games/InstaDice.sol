pragma solidity ^0.4.19;

import "../Fundable.sol";


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
	Fundable
{
	struct Roll {
		// [first 256-bit segment]
        uint32 id;      // id, for convenience
        uint32 userId;	// cheaper to look-up than to store address
		uint64 bet;		// max of 18 ether
		uint8 number;	// max of 255
		uint72 payout;	// max of > 1m ether
		uint32 block;	// max of 4b (120 yrs from now)
		uint8 result;	// max of 255
		bool isPaid;    // true after paid
	}
	// Keep track of all rolls
	mapping (uint32 => Roll) public rolls;

	// Store a two-way mapping of address <=> userId
	// If we've seen a user before, rolling will be just 1 write
	//  per Roll struct vs 2 writes.
	// The trade-off is 3 writes for new users. Seems fair.
	mapping (address => uint32) public userIds;
	mapping (uint32 => address) public userAddresses;

    // These variables are the only ones modifiable.
    // We put them in a struct with the hopes that optimizer
    //   will do one write if any/all of them change.
    struct Vars {
        uint32 curId;
        uint32 finalizeId;
        uint32 curUserId;
        uint64 totalWageredGwei;
        uint64 totalWonGwei;
    }
    Vars vars;

	// Admin controlled settings
	uint64 public maxBet = .3 ether;	// 
	uint64 public minBet = .001 ether;	//
	uint8 public minNumber = 5;  		// they get ~20x their bet
	uint8 public maxNumber = 99;  		// they get ~1.01x their bet
	uint32 public feeBips = 100;		// 1%

	uint8 constant public version = 1;
	
    // Admin events
    event SettingsChanged(uint time, address indexed sender);
    event FundingRemoved(uint time, address indexed recipient, uint amount, uint funding);

	// Events
	event RollWagered(uint time, uint32 indexed id, address indexed user, uint bet, uint8 number, uint payout);
	event RollRefunded(uint time, address indexed user, string msg, uint bet, uint8 number);
	event RollFinalized(uint time, uint32 indexed id, address indexed user, uint8 result, uint payout);
	event PayoutSuccess(uint time, uint32 indexed id, address indexed user, uint payout);
	event PayoutFailure(uint time, uint32 indexed id, address indexed user, uint payout);

    // Funding Events
    event FundingAdded(uint time, address indexed sender, uint amount, uint funding);
    event ProfitsSent(uint time, address indexed recipient, uint amount, uint funding);

	function InstaDice(address _registry)
        Fundable(_registry)
        public
	{
        vars.finalizeId = 1;
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
		uint32 _feeBips
	)
		public
		fromAdmin
	{
		require(_minBet <= _maxBet); 	// makes sense
		require(_maxBet <= .625 ether);	// capped at (block reward - uncle reward)
		require(_minNumber >= 1);		// not advisible, but why not
		require(_maxNumber <= 99);		// over 100 makes no sense
		require(_feeBips <= 500);		// max of 5%
		minBet = _minBet;
		maxBet = _maxBet;
		minNumber = _minNumber;
		maxNumber = _maxNumber;
		feeBips = _feeBips;
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
    //   - no resolving:                 56k, 96k (new roller)
    //      - 22k: tx overhead
    //      - 20k: 1 writes: roll
    //      - 5k: 1 update: curId
    //		- 40k: (if new roller), 2 writes: userIds, userAddresses
    //      - 3k: event (RollWagered)
    //      - 6k: SLOADs, execution 
    //
    //   - resolving one losing roll:    72k, 90k (new roller)
    //      - 56k, 96k: [above]
    //      - 10k: 2 updates: roll.result, finalizeId
    //      - 3k: event (RollFinalized)
    //      - 3k: SLOADs, execution
    //
    //   - resolving two losing rolls:   90k, 130k (new roller)
    //      - 56k, 96k: above
    //      - 16k: resolving first roll [above]
    //      - 16k: resolving second roll [above]
    //      - 2k: SLOADs, execution
    //
    //   - resolving a winning roll:     95k, 135k (new roller)
    //      - 56k, 96k: [above]
    //      - 21k: send winnings
    //      - 10k: 3 updates: [roll.result,isPaid], [totalWonGwei,finalizeId]
    //      - 5k: events (PayoutSuccess, RollFinalized)
    //      - 3k: SLOADs, execution
	function roll(uint8 _number)
		public
		payable
	{
        // ensure bet and number are valid
        if (_number < minNumber)
            return _errorAndRefund("Roll number too small.", msg.value, _number);
        if (_number > maxNumber)
            return _errorAndRefund("Roll number too large.", msg.value, _number);
        if (msg.value < minBet)
            return _errorAndRefund("Bet too small.", msg.value, _number);
        if (msg.value > maxBet)
            return _errorAndRefund("Bet too large.", msg.value, _number);
        if (msg.value > curMaxBet())
        	return _errorAndRefund("May be unable to payout on a win.", msg.value, _number);

        // safe to cast: msg.value < minBet < .625 ETH < 2**64
        uint64 _bet = uint64(msg.value);
	    uint72 _payout = computePayout(_bet, _number);
	    
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
        vars.curUserId = _curUserId;
        vars.totalWageredGwei += _bet / 1e9;
        vars.curId++;

        // Add new roll (1 write), emit event.
        _saveRoll(_userId, _bet, _number, _payout);
        RollWagered(now, vars.curId, msg.sender, _bet, _number, _payout);

	    // update totalWagered, emit event.
        _finalizeSomeRolls();
	}
		// refunds user the full value, and logs an error
		function _errorAndRefund(string _msg, uint _bet, uint8 _number)
			private
		{
			require(msg.sender.call.value(msg.value)());
			RollRefunded(now, msg.sender, _msg, _bet, _number);
		}
		function _saveRoll(uint32 _userId, uint64 _bet, uint8 _number, uint72 _payout)
			private
		{
		    Roll storage _r = rolls[vars.curId];
            _r.id = vars.curId;
            _r.userId = _userId;
            _r.bet = _bet;
            _r.number = _number;
            _r.payout = _payout;
            _r.block = uint32(block.number);
            _r.result = 0;
            _r.isPaid = false;
		}

	// Pays out a user for a roll, if they won and .isPaid is false.
	function payoutRoll(uint32 _id)
		public
	{
		Roll storage _r = rolls[_id];
		// Ensure roll exists, and is not of the same block.
		if (_r.block==0 || _r.block==block.number) return;
		// Finalize the roll. This may attempt to pay user.
		_finalizeRoll(_r);
		// If not paid yet, try to pay with full gas.
		if (!_r.isPaid) _attemptPayout(_r, true);
	}

	// Finalizes a number of rolls in the queue
    // Just in case Queue gets too large.
	function finalizeRolls(uint _num)
		public
		returns (uint32 _numFinalized)
	{
		while (_numFinalized <= _num) {
			var (_didFinalize, ) = _finalizeNext(false);
			if (!_didFinalize) break;
			else _numFinalized++;
		}
		return _numFinalized;
	}

	////////////////////////////////////////////////////
	////// PRIVATE FUNCTIONS ///////////////////////////
	////////////////////////////////////////////////////
    
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
		// Should never try to finalize invalid rolls
		// Or rolls of the current block.
		assert(_r.block > 0);
	    assert(_r.block != block.number);
	    // Already finalized. Return.
	    if (_r.result != 0) return;
	    
	    // Get the result, isWinner, and payout
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

    // Finalizes 1 winning roll or up to 2 losing rolls.
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
		if (_r.result==0 || _r.result > _r.number || _r.isPaid) return;
		
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

	// Returns the largest bet that leverages us 10x.
	// The only time a user won't get paid is if there are
	//   10 wins of the highest wager and lowest odds that
	//   get finalized within 255 blocks from now.
    function curMaxBet() public view returns (uint) {
        // Upcast to uint for cheaper math below.
        uint _funding = funding;
        uint _balance = this.balance;
        // Available balance is min(balance, funding)
        uint _available = (_balance > _funding ? _funding : _balance);
        // Return largest bet such that 10*bet*payout = _available
        return _available / (10 * 100 / minNumber);
    }

	// Computes the payout amount for the current _feeBips
    function computePayout(uint _bet, uint _number)
        private
        view
        returns (uint72 _wei)
    {
    	// Cast to uint, makes below math cheaper.
    	uint _feeBips = feeBips;
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
        private
        view
        returns (uint8 _result)
    {
        bytes32 _blockHash = block.blockhash(_blockNumber);
        if (_blockHash == 0) { return 101; }
        return uint8(uint(keccak256(_blockHash, _id)) % 100 + 1);
    }

    // Getters for vars
    function curId() public view returns (uint32) {
        return vars.curId;
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

}