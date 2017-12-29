pragma solidity ^0.4.19;

contract InstaDice {
	struct Roll {
		uint32 id;
		address user;
		uint64 bet;
		uint8 number;
	    uint32 resultBlock;
		uint8 result;
	}

	// 114590 gas
	uint128 public bankroll;
	uint128 public totalWagered;
	uint128 public totalWon;
	uint32 public curId;

	// Admin controlled settings
	uint64 public maxBet = .3 ether;
	uint64 public minBet = .001 ether;
	uint32 public feeBips = 100;		// 1%
	uint8 public minNumber = 5;  		// they get ~20x their bet
	uint8 public maxNumber = 99;  		// they get ~1.01x their bet

	// keep track of all rolls, and each user's balance
	mapping (uint32 => Roll) public rolls;
	mapping (address => uint128) public balance;
	
	// Events
	event RollWagered(uint time, uint32 id, address indexed user, uint bet, uint8 number);
	event RollRefunded(uint time, address indexed user, string msg);
	event RollResolved(uint time, uint32 id, address indexed user, uint bet, uint8 number, uint8 result, uint payout);
	event UserCollected(uint time, address indexed user, uint amount);

	modifier validateBet(uint8 _number) {
		if (_number < minNumber) errorAndRefund("Roll number too small.");
		else if (_number > maxNumber) errorAndRefund("Roll number too large.");
		else if (msg.value < minBet) errorAndRefund("Bet too small.");
		else if (msg.value > maxBet) errorAndRefund("Bet too large.");
		else _;
	}
	
	function roll(uint8 _number)
		public
		validateBet(_number)
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
	        result: 0
	    });

	    // bankroll loses the _payout, but gains the bet
	    totalWagered += _bet;
	    bankroll = bankroll - _payout + uint128(msg.value);
	    // userRollCount[msg.sender]++;
	    // userRolls[msg.sender].push(curId);
	    RollWagered(now, curId, msg.sender, _bet, _number);
	}
	// refunds user the full value, and logs an error
	function errorAndRefund(string _msg)
		private
	{
		require(msg.sender.call.value(msg.value)());
		RollRefunded(now, msg.sender, _msg);
	}
	
	// Saves the result of a roll, and updates bankroll or user's balance.
	// Note: This must be called within 256 blocks of a roll, or it loses.
	//
	// This should rarely happen, since:
	//	- someone will bid within the next 256 blocks
	//	- the user can immediately see if they won, and call .collect()
	//
	function resolveRoll(uint32 id) private {
	    Roll storage r = rolls[id];

	    // if invalid roll, or result is already set, return.
	    if (r.id==0 || r.result!=0) return;
	    
	    // get the result, isWinner, and payout
	    uint8 _result = getResultFromBlock(r.resultBlock);
	    bool _isWinner = _result <= r.number;
	    uint128 _payout = getPayout(r.bet, r.number);

	    // update roll result so we know it's been resolved
	    r.result = _result;

	    // If they won, update stats and balance.
	    // Otherwise, increase our bankroll.
	    if (_isWinner) {
	    	totalWon += _payout;
	        balance[r.user] += _payout;
	    } else {
	        bankroll += _payout;
	    }

	    // Log event
	    RollResolved(now, r.id, r.user, r.bet, r.number, r.result, _isWinner ? _payout : 0);
	}

	// Pays out user their balance, including their last roll.
	function collect()
		public
	{
		if (rolls[curId].user == msg.sender) {
			resolveRoll(curId);
		}
		uint _amount = balance[msg.sender];
		balance[msg.sender] = 0;
		require(msg.sender.call.value(_amount)());
		UserCollected(now, msg.sender, _amount);
	}
	
	function addBankroll()
		public
		payable 
	{
	    bankroll += uint128(msg.value);
	}

	// Returns a number between 1 and 100 (inclusive)
	// If blockNumber is too far past, returns 101.
	function getResultFromBlock(uint32 _blockNumber)
		constant
		private
		returns (uint8 _result)
	{
		uint _hash = uint(block.blockhash(_blockNumber));
    	// TEMPORARY FOR LOCAL TESTING
    	_hash = uint(keccak256(_blockNumber));
    	//////////////////////////////
    	// If hash is 0, force a result of 101 (a loss)
    	return _hash == 0
    		? 101
    		: uint8((_hash % 100) + 1);
	}

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
		Roll storage r = rolls[_id];
		return getRollResult(_id) <= r.number
			? getPayout(r.bet, r.number)
			: 0;
	}

	// Return's a user's balance, including the result of the latest roll.
	function getBalance(address _user)
		public
		constant
		returns (uint _amount)
	{
		// if last roll is theirs, and is not resolved, compute result.
		if (rolls[curId].user == _user && rolls[curId].result == 0) {
			_amount = getRollPayout(curId);
		}
		return balance[_user] + _amount;
	}

	// Finds the user's most recent roll.
	// function getMostRecentRoll(address _user)
	// 	public
	// 	constant
	// 	returns (uint32 _id)
	// {

	// }
	
	// Given a _bet amount and a roll _number, returns possible payout.
	function getPayout(uint64 _bet, uint8 _number)
	    public
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