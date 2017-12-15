pragma solidity ^0.4.0;

import "./roles/UsingMainController.sol";
import "./roles/UsingAdmin.sol";

/**
Treasury safeguards all funds and will only send funds:
	- to token, via .distributeToToken(). If balance > bankroll.
	  As reward to incentize people to call this, a portion of
	  the profits (up to 1%) go to the caller.
	- to registry.getMainController(), limited by dailyFundLimit

Roles:
	Comptroller:
		- can .addToBankroll() and .removeFromBankroll()
		- (once set, can never change)
	Token:
		- profits sent to it when .distributeToToken() is called.
		- (once set, can never change)
	Admin:
		- can set the address of token, once
		- can set the address of comptroller, once
		- can set dailyFundLimit, once
		- can change dailyFundLimit +/- 5% per day
		- can set the distributeReward, up to 10%
	Anybody:
		- can call .distributeToToken(), they get small reward
		  proportional to the amount distributed.

Safety Restrictions:
	- dailyFundLimit is low, and can only be increased 5% per day
		- This prevents an attacker who owns mainController
		  from draining funds by calling .fundMainController()
		  repeatedly.
	- distributeReward is limited to 10%
		- At most, only 10% of profit can be claimed as a reward.
		  This prevents an admin from setting a value too high
		  and having the rewardee get all profit (instead of
		  the shareholders).
	- once set, token address cannot be changed.
		- This prevents the admin from setting the token to 
		  their own account, in which case they would receive
		  all dividends.
	- once set, comptroller address cannot be changed.
		- This prevents somebody from changing the comptroller
		  to themselves and removing the bankroll
*/
//@createInterface
contract Treasury is 
	UsingMainController,
	UsingAdmin
{
	// Settable once, address that dividends are sent to.
	address public token;
	// Settable once, address that can adjust bankroll.
	address public comptroller;
	// minimum amount before allow distribution
	uint public bankroll;

	uint public dailyFundLimit;
	uint public dayDailyFundLimitChanged;
	uint public dayLastFunded;
	uint public amtFundedToday;

	uint public totalRevenue;		// total revenues received
	uint public totalFunded;		// total funds sent
	uint public totalDistributed;	// total dividends

	// when someone calls distribute, they get a small reward
	// 100 = 1%, 1000 = .1%, etc
	uint public distributeRewardDenom = 1000;

	// prevents a function from being called again before it has completed
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }
	modifier fromComptroller() { require(msg.sender==comptroller); _; }

	// EVENTS
	// admin stuff
	event TokenSet(uint time, address sender, address token);
	event ComptrollerSet(uint time, address sender, address comptroller);
	event BankrollChanged(uint time, uint oldValue, uint newValue);
	event DailyFundLimitChanged(uint time, address sender, uint oldValue, uint newValue);
	event DistributeRewardChanged(uint time, address sender, uint oldValue, uint newValue);
	// non-admin stuff
	event RevenueReceived(uint time, address sender, uint amount);
	event DistributeError(uint time, string msg);
	event DistributeSuccess(uint time, address token, uint amount);
	event DistributeFailure(uint time, address token, uint amount);
	event RewardPaid(uint time, address recipient, string note, uint amount);
	event FundSuccess(uint time, address recipient, string note, uint value);
	event FundFailure(uint time, string reason, address recipient, string note, uint value);
	event RefundReceived(uint time, string note, address sender, uint value);

	function Treasury(address _registry)
		UsingMainController(_registry)
		UsingAdmin(_registry)
	{}

	/**** ADMIN FUNCTIONS *****************************/
	// Callable once to set the Token address
	function initToken(address _token)
		fromAdmin
	{
		require(token == address(0));
		token = _token;
		TokenSet(now, msg.sender, _token);
	}
	// Callable once to set the Comptroller address
	function initComptroller(address _comptroller)
		fromAdmin
	{
		require(comptroller == address(0));
		comptroller = _comptroller;
		ComptrollerSet(now, msg.sender, _comptroller);	
	}
	// Callable once daily to change the dailyFundLimit +/-5%
	function setDailyFundLimit(uint _newValue)
		fromAdmin
	{
		require(today() > dayDailyFundLimitChanged);

		uint _oldValue = dailyFundLimit;
		if (dailyFundLimit > 0) {
			uint _maxValue = (_oldValue * 105)/100;
			uint _minValue = (_oldValue * 95)/100;
			require(_newValue >= _minValue && _newValue <= _maxValue);
		}
		dailyFundLimit = _newValue;
		dayDailyFundLimitChanged = today();
		DailyFundLimitChanged(now, msg.sender, _oldValue, _newValue);
	}
	// Minimum value is 100, meaning maximum reward is 1%
	function setDistributeReward(uint _newValue)
		fromAdmin
	{
		require(_newValue >= 100);
		uint _oldValue = distributeRewardDenom;
		distributeRewardDenom = _newValue;
		DistributeRewardChanged(now, msg.sender, _oldValue, _newValue);
	}
	/******* END ADMIN FUNCTIONS ***************************/


	// Can receive deposits from anyone (eg: PennyAuctions, other games)
	function () payable {
		totalRevenue += msg.value;
		RevenueReceived(now, msg.sender, msg.value);
	}

	// Called by the token once to set the baseline bankroll.
	// Any funds above bankroll can be distributed via distributeToToken()
	function addToBankroll()
		payable
		fromComptroller
	{
		uint _oldValue = bankroll;
		bankroll += msg.value;
		BankrollChanged(now, _oldValue, bankroll);
	}
	function removeFromBankroll(uint _amount)
		fromComptroller
	{
		require(bankroll >= _amount);
		if (this.balance < _amount) _amount = this.balance;
		uint _oldValue = bankroll;
		bankroll -= _amount;
		require(comptroller.call.value(_amount)());
		BankrollChanged(now, _oldValue, bankroll);
	}

	// Sends any surplus balance to token.
	// Pays a small reward to whoever calls this.
	// Not subject to daily limits.
	function distributeToToken()
		returns (bool _success, uint _amount)
	{
		if (this.balance <= bankroll) {
			DistributeError(now, "No profit to distribute.");
			return;
		}
		if (token == address(0)) {
			DistributeError(now, "No address to distribute to.");
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
		totalDistributed += _amount;
		DistributeSuccess(now, token, _amount);

		// try to pay the reward
		require(msg.sender.call.value(_reward)());
		RewardPaid(now, msg.sender, "Called .distrubuteToToken()", _reward);
		return (true, _amount);
	}

	// Gives the MainController funds so it can start games.
	// Will fund at most dailyFundLimit per day.
	// noRentry ensures this is only called once at a time.
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
		totalFunded += _amount;
		amtFundedToday += _amount;
		dayLastFunded = today();
		FundSuccess(now, _mainController, _note, _amount);
		return true;
	}

	// For recieving funds back from mainController.
	// Subtracts from daily limit so it can be funded again.
	function acceptRefund(string _note)
		payable
		fromMainController
	{
		if (msg.value <= amtFundedToday) amtFundedToday -= msg.value;
		RefundReceived(now, _note, msg.sender, msg.value);
	}

  	// if _amount is too large, or would exceed our limit for today, then return false.
  	function canFund(uint _amount) constant returns (bool) {
		if (_amount > this.balance || _amount > dailyFundLimit) return false;
		if (dayLastFunded >= today() && amtFundedToday + _amount > dailyFundLimit) return false;
		return true;
  	}

  	function getAmountToDistribute() constant returns (uint) {
  		if (token == address(0)) return 0;
  		if (this.balance <= bankroll) return 0;
  		return this.balance - bankroll;
  	}

  	function getDistributeReward() constant returns (uint) {
  		return getAmountToDistribute() / distributeRewardDenom;
  	}

  	function today() private constant returns (uint) {
    	return now / 1 days;
  	}

}