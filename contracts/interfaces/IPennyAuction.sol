pragma solidity ^0.4.0;
contract IPennyAuction {
  function collector() public constant returns(address);
  function initialPrize() public constant returns(uint);
  function bidPrice() public constant returns(uint);
  function bidFeePct() public constant returns(uint);
  function bidAddBlocks() public constant returns(uint);
  function prize() public constant returns(uint);
  function currentWinner() public constant returns(address);
  function lastBidBlock() public constant returns(uint);
  function blockEnded() public constant returns(uint);
  function numBids() public constant returns(uint);
  function fees() public constant returns(uint);
  function isPaid() public constant returns(bool);
  function payWinner(uint _gasLimit) returns (bool _success, uint _prizeSent);
  function collectFees() returns (bool _success, uint _feesSent);
  function isEnded() constant returns (bool _bool);
  function getBlocksRemaining() constant returns (uint _timeRemaining);
}