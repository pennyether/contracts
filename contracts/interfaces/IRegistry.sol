pragma solidity ^0.4.19;
interface IRegistry {
	function register(bytes32 _name, address _addr) public;
	function addressOf(bytes32 _name) public constant returns (address _addr);
}