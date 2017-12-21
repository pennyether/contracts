pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/ITreasury.sol";

contract UsingTreasury is
	UsingRegistry
{
	function UsingTreasury(address _registry)
		UsingRegistry(_registry)
		public
	{}

	modifier fromTreasury(){
		require(msg.sender == address(getTreasury()));
		_;
	}
	
	function getTreasury()
		public
		constant
		returns (ITreasury)
	{
		return ITreasury(addressOf("TREASURY"));
	}
}