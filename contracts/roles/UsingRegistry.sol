pragma solidity ^0.4.0;

import "../interfaces/IRegistry.sol";

/**
A base class that when inherited from provides:
	- a fromOwner modifier
	- the ability to get addresses by name
*/
contract UsingRegistry {
	IRegistry private registry;

	event RegistryError(string msg);

	modifier fromOwner(){
		if (msg.sender == getOwner()) _;
		else RegistryError("Only callable by Owner");
	}

	function UsingRegistry(address _registry){
		require(_registry != 0);
		registry = IRegistry(_registry);
	}

	function addressOf(bytes32 _name)
		internal
		constant
		returns(address _addr)
	{
		return registry.addressOf(_name);
	}

	function getOwner()
		constant
		returns (address _addr)
	{
		return registry.addressOf("OWNER");
	}

	function getRegistry()
		constant
		returns (IRegistry _addr)
	{
		return registry;
	}
}