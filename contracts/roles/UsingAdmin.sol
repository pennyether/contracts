pragma solidity ^0.4.0;

import "./UsingRegistry.sol";

contract UsingAdmin is
	UsingRegistry
{
	function UsingAdmin(address _registry) UsingRegistry(_registry){}

	modifier fromAdmin(){
		require(msg.sender == getAdmin());
		_;
	}
	
	function getAdmin()
		constant
		returns (address _addr)
	{
		return addressOf("ADMIN");
	}
}