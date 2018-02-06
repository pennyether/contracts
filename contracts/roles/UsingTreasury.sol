pragma solidity ^0.4.19;

import "./UsingRegistry.sol";
import "../interfaces/ITreasury.sol";


/******* USING TREASURY **************************
Gives the inherting contract access to:
	.getTreasury(): returns current ITreasury instance
	[modifier] .fromTreasury(): requires the sender is current Treasury
*/
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