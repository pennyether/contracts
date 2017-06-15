pragma solidity ^0.4.0;
//@dontRegenerate
contract IPennyAuction {
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
  function open() payable;
  function close();
  function redeem() returns (uint _prizeSent);
  function redeemFees() returns (uint _feesSent);
  function isCloseable() constant returns (bool _bool);
  function isClosed() constant returns (bool _bool);
  function isClosedOrRedeemed() constant returns (bool _bool);
  function getTimeRemaining() constant returns (uint _timeRemaining);
}