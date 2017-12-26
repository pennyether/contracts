pragma solidity ^0.4.19;
interface IPennyAuction {
	function prize() public constant returns(uint);
	function numBids() public constant returns(uint);
	function sendPrize(uint _gasLimit) public returns (bool _success, uint _prizeSent);
	function sendFees() public returns (uint _feesSent);
	function isEnded() public constant returns (bool _bool);
	function isPaid() public constant returns (bool _bool);
	function currentWinner() public constant returns (address _addr);
	function fees() public constant returns (uint _fees);
}