pragma solidity ^0.4.19;

import "../roles/UsingTreasury.sol";
import "../roles/UsingAdmin.sol";

contract InstaDice is
	UsingTreasury,
	UsingAdmin
{
	struct Roll {
		address user;
		uint64 bet;		// max of 18 ether
		uint8 number;	// max of 255
		uint80 payout;	// max of > 1m ether
	    uint32 block;	// max of 4b (120 yrs from now)
		uint8 result;	// max of 255
		bool isPaid;
	}
	// keep track of all rolls
	mapping (uint32 => Roll) public rolls;

	// Changed on each bid
	uint128 public bankroll;
	uint128 public totalWagered;
	uint128 public totalWon;
	uint32 public curId;

	// a queue of unresolved rolls.
	uint32 public unresolvedRollsPtr;
	uint[] public unresolvedRolls;

	// if bankroll is ever above this, we can send profits
	uint128 public funding;

	// Admin controlled settings
	uint64 public maxBet = .3 ether;	// 
	uint64 public minBet = .001 ether;	//
	uint8 public minNumber = 5;  		// they get ~20x their bet
	uint8 public maxNumber = 99;  		// they get ~1.01x their bet
	uint32 public feeBips = 100;		// 1%

	uint8 constant public version = 1;
	
	// Events
	event RollWagered(uint time, uint32 indexed id, address indexed user, uint bet, uint8 number, uint payout);
	event RollRefunded(uint time, address indexed user, string msg, uint bet, uint8 number);
	event RollResolved(uint time, uint32 indexed id, address indexed user, uint8 result, uint payout);
	event PayoutSuccess(uint time, uint32 indexed id, address indexed user, uint payout);
	event PayoutFailure(uint time, uint32 indexed id, address indexed user, uint payout);

	// Admin events
	event SettingsChanged(uint time, address indexed sender);
	event FundingAdded(uint time, address indexed sender, uint amount, uint funding, uint bankroll);
	event FundingRemoved(uint time, address indexed recipient, uint amount, uint funding, uint bankroll);
	event ProfitsSent(uint time, address indexed recipient, uint amount, uint funding, uint bankroll);

	function InstaDice(address _registry)
        UsingTreasury(_registry)
        UsingAdmin(_registry)
        public
	{}


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

	// Decreases funding and bankroll by _amount
	function removeFunding(uint128 _amount)
		public
		fromAdmin
	{
		if (_amount > this.balance) _amount = uint128(this.balance);
		require(_amount <= bankroll);
		require(_amount <= funding);
		funding -= _amount;
		bankroll -= _amount;
		// send it to treasury
		address _tr = getTreasury();
		require(_tr.call.value(_amount)());
		FundingRemoved(now, _tr, _amount, funding, bankroll);
	}

	// Sends the difference between bankroll and funding
	function sendProfits()
		public
		returns (uint _profits)
	{
		_profits = getProfits();
		if (_profits == 0) return;
		bankroll = funding;
		// send it to treasury
		address _tr = getTreasury();
		require(_tr.call.value(_profits)());
		ProfitsSent(now, _tr, _profits, funding, bankroll);
	}
	

	///////////////////////////////////////////////////
	////// PUBLIC FUNCTIONS ///////////////////////////
	///////////////////////////////////////////////////

	// Resolve the previous roll, then insert this one.
	// The result will be immediately available via .getRollResult() / .getRollPayout()
	// Upon the next roll, user will automatically be sent payout
	// Or they can call .collectPayout() manually.
	modifier validateWager(uint8 _number) {
		uint _bet = msg.value;
		if (_number < minNumber) errorAndRefund("Roll number too small.", _bet, _number);
		else if (_number > maxNumber) errorAndRefund("Roll number too large.", _bet, _number);
		else if (_bet < minBet) errorAndRefund("Bet too small.", _bet, _number);
		else if (_bet > maxBet) errorAndRefund("Bet too large.", _bet, _number);
		else _;
	}
	function roll(uint8 _number)
		public
		validateWager(_number)
		payable
	{
	    // make sure we have the bankroll to pay if they win
	    uint64 _bet = uint64(msg.value);
	    uint80 _payout = computePayout(_bet, _number);
	    if (_payout > bankroll + msg.value) {
	    	errorAndRefund("Bankroll too small.", _bet, _number);
	    	return;
	    }
	    
	    // resolve the last roll, or add it to unresolvedRolls
	    resolveRoll(curId);
	    
	    // increment curId, add a new roll
	    curId++;
	    rolls[curId] = Roll({
	    	user: msg.sender,
	        bet: _bet,
	        number: _number,
	        payout: _payout,
	        block: uint32(block.number),
	        result: 0,
	        isPaid: false
	    });

	    // bankroll gains the bet, but loses payout
	    // bankroll will be freed up when roll is resolved.
	    totalWagered += _bet;
	    bankroll = bankroll + uint128(msg.value) - _payout;
	    RollWagered(now, curId, msg.sender, _bet, _number, _payout);
	}
	// refunds user the full value, and logs an error
	function errorAndRefund(string _msg, uint _bet, uint8 _number)
		private
	{
		require(msg.sender.call.value(msg.value)());
		RollRefunded(now, msg.sender, _msg, _bet, _number);
	}

	// Pays out a user for a roll, if they won and .isPaid is false.
	// This must be called for unresolved rolls within 256 blocks.
	function payoutRoll(uint32 _id)
		public
	{
		// use latest roll if _id==0
		if (_id==0) _id = curId;
		// do not attempt to resolve if its unresolvable.
		// this would add it to unresolved queue.
		Roll storage r = rolls[_id];
		if (r.block == block.number) return;
		// resolve, and quit if it's paid or nothing to payout.
		uint _payout = resolveRoll(_id);
		if (r.isPaid || _payout == 0) return;
		
		// set it as paid, try to send, and rollback on failure.
		r.isPaid = true;
		bool _success = r.user.call.value(_payout)();
		if (_success) {
			PayoutSuccess(now, _id, r.user, _payout);
		} else {
			r.isPaid = false;
			PayoutFailure(now, _id, r.user, _payout);
		}
	}

	// Resolves a number of unresolved rolls
	function resolveUnresolvedRolls(uint _num)
		public
		returns (uint32 _numResolved)
	{
		// only resolve up to the current length
		uint _len = (unresolvedRolls.length - unresolvedRollsPtr);
		if (_len == 0) return;
		if (_num > _len) _num = _len;

		uint32 _rollId;
		for (uint _i = 0; _i < _num; _i++) {
			// quit loop if we can't resolve this one.
			_rollId = uint32(unresolvedRolls[unresolvedRollsPtr + _i]);
			if (rolls[_rollId].block == block.number) break;
			// resolve, delete, and increment count.
			resolveRoll(_rollId);
			delete unresolvedRolls[unresolvedRollsPtr + _i];
			_numResolved++;
		}
		// update our pointer and return.
		unresolvedRollsPtr += _numResolved;
		return _numResolved;
	}
	
	// Increase funding and bankroll by whatever value is sent
	function addFunding()
		public
		payable 
	{
		funding += uint128(msg.value);
	    bankroll += uint128(msg.value);
	    FundingAdded(now, msg.sender, msg.value, funding, bankroll);
	}

	////////////////////////////////////////////////////
	////// PRIVATE FUNCTIONS ///////////////////////////
	////////////////////////////////////////////////////
	// Saves the result of a roll, pays user, updates bankroll.
	// Returns the amount of this roll won for the user.
	// Note: Cannot resolve rolls on the same block.
	//       They are moved to an array to be cleaned up later.
	function resolveRoll(uint32 _id)
		private
		returns (uint80 _payout)
	{
	    Roll storage r = rolls[_id];

	    // return if invalid roll
	    if (r.block == 0) return;
	    // can't resolve right now -- push to unresolvable
	    if (r.block == block.number) {
	    	unresolvedRolls.push(_id);
	    	return;
	    }
	    // already resolved. return the payout owed.
	    if (r.result != 0){ 
	    	return r.result <= r.number
	    		? r.payout
	    		: 0;
	    }
	    
	    // get the result, isWinner, and payout
	    uint8 _result = computeResult(r.block, _id);
	    bool _isWinner = _result <= r.number;
	    _payout = _isWinner ? r.payout : 0;

	    // update roll result so we know it's been resolved
	    r.result = _result;
	    RollResolved(now, _id, r.user, _result, _payout);

	    // If they won, try to pay them. (.send() to limit gas)
	    // If they lost, increment our bankroll
	    if (_isWinner) {
	    	totalWon += _payout;
	    	r.isPaid = true;
	        if (r.user.send(_payout)) {
	        	PayoutSuccess(now, _id, r.user, _payout);
	        } else {
	        	r.isPaid = false;
	        	PayoutFailure(now, _id, r.user, _payout);
	        }
	    } else {
	    	// increment by actual payout
	        bankroll += r.payout;
	    }
	    return _payout;
	}



	///////////////////////////////////////////////////
	////// PUBLIC CONSTANTS ///////////////////////////
	///////////////////////////////////////////////////

	// Return the result, or compute it and return it.
	// Note: providers may compute the result incorrectly
	//       due to a delay in updating block.blockhash().
	//       This will cause a result of 101.
	function getRollResult(uint32 _id)
		public
		constant
		returns (uint8 _result)
	{
		require(_id <= curId && _id > 0);
		Roll storage r = rolls[_id];
		return r.result == 0
			? computeResult(r.block, _id)
			: r.result;
	}

	// Returns how much payout resulted from a roll
	// Note: providers may compute the result incorrectly
	//       due to a delay in updating block.blockhash().
	//       This will cause a result of 0.
	function getRollPayout(uint32 _id)
		public
		constant
		returns (uint _amount)
	{
		require(_id <= curId && _id > 0);
		Roll storage r = rolls[_id];
		return getRollResult(_id) <= r.number
			? r.payout
			: 0;
	}

	function getNumUnresolvedRolls()
		public
		constant
		returns (uint)
	{
		return unresolvedRolls.length - unresolvedRollsPtr;
	}

	function getProfits()
		public
		constant
		returns (uint _amount)
	{
		if (bankroll <= funding) return;
		return bankroll - funding;
	}


	///////////////////////////////////////////////////
	////// PRIVATE CONSTANTS //////////////////////////
	///////////////////////////////////////////////////

	// Returns a number between 1 and 100 (inclusive)
	// If blockNumber is too far past, returns 101.
	function computeResult(uint32 _blockNumber, uint32 _id)
		private
		constant
		returns (uint8 _result)
	{
		bytes32 _blockHash = block.blockhash(_blockNumber);
		if (_blockHash == 0) { return 101; }
		return uint8(uint(keccak256(_blockHash, _id)) % 100 + 1);
	}
	
	// Given a _bet amount and a roll _number, returns possible payout.
	function computePayout(uint64 _bet, uint8 _number)
	    private
	    constant
	    returns (uint80 _wei)
	{
		// This is safely castable to uint80 (max value of 1e24, ~1m Ether)
		// Since maxbet is 1e18, and max multiple is 100, max result is 1e21.
	    return uint80(
	    	// The forumula: feeBips/10000 * 100/_number * _bet
	    	// For accuracy, we multiply by 1e32 and divide by it at the end.
	    	// We move multiplication to front and division to back
	    	// The largest this can get (before dividing at the end) is:
	    	// 1e32 * 1e5 (bips) * 1e2 (100) * 1e18 (max bet) = 1e57
	    	// This is well under uint256 overflow of 1e77 
	    	uint256(1e32) * (10000-feeBips) * 100 * _bet / _number / 10000 / 1e32
	    );
	}
}