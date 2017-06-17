pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/ITreasury.sol";

contract UsingTreasury is
	UsingRegistry
{
	function UsingTreasury(address _registry) UsingRegistry(_registry){}

	modifier fromTreasury(){
		if (msg.sender == address(getTreasury())) _;
		else RegistryError("Only callable by Treasury");
	}
	
	function getTreasury()
		constant
		returns (ITreasury)
	{
		return ITreasury(addressOf("TREASURY"));
	}
}