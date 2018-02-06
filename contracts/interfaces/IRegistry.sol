pragma solidity ^0.4.19;

/******* IRegistry **************************
when contracts inheriting UsingRegistry call
.getRegistry(), they are returned an instace of this.
*/
interface IRegistry {
	function owner() public constant returns (address _addr);
	function addressOf(bytes32 _name) public constant returns (address _addr);
}