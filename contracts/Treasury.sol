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
	event NotEnoughFunds(address requestor, uint value, string msg);

	function Treasury(address _registry)
		UsingMainController(_registry)
	{

	}

	function () payable {}

	// gives the MainController funds so it can start auctions
	function fundMainController(uint _value)
		fromMainController
		returns (bool _success)
	{
		// use unlimited gas in this transfer, in case MainController does stuff
		return getMainController().call.value(_value)();
	}

	// gives funds to owner
	function withdraw(uint _value)
		fromOwner
	{
		_value * 2;
	}

}