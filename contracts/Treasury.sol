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
	event TransferSuccess(uint time, address recipient, string note, uint value);
	event TransferError(uint time, string reason, address recipient, string note, uint value);
	event RefundReceived(uint time, string note, uint value);

	function Treasury(address _registry)
		UsingMainController(_registry)
	{

	}

	function () payable { }

	// gives the MainController funds so it can start auctions
	function fundMainController(uint _value, string _note)
		fromMainController
		returns (bool _success)
	{
		address _mainController = address(getMainController());

		if (_value > this.balance) {
			TransferError(now, "Not enough funds.", _mainController, _note, _value);
			return false;
		}
		if (_mainController.call.value(_value)()){
			TransferSuccess(now, _mainController, _note, _value);
			return true;
		} else {
			TransferError(now, "MainController rejected funds.", _mainController, _note, _value);
			return false;
		}
	}

	function refund(string _note)
		fromMainController
		payable
	{
		RefundReceived(now, _note, msg.value);
	}

}