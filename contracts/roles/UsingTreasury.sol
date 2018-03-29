pragma solidity ^0.4.19;

import "./UsingRegistry.sol";

/******* USING TREASURY **************************

Gives the inherting contract access to:
	.getTreasury(): returns current ITreasury instance
	[modifier] .fromTreasury(): requires the sender is current Treasury

*************************************************/
// Returned by .getTreasury()
contract ITreasury {
	function fundMainController(uint _value, string _note) public returns (bool _success);
	function acceptRefund(string _note) public payable;
	function canFund(uint _amount) public constant returns (bool);
}

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