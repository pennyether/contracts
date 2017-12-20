pragma solidity ^0.4.0;
contract IPennyAuction {
  function prize() public constant returns(uint);
  function numBids() public constant returns(uint);
  function payWinner(uint _gasLimit) returns (bool _success, uint _prizeSent);
  function collectFees() returns (bool _success, uint _feesSent);
  function isEnded() constant returns (bool _bool);
  function isPaid() constant returns (bool _bool);
  function fees() constant returns (uint _fees);
}