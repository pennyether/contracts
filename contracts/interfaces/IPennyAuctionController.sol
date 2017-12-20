pragma solidity ^0.4.0;
contract IPennyAuctionController {
  function refreshAuctions() returns (uint _numAuctionsEnded, uint _feesCollected);
  function startDefinedAuction(uint _index) payable returns (bool _success, address _auction);
  function numDefinedAuctions() public constant returns(uint);
  function getNumEndedAuctions() constant returns (uint _numEndedAuctions);
  function getAvailableFees() constant returns (uint _feesAvailable);
  function getInitialPrize(uint _index) constant returns (uint);
  function getIsStartable(uint _index) constant returns (bool);
}