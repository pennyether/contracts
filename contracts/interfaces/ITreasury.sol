pragma solidity ^0.4.19;
contract ITreasury {
	function fundMainController(uint _value, string _note) public returns (bool _success);
	function acceptRefund(string _note) public payable;
	function canFund(uint _amount) public constant returns (bool);
}