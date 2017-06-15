pragma solidity ^0.4.0;
//@dontRegenerate
contract IPennyAuctionController {
  function totalFees() public constant returns(uint);
  function totalPrizes() public constant returns(uint);
  function totalBids() public constant returns(uint);
  function maxOpenAuctions() public constant returns(uint);
  function maxInitialPrize() public constant returns(uint);
  function openAuctions(uint _i) public constant returns(address);
  function closedAuctions(uint _i) public constant returns(address);
  function setSettings(uint _maxOpenAuctions, uint _maxInitialPrize) returns (bool);
  function startNewAuction(uint _initialPrize,
	    					 uint _bidPrice,
	    					 uint _bidTimeS,
	    					 uint _bidFeePct,
        				 uint _auctionTimeS) payable returns (address _addr);
  function checkOpenAuctions();
}