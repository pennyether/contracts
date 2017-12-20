pragma solidity ^0.4.0;
contract IPennyAuctionFactory {
  function createAuction(uint _initialPrize,
	                     uint _bidPrice,
	                     uint _bidFeePct,
	                     uint _bidAddBlocks,
                         uint _initialBlocks) payable returns (address _addr);
  function lastCreatedAuction() constant returns (address _auction);
}