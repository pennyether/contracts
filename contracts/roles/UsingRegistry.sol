pragma solidity ^0.4.0;

import "../interfaces/IRegistry.sol";

/**
A base class that when inherited from provides:
	- a fromOwner modifier
	- the ability to get addresses by name
*/
contract UsingRegistry {
	IRegistry private registry;

	modifier fromOwner(){
		require(msg.sender == getOwner());
		_;
	}

	function UsingRegistry(address _registry)
		public
	{
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
		public
		constant
		returns (address _addr)
	{
		return registry.owner();
	}

	function getRegistry()
		public
		constant
		returns (IRegistry _addr)
	{
		return registry;
	}
}