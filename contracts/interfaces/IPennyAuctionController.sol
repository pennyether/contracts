pragma solidity ^0.4.0;
//@dontregenerate
contract IPennyAuctionController {
  function totalFees() public constant returns(uint);
  function totalPrizes() public constant returns(uint);
  function totalBids() public constant returns(uint);
  function endedAuctions(uint _i) public constant returns(address);
  //cannot return internal structs.
  //function definedAuctions(uint _i) public constant returns(DefinedAuction);
  function editDefinedAuction(uint _index,
                              string _summary,
                              uint _initialPrize,
                              uint _bidPrice,
                              uint _bidTimeS,
                              uint _bidFeePct,
                              uint _auctionTimeS);
  function disableDefinedAuction(uint _index);
  function enableDefinedAuction(uint _index);
  function startDefinedAuction(uint _index) payable returns (bool _success, address _auction);
  function refreshAuctions() returns (uint _numAuctionsEnded, uint _feesRedeemed);
  function getNumEndedAuctions() constant returns (uint _numEndedAuctions);
  function getAvailableFees() constant returns (uint _feesAvailable);
}