pragma solidity ^0.4.0;

import "./UsingRegistry.sol";

contract UsingAdmin is
	UsingRegistry
{
	function UsingAdmin(address _registry)
		UsingRegistry(_registry)
		public
	{}

	modifier fromAdmin(){
		require(msg.sender == getAdmin());
		_;
	}
	
	function getAdmin()
		public
		constant
		returns (address _addr)
	{
		return addressOf("ADMIN");
	}
}