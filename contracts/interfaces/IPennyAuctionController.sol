pragma solidity ^0.4.0;
//@dontregenerate
contract IPennyAuctionController {
  function editDefinedAuction(uint _index,
                                string _summary,
                                uint _initialPrize,
                                uint _bidPrice,
                                uint _bidAddBlocks,
                                uint _bidFeePct,
                                uint _initialBlocks) returns (bool _success);
  function disableDefinedAuction(uint _index) returns (bool _success);
  function enableDefinedAuction(uint _index) returns (bool _success);
  function startDefinedAuction(uint _index) payable returns (bool _success, address _auction);
  function refreshAuctions() returns (uint _numAuctionsEnded, uint _feesRedeemed);

  function totalFees() public constant returns(uint);
  function totalPrizes() public constant returns(uint);
  function totalBids() public constant returns(uint);
  function numEndedAuctions() public constant returns(uint);
  function endedAuctions(uint _index) public constant returns(address);
  function numDefinedAuctions() public constant returns(uint);
  
  function getNumEndedAuctions() constant returns (uint _numEndedAuctions);
  function getActiveAuctions() constant returns (address[] _addresses);
  function getStartableAuctions() constant returns (uint[] _indexes);
  function getAvailableFees() constant returns (uint _feesAvailable);

  function definedAuctions(uint _index) public constant returns(bool, address, string, uint, uint, uint, uint, uint);
  function getAuction(uint _index) constant returns (address);
  function getInitialPrize(uint _index) constant returns (uint);
  function getIsEnabled(uint _index) constant returns (bool);
  function getIsStartable(uint _index) constant returns (bool);
}