pragma solidity ^0.4.19;

import "../interfaces/IRegistry.sol";


/******* USING Registry **************************
Gives the inherting contract access to:
	.addressOf(bytes32): returns current address mapped to the name.
	[modifier] .fromOwner(): requires the sender is owner.
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