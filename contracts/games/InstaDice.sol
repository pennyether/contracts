pragma solidity ^0.4.19;

import "../roles/UsingTreasury.sol";
import "../roles/UsingAdmin.sol";

contract InstaDice is
	UsingTreasury,
	UsingAdmin
{
	struct Roll {
		uint32 id;
		address user;
		uint64 bet;
		uint8 number;
	    uint32 block;
		uint8 result;
		bool isPaid;
	}
	// keep track of all rolls
	mapping (uint32 => Roll) public rolls;

	// Changed on each bid
	uint128 public bankroll;
	uint128 public totalWagered;
	uint128 public totalWon;
	uint32 public curId;

	// if bankroll is ever above this, we can send profits
	uint128 public minBankroll;

	// Admin controlled settings
	uint64 public maxBet = .3 ether;	// 
	uint64 public minBet = .001 ether;	//
	uint8 public minNumber = 5;  		// they get ~20x their bet
	uint8 public maxNumber = 99;  		// they get ~1.01x their bet
	uint32 public feeBips = 100;		// 1%

	uint8 constant public version = 1;
	
	// Events
	event RollWagered(uint time, uint32 id, address indexed user, uint bet, uint8 number);
	event RollRefunded(uint time, address indexed user, string msg, uint bet, uint8 number);
	event RollResolved(uint time, uint32 id, address indexed user, uint bet, uint8 number, uint8 result, uint payout);
	event PayoutSuccess(uint time, uint32 id, address indexed user, uint payout);
	event PayoutFailure(uint time, uint32 id, address indexed user, uint payout);

	// Admin events
	event SettingsChanged(uint time, address indexed sender);
	event BankrollAdded(uint time, address indexed sender, uint amount, uint minBankroll, uint bankroll);
	event BankrollRemoved(uint time, address indexed recipient, uint amount, uint minBankroll, uint bankroll);
	event ProfitsSent(uint time, address indexed recipient, uint amount, uint minBankroll, uint bankroll);

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

	// Decreases minBankroll and bankroll by _amount
	function removeBankroll(uint128 _amount)
		public
		fromAdmin
	{
		require(bankroll >= _amount);
		require(minBankroll >= _amount);
		minBankroll -= _amount;
		bankroll -= _amount;
		// send it to treasury
		address _tr = getTreasury();
		require(_tr.call.value(_amount)());
		BankrollRemoved(now, _tr, _amount, minBankroll, bankroll);
	}

	// Sends the difference between bankroll and minBankroll
	function sendProfits()
		public
		fromAdmin
		returns (uint _profits)
	{
		_profits = getProfits();
		if (_profits == 0) return;
		bankroll = minBankroll;
		// send it to treasury
		address _tr = getTreasury();
		require(_tr.call.value(_profits)());
		ProfitsSent(now, _tr, _profits, minBankroll, bankroll);
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
	    uint128 _payout = computePayout(_bet, _number);
	    if (_payout > bankroll + msg.value) {
	    	errorAndRefund("Bankroll too small.", _bet, _number);
	    	return;
	    }
	    
	    // resolve the last roll
	    resolveRoll(curId);
	    
	    // add this as the current roll
	    curId++;
	    rolls[curId] = Roll({
	        id: curId,
	        bet: _bet,
	        block: uint32(block.number),
	        user: msg.sender,
	        number: _number,
	        result: 0,
	        isPaid: false
	    });

	    // bankroll loses the _payout, but gains the bet
	    totalWagered += _bet;
	    bankroll = bankroll - _payout + uint128(msg.value);
	    RollWagered(now, curId, msg.sender, _bet, _number);
	}
	// refunds user the full value, and logs an error
	function errorAndRefund(string _msg, uint _bet, uint8 _number)
		private
	{
		require(msg.sender.call.value(msg.value)());
		RollRefunded(now, msg.sender, _msg, _bet, _number);
	}

	// Pays out a user for a roll, if they won and .isPaid is false.
	// They have 256 blocks to call this, unless someone else rolls first.
	function payoutRoll(uint32 _id)
		public
	{
		// resolve the roll, make sure payout > 0 and isPaid is false.
		Roll storage r = rolls[_id];
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
	
	// Increase minBankroll and bankroll by whatever value is sent
	function addBankroll()
		public
		payable 
	{
		minBankroll += uint128(msg.value);
	    bankroll += uint128(msg.value);
	    BankrollAdded(now, msg.sender, msg.value, minBankroll, bankroll);
	}

	////////////////////////////////////////////////////
	////// PRIVATE FUNCTIONS ///////////////////////////
	////////////////////////////////////////////////////
	// Saves the result of a roll, pays user, updates bankroll.
	// Returns the amount of this roll won for the user
	function resolveRoll(uint32 id)
		private
		returns (uint128)
	{
	    Roll storage r = rolls[id];

	    // return if: invalid roll, block too early, or already resolved
	    if (r.id == 0 || r.block == block.number) return;
	    if (r.result != 0){ 
	    	return r.result <= r.number
	    		? computePayout(r.bet, r.number)
	    		: 0;
	    }
	    
	    // get the result, isWinner, and payout
	    uint8 _result = computeResult(r.block, r.id);
	    bool _isWinner = _result <= r.number;
	    uint128 _payout = computePayout(r.bet, r.number);

	    // update roll result so we know it's been resolved
	    r.result = _result;

	    // If they won, try to pay them. (.send() to limit gas)
	    // If they lost, increment our bankroll
	    if (_isWinner) {
	    	r.isPaid = true;
	    	totalWon += _payout;
	        if (r.user.send(_payout)) {
	        	PayoutSuccess(now, id, r.user, _payout);
	        } else {
	        	r.isPaid = false;
	        	PayoutFailure(now, id, r.user, _payout);
	        }
	    } else {
	        bankroll += _payout;
	    }

	    // Log event
	    uint128 _realPayout = _isWinner ? _payout : 0;
	    RollResolved(now, r.id, r.user, r.bet, r.number, r.result, _realPayout);
	    return _realPayout;
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
			? computePayout(r.bet, r.number)
			: 0;
	}

	function getProfits()
		public
		constant
		returns (uint _amount)
	{
		// Balance should always be >= bankroll.
		if (bankroll <= minBankroll) return;
		return bankroll - minBankroll;
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
	    returns (uint128 _wei)
	{
		// This is safely castable to uint128 (max value of 1e38)
		// Since maxbet is 1e18, and max multiple is 100
	    return uint128(
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