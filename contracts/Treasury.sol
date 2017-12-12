pragma solidity ^0.4.0;

import "./roles/UsingMainController.sol";
import "./roles/UsingAdmin.sol";

/**
Treasury holds all funds and will only send:
	- to token, via .distributeToToken(), if balance > bankroll
	- to registry.getMainController(), limited by dailyFundLimit

Furthermore to ensure funds are safe:
	- dailyFundLimit will be quite low, only a few ETH
	- changeDailyFundLimit() can only change by 5%, once per day
	- at any time, token can call ".dissolve()" to obtain all funds
	- token address can only be set once

The worst case scenario is somebody steals the owner account
and sets registry.getMainController() to be their own wallet.
In this case they can only steal up to dailyFundLimit per day.
They can continute to steal each day, until token holders vote
to dissolve, in which case ALL funds are sent back to the token
to be distributed as dividends.
*/
//@createInterface
contract Treasury is 
	UsingMainController,
	UsingAdmin
{
	uint public dailyFundLimit;
	uint public dayDailyFundLimitChanged;
	uint public dayLastFunded;
	uint public amtFundedToday;

	uint public bankroll;		// minimum amount before allow distribution
	bool public isDissolved;	// if true, cant fund any longer
	uint public amtIn;			// total funds received (excludes bankroll)
	uint public amtOut;			// total funds sent
	uint public amtDistributed;	// total funds sent to token

	// Address that can:
	// 		- set bankroll
	//		- receive distributions
	//		- call .dissolve(), causing all funds to be sent to itself
	//
	// Token can only be set once, to ensure nobody can steal funds.
	address public token;

	// when someone calls distribute, they get a small reward
	// 100 = 1%, 1000 = .1%, etc
	uint public distributeRewardDenom = 1000;

	// prevents a function from being called again before it has completed
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }
	modifier fromToken() { require(msg.sender == token); _; }

	// EVENTS
	event Error(uint time, string msg);
	event TokenSet(uint time, address token);
	event DailyFundLimitSet(uint time, uint amount);
	event DailyFundLimitChanged(uint time, uint oldValue, uint newValue);
	event BankrollReceived(uint time, address sender, uint amount);
	event Dissolved(uint time, address sender, uint amount);
	event DistributeSuccess(uint time, address token, uint amount);
	event DistributeFailure(uint time, address token, uint amount);
	event RewardPaid(uint time, address recipient, string note, uint amount);
	event RewardNotPaid(uint time, address recipient, string note, uint amount);
	event FundSuccess(uint time, address recipient, string note, uint value);
	event FundFailure(uint time, string reason, address recipient, string note, uint value);
	event RefundReceived(uint time, string note, address sender, uint value);
	event DepositReceived(uint time, address sender, uint amount);

	function Treasury(address _registry)
		UsingMainController(_registry)
		UsingAdmin(_registry)
	{}

	// Callable once by admin to set the Token address
	function setToken(address _token)
		fromAdmin
	{
		require(token == address(0));
		token = _token;
		TokenSet(now, _token);
	}
	// Callable once by admin to set the dailyFundLimit
	function setDailyFundLimit(uint _amount)
		fromAdmin
	{
		require(dailyFundLimit == 0);
		dailyFundLimit = _amount;
		DailyFundLimitSet(now, _amount);
	}

	// Can change the dailyFundLimit +/-5%, callable once per day.
	function changeDailyFundLimit(uint _newValue)
		fromAdmin
		returns (bool _success)
	{
		require(today() > dayDailyFundLimitChanged);
		uint _oldValue = dailyFundLimit;
		uint _maxValue = (_oldValue * 105)/100;
		uint _minValue = (_oldValue * 95)/100;
		require(_newValue >= _minValue && _newValue <= _maxValue);
		dailyFundLimit = _newValue;
		dayDailyFundLimitChanged = today();
		DailyFundLimitChanged(now, _oldValue, _newValue);
		return true;
	}

	// Callable once by Token to set the bankroll
	function setBankroll()
		payable
		fromToken
	{
		require(msg.sender == token);
		require(bankroll == 0);
		bankroll = msg.value;
		BankrollReceived(now, msg.sender, msg.value);
	}

	// Callable only by token -- sends all funds to the token.
	// Sets bankroll to 0 so future funds can be distributed.
	function dissolve()
		fromToken
	{
		uint _amount = this.balance;
		if (!token.call.value(_amount)()){ throw; }
		isDissolved = true;
		bankroll = 0;
		Dissolved(now, msg.sender, _amount);
		distributeToToken();
	}

	// Sends any surplus over bankroll to token.
	// Pays a small reward to whoever calls this.
	function distributeToToken()
		returns (bool _success, uint _amount)
	{
		if (this.balance <= bankroll) {
			Error(now, "No funds to distribute.");
			return;
		}
		if (token == address(0)) {
			Error(now, "No address to distribute to.");
			return;
		}

		// calculate _reward and _amount, and send _amount
		uint _surplus = this.balance - bankroll;
		uint _reward = _surplus / distributeRewardDenom;
		_amount = _surplus - _reward;
		if (!token.call.value(_amount)()) {
			DistributeFailure(now, token, _amount);
			return (false, 0);
		}
		amtOut += _amount;
		amtDistributed += _amount;
		DistributeSuccess(now, token, _amount);

		// try to pay the reward
		if (!msg.sender.call.value(_reward)()) {
			RewardPaid(now, msg.sender, "Called .distrubuteToToken()", _reward);
		} else {
			RewardNotPaid(now, msg.sender, ".distributeToToken() couldnt send reward.", _reward);
		}
		return (true, _amount);
	}

	// gives the MainController funds so it can start auctions
	// Will fund at most dailyFundLimit per day.
	// noRentry ensures this is only called once.
	function fundMainController(uint _amount, string _note)
		noRentry
		fromMainController
		returns (bool _success)
	{
		address _mainController = address(getMainController());
		
		// ensure we can fund
		if (!canFund(_amount)) {
			FundFailure(now, "Cannot fund.", _mainController, _note, _amount);
			return false;
		}
		// ensure mainController accepts our wei
		if (!_mainController.call.value(_amount)()){
			FundFailure(now, "MainController rejected funds.", _mainController, _note, _amount);
			return false;
		}
		// increase/reset amtFundedToday and set dayLastFunded to today.
		if (today() > dayLastFunded) amtFundedToday = 0;
		amtFundedToday += _amount;
		dayLastFunded = today();
		amtOut += _amount;
		FundSuccess(now, _mainController, _note, _amount);
		return true;
	}

	// Can receive funds back from mainController.  Subtracts from daily limit.
	function refund(string _note)
		payable
		fromMainController
	{
		if (msg.value <= amtFundedToday){ amtFundedToday -= msg.value; }
		amtIn += msg.value;
		RefundReceived(now, _note, msg.sender, msg.value);
	}

	// Can receive deposits from anyone (eg: PennyAuctions)
	function () payable {
		amtIn += msg.value;
		DepositReceived(now, msg.sender, msg.value);
	}

  	// if _amount is too large, or would exceed our limit for today, then return false.
  	function canFund(uint _amount) constant returns (bool) {
  		if (isDissolved) return false;
		if (_amount > this.balance || _amount > dailyFundLimit) return false;
		if (today() <= dayLastFunded && amtFundedToday + _amount > dailyFundLimit) return false;
		return true;
  	}

  	function getAmountDistributable() constant returns (uint) {
  		if (token == address(0)) return 0;
  		if (this.balance <= bankroll) return 0;
  		return this.balance - bankroll;
  	}
  	function getDistributeReward() constant returns (uint) {
  		return getAmountDistributable() / distributeRewardDenom;
  	}

  	function today() private constant returns (uint) {
    	return now / 1 days;
  	}

}