pragma solidity ^0.4.0;
//@dontRegenerate
contract IPennyAuction {
  // public state variables
  function admin() public constant returns(address);
  function collector() public constant returns(address);
  function initialPrize() public constant returns(uint);
  function bidPrice() public constant returns(uint);
  function bidFeePct() public constant returns(uint);
  function bidTimeS() public constant returns(uint);
  function auctionTimeS() public constant returns(uint);
  function state() public constant returns(uint);
  function prize() public constant returns(uint);
  function currentWinner() public constant returns(address);
  function numBids() public constant returns(uint);
  function timeOpened() public constant returns(uint);
  function timeClosed() public constant returns(uint);
  function fees() public constant returns(uint);
  // constants
  function isCloseable() constant returns (bool _bool);
  function isClosed() constant returns (bool _bool);
  function isRedeemed() constant returns (bool _bool);
  function getTimeRemaining() constant returns (uint _timeRemaining);
  
  // non-constants
  function open() payable returns (bool _success);
  function close() returns (bool _success);
  function redeem() returns (bool _success, uint _prizeSent);
  function redeemFees() returns (bool _success, uint _feesSent);
}