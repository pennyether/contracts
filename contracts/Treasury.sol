pragma solidity ^0.4.19;

/*****************************************************
******************** IMPORTS *************************
*****************************************************/

import "./roles/UsingMainController.sol";
import "./roles/UsingAdmin.sol";




/*****************************************************
************* PENNYETHER TREASURY ********************
******************************************************

UI: https://www.pennyether.com/status/treasury

The Treasury:
	- Hold the TokenHolder's bankroll.
	- Collects revenue
	- Pays profits to the Token
	- Funds MainController a limited amount per day.

It transfers out ONLY in these conditions:
	- To Token
		- When: balance > dividendThreshold
		- Amount: the profits, anything over: dividendThreshold
			- value is: bankroll + 30*dailyFundLimit
	- To Comptroller
		- When: When comptroller lowers the bankroll due
		        to an investor burning tokens.
		- Amount: The amount of bankroll removed
	- To registry.getMainController()
		- When: Whenever MainController requests funds.
		- Amount: limited by dailyFundLimit per day.
		          Note: dailyFundLimit can not be changed
		            by more than 5% per day.
	- Other
		ONLY IF the CrowdSale is unsuccessful, Comptroller
		can send funds to whomever it chooses.

To safeguard the bankroll, there is a buffer of 14 days
of funding between the bankroll and paying out profits.
That is, Treasury will only pay profits if the balance
exceeds the bankroll by 14 days of funding.

To incentivize a steady flow of dividends, anybody can 
call .distributeToToken() and receive a small percentage
of the dividends as a reward.  The reward is set
by the admin, and limited to at most 1%.

Roles:
	Owner:
		- can set Comptroller and Token addresses, once.
	Comptroller:
		- can add and remove bankroll. In practice, will
		  only add Bankroll after ICO, and remove when
		  a Token Holder burns their tokens.
		- can drain the entire Treasury. THIS CAN ONLY
		  BE CALLED IF THE CROWDSALE IS UNSUCCESSFUL.
	Token:
		- receives profits via .distributeToToken()
	MainController:
		- can request funding via .fundMainController(),
		  up to dailyFundLimit per day.
	Admin:
		- can set dailyFundLimit, once
		- can change dailyFundLimit +/- 5% per day
		- can set the distributeReward, up to 1%
	Anybody:
		- can call .distributeToToken() for a reward
*/
contract Treasury is 
	UsingMainController,
	UsingAdmin
{
	// Settable once (by owner), address that dividends are sent to.
	address public token;
	// Settable once (by owner), address that can adjust bankroll.
	address public comptroller;
	// Amount of Ether bankrolled by Token Holders
	uint public bankroll;
	
	// Daily fund limit stuff
	uint public dailyFundLimit;	 // settable once, can be changed +/-5%
	uint public dayDailyFundLimitChanged;	// date last changed
	uint public dayLastFunded;				// date last funded
	uint public amtFundedToday;				// amt funded today
	// Number of days of dailyFundLimit required
	//  before profits can be sent to the token.
	uint public constant bufferDays = 30;

	// When someone calls distribute, they get a small reward
	//  100 = 1%, 1000 = .1%, etc
	uint public distributeRewardDenom = 1000;

	// Stats
	uint public totalRevenue;			// total revenues received
	uint public totalFunded;			// total funds sent
	uint public totalRewarded;			// total rewards paid
	uint public totalDistributed;		// total dividends
	uint[] public distributionDates;
	uint[] public distributionAmounts;

	// for functions only callable by Comptroller
	modifier fromComptroller() { require(msg.sender==comptroller); _; }

	// EVENTS
	// admin/owner triggered events
	event TokenSet(uint time, address sender, address token);
	event ComptrollerSet(uint time, address sender, address comptroller);
	event BankrollChanged(uint time, uint oldValue, uint newValue);
	event DailyFundLimitChanged(uint time, address sender, uint oldValue, uint newValue);
	event DistributeRewardChanged(uint time, address sender, uint oldValue, uint newValue);
	// non-admin stuff
	event RevenueReceived(uint time, address indexed sender, uint amount);
	event DistributeError(uint time, string msg);
	event DistributeSuccess(uint time, address token, uint amount);
	event DistributeFailure(uint time, address token, uint amount);
	event RewardPaid(uint time, address indexed recipient, string note, uint amount);
	event FundSuccess(uint time, address indexed recipient, string note, uint value);
	event FundFailure(uint time, string reason, address indexed recipient, string note, uint value);
	event RefundReceived(uint time, string note, address indexed sender, uint value);

	// UsingMainController and UsingAdmin use the Registry to provide:
	// - getMainController(), getAdmin()
	// - modifiers: fromMainController(), fromAdmin()
	function Treasury(address _registry)
		UsingMainController(_registry)
		UsingAdmin(_registry)
		public
	{}


	/*************************************************************/
	/*************** OWNER FUNCTIONS *****************************/
	/*************************************************************/
	// Callable once to set the Token address
	function initToken(address _token)
		public
		fromOwner
	{
		require(token == address(0));
		token = _token;
		TokenSet(now, msg.sender, _token);
	}

	// Callable once to set the Comptroller address
	function initComptroller(address _comptroller)
		public
		fromOwner
	{
		require(comptroller == address(0));
		comptroller = _comptroller;
		ComptrollerSet(now, msg.sender, _comptroller);	
	}
	

	/*************************************************************/
	/*************** ADMIN FUNCTIONS *****************************/
	/*************************************************************/
	// Callable once daily to change the dailyFundLimit by up to 5%.
	function setDailyFundLimit(uint _newValue)
		public
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
	// Sets reward for calling .distributeToToken.
	// Maximum of 1% (minimum denom of 100)
	function setDistributeReward(uint _newValue)
		public
		fromAdmin
	{
		require(_newValue >= 100);
		require(_newValue <= 10000);
		uint _oldValue = distributeRewardDenom;
		distributeRewardDenom = _newValue;
		DistributeRewardChanged(now, msg.sender, _oldValue, _newValue);
	}


	/*************************************************************/
	/******* COMPTROLLER FUNCTIONS *******************************/
	/*************************************************************/
	// Called by the Comptroller after ICO
	function addToBankroll()
		public
		payable
		fromComptroller
	{
		uint _oldValue = bankroll;
		bankroll += msg.value;
		BankrollChanged(now, _oldValue, bankroll);
	}

	// Comptroller calls this when somebody burns their tokens.
	// This sends the bankroll to the user.
	function removeFromBankroll(uint _amount, address _recipient)
		public
		fromComptroller
	{
		require(bankroll >= _amount);
		require(this.balance >= _amount);
		uint _oldValue = bankroll;
		bankroll -= _amount;
		require(_recipient.call.value(_amount)());
		BankrollChanged(now, _oldValue, bankroll);
	}

	// Comptroller can call this ONLY IF SoftCap is not met.
	// see: Comptroller.sol for more details.
	function drain(address _recipient)
		public
		fromComptroller
	{
		require(_recipient.call.value(this.balance)());
	}


	/*************************************************************/
	/******* DEPOSTING, FUNDING, DISTRIBUTING ********************/
	/*************************************************************/
	// Can receive deposits from anyone (eg: PennyAuctions, other games)
	function () public payable {
		totalRevenue += msg.value;
		RevenueReceived(now, msg.sender, msg.value);
	}

	// Sends any surplus balance to the token, and a reward to the caller.
	function distributeToToken()
		public
		returns (bool _success, uint _amount)
	{
		if (token == address(0)) {
			DistributeError(now, "No address to distribute to.");
			return;
		}
		uint _surplus = getAmountToDistribute();
		if (_surplus <= 0) {
			DistributeError(now, "No profit to distribute.");
			return;
		}

		// calculate _reward and _amount
		uint _reward = _surplus / distributeRewardDenom;
		_amount = _surplus - _reward;
		// this should never happen, but it's possible the
		// Token is bad (eg, it rejects payment or throws)
		if (!token.call.value(_amount)()) {
			DistributeFailure(now, token, _amount);
			return (false, 0);
		}
		totalDistributed += _amount;
		distributionDates.push(now);
		distributionAmounts.push(_amount);
		DistributeSuccess(now, token, _amount);

		// try to pay the reward
		totalRewarded += _reward;
		require(msg.sender.call.value(_reward)());
		RewardPaid(now, msg.sender, "Called .distrubuteToToken()", _reward);
		return (true, _amount);
	}

	// Gives the MainController funds so it can start games.
	// Will fund at most dailyFundLimit per day.
	function fundMainController(uint _amount, string _note)
		public
		fromMainController
		returns (bool _success)
	{
		address _mainController = address(getMainController());
		
		// ensure we can fund
		if (!canFund(_amount)) {
			FundFailure(now, "Cannot fund.", _mainController, _note, _amount);
			return false;
		}
		// increase/reset amtFundedToday and set dayLastFunded to today.
		if (today() > dayLastFunded) amtFundedToday = 0;
		amtFundedToday += _amount;
		dayLastFunded = today();
		totalFunded += _amount;
		// send the wei, log, return
		require(_mainController.call.value(_amount)());
		FundSuccess(now, _mainController, _note, _amount);
		return true;
	}

	// For recieving funds back from mainController in case
	// it was not able to use those funds, for some reason.
	// Subtracts from daily limit so it can be funded again.
	function acceptRefund(string _note)
		public
		payable
		fromMainController
	{
		if (msg.value > amtFundedToday) amtFundedToday = 0;
		else amtFundedToday -= msg.value;
		totalFunded -= msg.value;
		RefundReceived(now, _note, msg.sender, msg.value);
	}


	/*************************************************************/
	/*************** CONSTANTS ***********************************/
	/*************************************************************/
  	// if _amount is too large, or would exceed our limit for today, then return false.
  	function canFund(uint _amount)
  		public
  		constant
  		returns (bool)
  	{
		if (_amount > this.balance || _amount > dailyFundLimit) return false;
		if (dayLastFunded >= today() && amtFundedToday + _amount > dailyFundLimit) return false;
		return true;
  	}

  	// returns 0 unless balance > bankroll + 14*dailyFundLimit
  	function getAmountToDistribute()
  		public
  		constant
  		returns (uint)
  	{
  		if (token == address(0)) return 0;
  		uint _minBalance = getDividendThreshold();
  		if (this.balance <= _minBalance) return 0;
  		return this.balance - _minBalance;
  	}

  	// returns the bankroll plus a buffer of 14 days of funding.
  	function getDividendThreshold()
  		public
  		constant
  		returns (uint)
  	{
  		return bankroll + (bufferDays * dailyFundLimit);
  	}

  	// returns reward to be received if getDistributeReward() is called
  	function getDistributeReward()
  		public
  		constant
  		returns (uint)
  	{
  		return getAmountToDistribute() / distributeRewardDenom;
  	}

  	// returns number of distributions
  	function getNumDistributions()
  		public
  		constant
  		returns (uint)
  	{
  		return distributionDates.length;
  	}

  	// stats of distributions paid between _startDate and _endDate, inclusive
  	// This is not really necessary, but saves you from having to do your
  	// own iteration over distritbutionDates
  	function getDistributionStats(uint _startDate, uint _endDate)
  		public
  		constant
  		returns (uint _count, uint _total)
  	{
  		if (distributionDates.length == 0) return;
  		if (_endDate == 0) _endDate = now;
  		uint _startIndex = findDistIndexFor(_startDate, true);
  		uint _endIndex = findDistIndexFor(_endDate, false);
  		if (_endIndex == distributionDates.length - 2) _endIndex += 1;
  		for (uint _i = _startIndex; _i <= _endIndex; _i++) {
  			if (distributionDates[_i] < _startDate) continue;
  			if (distributionDates[_i] > _endDate) continue;
  			_count++;
  			_total += distributionAmounts[_i];
  		}
  	}

  	// finds a distribution date that is on or before the date given.
  	// tie's are broken via the `_first` param
	// may return one index too little in case the answer is the last.
	// may return one index too much in case answer is the first.
  	function findDistIndexFor(uint _date, bool _first)
  		private
  		constant
  		returns (uint _index)
  	{
  		uint _front = 0;
  		uint _back = distributionDates.length-1;
  		uint _mid = (_back + _front)/2;
  		do {
			if (	_first && distributionDates[_mid] < _date
				|| !_first && distributionDates[_mid] <= _date){
				_front = _mid;
			}
			else { _back = _mid; }	
  			_mid = (_back + _front)/2;
  		} while (_mid != _front);
  		return _mid;
  	}

  	function today()
  		private 
  		constant 
  		returns (uint)
  	{
    	return now / 1 days;
  	}
}