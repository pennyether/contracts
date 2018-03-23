pragma solidity ^0.4.19;

import "./UsingRegistry.sol";

/******* USING MAINCONTROLLER ******************
Gives the inherting contract access to:
	.getMainController(): returns current IMainController instance
	[modifier] .fromMainController: requires the sender is
	  the MainController.
*/

// Returned by .getMainController()
interface IMainController {}

contract UsingMainController is
	UsingRegistry
{
	function UsingMainController(address _registry)
		UsingRegistry(_registry)
		public
	{}

	modifier fromMainController(){
		require(msg.sender == address(getMainController()));
		_;
	}
	
	function getMainController()
		public
		constant
		returns (IMainController)
	{
		return IMainController(addressOf("MAIN_CONTROLLER"));
	}
}