pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/IMainController.sol";

contract UsingMainController is
	UsingRegistry
{
	function UsingMainController(address _registry) UsingRegistry(_registry){}

	modifier fromMainController(){
		require(msg.sender == address(getMainController()));
		_;
	}
	
	function getMainController()
		constant
		returns (IMainController)
	{
		return IMainController(addressOf("MAIN_CONTROLLER"));
	}
}