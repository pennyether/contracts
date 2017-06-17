pragma solidity ^0.4.0;

import "./UsingRegistry.sol";

contract UsingAdmin is
	UsingRegistry
{
	function UsingAdmin(address _registry) UsingRegistry(_registry){}

	modifier fromAdmin(){
		if (msg.sender == getAdmin()) _;
		else RegistryError("Only callable by Admin");
	}
	
	function getAdmin()
		constant
		returns (address _addr)
	{
		return addressOf("ADMIN");
	}
}