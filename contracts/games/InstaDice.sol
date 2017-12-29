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
	    uint32 resultBlock;
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

	// Admin controlled settings
	uint128 public minBankroll = 0;		// amt we've funded
	uint64 public maxBet = .3 ether;	// 
	uint64 public minBet = .001 ether;	//
	uint32 public feeBips = 100;		// 1%
	uint8 public minNumber = 5;  		// they get ~20x their bet
	uint8 public maxNumber = 99;  		// they get ~1.01x their bet
	
	// Events
	event RollWagered(uint time, uint32 id, address indexed user, uint bet, uint8 number);
	event RollRefunded(uint time, address indexed user, string msg);
	event RollResolved(uint time, uint32 id, address indexed user, uint bet, uint8 number, uint8 result, uint payout);
	event PayoutSuccess(uint time, uint32 id, address indexed user, uint payout);
	event PayoutFailure(uint time, uint32 id, address indexed user, uint payout);
	event ProfitsSent(uint time, address indexed recipient, uint amount, uint minBankroll, uint bankroll);

	// Admin events
	event SettingsChanged(uint time, address indexed sender);
	event BankrollAdded(uint time, address indexed sender, uint amount, uint minBankroll, uint bankroll);
	event BankrollRemoved(uint time, address indexed recipient, uint amount, uint minBankroll, uint bankroll);

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
		uint64 _maxBet,
		uint64 _minBet,
		uint32 _feeBips,
		uint8 _minNumber,
		uint8 _maxNumber
	)
		public
		fromAdmin
	{
		require(_maxBet <= .625 ether);	// capped at (block reward - uncle reward)
		require(_minBet <= maxBet); 	// makes sense
		require(_feeBips <= 500);		// max of 5%
		require(_minNumber >= 1);		// not advisible, but why not
		require(_maxNumber <= 99);		// over 100 makes no sense
		maxBet = _maxBet;
		minBet = _minBet;
		feeBips = _feeBips;
		minNumber = _minNumber;
		maxNumber = _maxNumber;
		SettingsChanged(now, msg.sender);
	}

	// Decreases minBankroll and bankroll by _amount
	function removeBankroll(uint128 _amount)
		public
		fromAdmin
	{
		require(bankroll >= _amount);
		assert(minBankroll >= _amount);
		minBankroll -= _amount;
		bankroll -= _amount;
		// send it to treasury
		address _tr = getTreasury();
		require(_tr.call.value(_amount)());
		BankrollRemoved(now, _tr, _amount, minBankroll, bankroll);
	}
	

	///////////////////////////////////////////////////
	////// PUBLIC FUNCTIONS ///////////////////////////
	///////////////////////////////////////////////////

	// Resolve the previous roll, then insert this one.
	// The result will be immediately available via .getRollResult() / .getRollPayout()
	// Upon the next roll, user will automatically be sent payout
	// Or they can call .collectPayout() manually.
	modifier validateWager(uint8 _number) {
		if (_number < minNumber) errorAndRefund("Roll number too small.");
		else if (_number > maxNumber) errorAndRefund("Roll number too large.");
		else if (msg.value < minBet) errorAndRefund("Bet too small.");
		else if (msg.value > maxBet) errorAndRefund("Bet too large.");
		else _;
	}
	function roll(uint8 _number)
		public
		validateWager(_number)
		payable
	{
	    // make sure we have the bankroll to pay if they win
	    uint64 _bet = uint64(msg.value);
	    uint128 _payout = getPayout(_bet, _number);
	    if (_payout > bankroll + msg.value) {
	    	errorAndRefund("Bankroll too small.");
	    	return;
	    }
	    
	    // resolve the last roll
	    resolveRoll(curId);
	    
	    // add this as the current roll
	    curId++;
	    rolls[curId] = Roll({
	        id: curId,
	        bet: _bet,
	        resultBlock: uint32(block.number+1),
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
	function errorAndRefund(string _msg)
		private
	{
		require(msg.sender.call.value(msg.value)());
		RollRefunded(now, msg.sender, _msg);
	}
	
	// Saves the result of a roll, pays user, updates bankroll.
	// Note: This must be called within 256 blocks of a roll, or it loses.
	//
	// This should rarely happen, since:
	//	- someone will bid within the next 256 blocks
	//	- the user can immediately see if they won, and call .collect()
	//
	function resolveRoll(uint32 id)
		private
		returns (uint128)
	{
	    Roll storage r = rolls[id];

	    // if invalid roll, or result is already set, return.
	    if (r.id == 0) return;
	    if (r.result != 0){ 
	    	return r.result <= r.number
	    		? getPayout(r.bet, r.number)
	    		: 0;
	    }
	    
	    // get the result, isWinner, and payout
	    uint8 _result = getResultFromBlock(r.resultBlock);
	    bool _isWinner = _result <= r.number;
	    uint128 _payout = getPayout(r.bet, r.number);

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
	    RollResolved(now, r.id, r.user, r.bet, r.number, r.result, _isWinner ? _payout : 0);
	    return _isWinner ? _payout : 0;
	}

	// Pays out a user for a roll, if they won and .isPaid is false.
	function collectPayout(uint32 _id)
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

	// Sends the difference between bankroll and minBankroll
	function sendProfits()
		public
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
	////// PUBLIC CONSTANTS ///////////////////////////
	///////////////////////////////////////////////////

	// Return the result, or compute it and return it.
	function getRollResult(uint32 _id)
		public
		constant
		returns (uint8 _result)
	{
		require(_id <= curId && _id > 0);
		Roll storage r = rolls[_id];
		return r.result == 0
			? getResultFromBlock(r.resultBlock)
			: r.result;
	}

	// Returns how much payout resulted from a roll
	function getRollPayout(uint32 _id)
		public
		constant
		returns (uint _amount)
	{
		require(_id <= curId && _id > 0);
		Roll storage r = rolls[_id];
		return getRollResult(_id) <= r.number
			? getPayout(r.bet, r.number)
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
	function getResultFromBlock(uint32 _blockNumber)
		private
		constant
		returns (uint8 _result)
	{
		//uint _hash = uint(block.blockhash(_blockNumber));
		uint _hash = uint(keccak256(_blockNumber));
    	return _hash == 0
    		? 101
    		: uint8((_hash % 100) + 1);
	}
	
	// Given a _bet amount and a roll _number, returns possible payout.
	function getPayout(uint64 _bet, uint8 _number)
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