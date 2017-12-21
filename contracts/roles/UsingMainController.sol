pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/IMainController.sol";

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