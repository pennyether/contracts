pragma solidity ^0.4.19;
interface IPennyAuction {
	function prize() public constant returns(uint);
	function numBids() public constant returns(uint);
	function payWinner(uint _gasLimit) public returns (bool _success, uint _prizeSent);
	function collectFees() public returns (bool _success, uint _feesSent);
	function isEnded() public constant returns (bool _bool);
	function isPaid() public constant returns (bool _bool);
	function fees() public constant returns (uint _fees);
}