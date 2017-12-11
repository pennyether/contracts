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

	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }

	event FundSuccess(uint time, address recipient, string note, uint value);
	event FundFailure(uint time, string reason, address recipient, string note, uint value);
	event RefundReceived(uint time, string note, address sender, uint value);
	event DailyLimitIncreased(uint time, uint pct);
	event DailyLimitDecreased(uint time, uint pct);
	event Error(uint time, string msg);

	function Treasury(address _registry)
		UsingMainController(_registry)
		UsingAdmin(_registry)
	{}

	function () payable {}

	// can increase at most 5% per day
	function increaseDailyFundLimit(uint _pct)
		fromAdmin
		returns (bool _success)
	{
		uint _today = today();
		if (_today <= dayDailyFundLimitChanged) {
			Error(now, "dailyFundLimit already changed today.");
			return;
		}
		if (_pct > 5) {
			Error(now, "Cannot increase more than 5%.");
			return;
		}
		dailyFundLimit = (dailyFundLimit * (100 + _pct))/100;
		dayDailyFundLimitChanged = today();
		DailyLimitIncreased(now, _pct);
		return true;
	}
	// can decrease at most 5% per day.
	// note: this is not an exact calculation, but it's close enough.
	function decreaseDailyFundLimit(uint _pct)
		fromAdmin
		returns (bool _success)
	{
		uint _today = today();
		if (_today <= dayDailyFundLimitChanged) {
			Error(now, "dailyFundLimit already changed today.");
			return;
		}
		if (_pct > 5) {
			Error(now, "Cannot decrease more than 5%.");
			return;
		}
		dailyFundLimit = (dailyFundLimit * 100)/(100 + _pct);
		dayDailyFundLimitChanged = today();
		DailyLimitDecreased(now, _pct);
		return true;	
	}

	// gives the MainController funds so it can start auctions
	// Will fund at most dailyFundLimit per day.
	// noRentry ensures this is only called once.
	// 
	function fundMainController(uint _value, string _note)
		noRentry
		fromMainController
		returns (bool _success)
	{
		address _mainController = address(getMainController());
		
		// if _value is too large, or would exceed our limit for today, then fail.
		// note: we don't need overflow protection since we will never have more than 2^256 wei
		uint _today = today();
		if ((_value > dailyFundLimit)
			|| (_today <= dayLastFunded && amtFundedToday + _value > dailyFundLimit))
		{
			FundFailure(now, "Transfer would exceed dailyFundLimit.", _mainController, _note, _value);
			return false;
		}
		// ensure we have enough wei to transfer
		if (_value > this.balance) {
			FundFailure(now, "Not enough funds.", _mainController, _note, _value);
			return false;
		}
		// ensure mainController accepts our wei
		if (!_mainController.call.value(_value)()){
			FundFailure(now, "MainController rejected funds.", _mainController, _note, _value);
			return false;
		}
		// increase amtFundedToday and set dayLastFunded to today.
		amtFundedToday += _value;
		dayLastFunded = _today;
		FundSuccess(now, _mainController, _note, _value);
		return true;
	}

	function refund(string _note)
		fromMainController
		payable
	{
		if (msg.value <= amtFundedToday) amtFundedToday -= msg.value;
		RefundReceived(now, _note, msg.sender, msg.value);
	}

	function today() private constant returns (uint) {
    	return now / 1 days;
  	}

}