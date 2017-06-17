pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/IMainController.sol";

contract UsingMainController is
	UsingRegistry
{
	function UsingMainController(address _registry) UsingRegistry(_registry){}

	modifier fromMainController(){
		if (msg.sender == address(getMainController())) _;
		else RegistryError("Only callable by MainController");
	}
	
	function getMainController()
		constant
		returns (IMainController)
	{
		return IMainController(addressOf("MAIN_CONTROLLER"));
	}
}