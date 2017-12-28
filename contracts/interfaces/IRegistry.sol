pragma solidity ^0.4.19;
interface IRegistry {
	function owner() public constant returns (address _addr);
	function addressOf(bytes32 _name) public constant returns (address _addr);
}