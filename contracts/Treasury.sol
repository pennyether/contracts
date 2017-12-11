pragma solidity ^0.4.0;

import "./roles/UsingMainController.sol";
import "./roles/UsingAdmin.sol";

/**
The treasury holds all funds, and only dispenses them to trusted sources
under certain conditions.  The trust is established via the registry...
whoever the registry says is the PennyAuctionController can receive funds.

*/
//@createInterface
contract Treasury is 
	UsingMainController,
	UsingAdmin
{
	uint public dailyFundLimit = 1 ether;
	uint public dayDailyFundLimitChanged;
	uint public dayLastFunded;
	uint public amtFundedToday;

	uint public amtIn;
	uint public amtOut;
	uint public minBankroll;

	// Address that can:
	// 		- set minBankroll
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
	event BankrollReceived(uint time, address sender, uint amount);
	event Dissolved(uint time, address sender, uint amount);
	event DailyLimitChanged(uint time, int pct);
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

	// Can change the dailyFundLimit +/-5%, callable once per day.
	function changeDailyFundLimit(int _pct)
		fromAdmin
		returns (bool _success)
	{
		require(today() > dayDailyFundLimitChanged);
		require(_pct < 5 && _pct > -5);
		dailyFundLimit = (dailyFundLimit * uint(100 + _pct))/100;
		dayDailyFundLimitChanged = today();
		DailyLimitChanged(now, _pct);
		return true;
	}

	// Callable once by Token to set the minBankroll
	function setMinBankroll()
		payable
		fromToken
	{
		require(msg.sender == token);
		require(minBankroll == 0);
		minBankroll = msg.value;
		BankrollReceived(now, msg.sender, msg.value);
	}

	// Callable only by token -- sends all funds to the token.
	function dissolve()
		fromToken
	{
		uint _amount = this.balance;
		if (!token.call.value(_amount)()){ throw; }
		Dissolved(now, msg.sender, _amount);
	}

	// Sends any surplus over minBankroll to token.
	// Pays a small reward to whoever calls this.
	function distribute()
		returns (bool _success, uint _amount)
	{
		if (this.balance <= minBankroll) {
			Error(now, "No funds to distribute.");
			return;
		}
		if (token == address(0)) {
			Error(now, "No address to distribute to.");
			return;
		}

		// calculate _reward and _amount, and send _amount
		uint _surplus = this.balance - minBankroll;
		uint _reward = _surplus / distributeRewardDenom;
		_amount = _surplus - _reward;
		if (!token.call.value(_amount)()) {
			DistributeFailure(now, token, _amount);
			return (false, 0);
		}
		DistributeSuccess(now, token, _amount);

		// try to pay the reward
		if (!msg.sender.call.value(_reward)()) {
			RewardPaid(now, msg.sender, "Called .distrubute()", _reward);
		} else {
			RewardNotPaid(now, msg.sender, ".distribute() couldnt send reward.", _reward);
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
			FundFailure(now, "Not enough funds.", _mainController, _note, _amount);
			return false;
		}
		// ensure mainController accepts our wei
		if (!_mainController.call.value(_amount)()){
			FundFailure(now, "MainController rejected funds.", _mainController, _note, _amount);
			return false;
		}
		// increase amtFundedToday and set dayLastFunded to today.
		amtOut += _amount;
		amtFundedToday += _amount;
		dayLastFunded = today();
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
		if (_amount > this.balance || _amount > dailyFundLimit) return false;
		if (today() <= dayLastFunded && amtFundedToday + _amount > dailyFundLimit) return false;
		return true;
  	}

  	function today() private constant returns (uint) {
    	return now / 1 days;
  	}

}