pragma solidity ^0.4.0;
//@dontregenerate
contract IPennyAuctionFactory {
  function createAuction(uint _initialPrize,
	                       uint _bidPrice,
	                       uint _bidTimeS,
	                       uint _bidFeePct,
                           uint _auctionTimeS) payable returns (address _addr);
}