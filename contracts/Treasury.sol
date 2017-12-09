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
		// use unlimited gas in this transfer, in case MainController does stuff
		return doTransfer(address(getMainController()), _value);
	}

	function refund()
		fromMainController
		payable
	{
		RefundReceived(now, msg.value);
	}

	function doTransfer(address _address, uint _value)
		private
		returns (bool _success)
	{

		if (_value > this.balance) {
			NotEnoughFunds(now, _address, _value);
			return false;
		}
		if (_address.call.value(_value)()){
			TransferSuccess(now, _address, _value);
			return true;
		} else {
			TransferError(now, _address, _value);
			return false;
		}
	}

}