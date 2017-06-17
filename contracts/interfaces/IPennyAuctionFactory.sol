pragma solidity ^0.4.0;
//@dontRegenerate
contract IPennyAuctionFactory {
  function createAuction(uint _initialPrize,
	                     uint _bidPrice,
	                     uint _bidTimeS,
	                     uint _bidFeePct,
                         uint _auctionTimeS)
  	returns (bool _success, address _addr);
}