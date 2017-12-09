pragma solidity ^0.4.0;

import "./roles/UsingMainController.sol";

/**
The treasury holds all funds, and only dispenses them to trusted sources
under certain conditions.  The trust is established via the registry...
whoever the registry says is the PennyAuctionController can receive funds.

*/
//@createInterface
contract Treasury is 
	UsingMainController
{
	event NotEnoughFunds(uint time, address recipient, uint value);
	event TransferSuccess(uint time, address recipient, uint value);
	event TransferError(uint time, address recipient, uint value);
	event RefundReceived(uint time, uint value);

	function Treasury(address _registry)
		UsingMainController(_registry)
	{

	}

	function () payable { }

	// gives the MainController funds so it can start auctions
	function fundMainController(uint _value)
		fromMainController
		returns (bool _success)
	{
		address _mainController = address(getMainController());

		if (_value > this.balance) {
			NotEnoughFunds(now, _mainController, _value);
			return false;
		}
		if (_mainController.call.value(_value)()){
			TransferSuccess(now, _mainController, _value);
			return true;
		} else {
			TransferError(now, _mainController, _value);
			return false;
		}
	}

	function refund()
		fromMainController
		payable
	{
		RefundReceived(now, msg.value);
	}

}