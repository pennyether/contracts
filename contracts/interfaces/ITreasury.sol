pragma solidity ^0.4.19;

/******* ITreasury **************************
when contracts inheriting UsingTreasury call
.getTreasury(), they are returned an instace of this.
*/
contract ITreasury {
	function fundMainController(uint _value, string _note) public returns (bool _success);
	function acceptRefund(string _note) public payable;
	function canFund(uint _amount) public constant returns (bool);
}