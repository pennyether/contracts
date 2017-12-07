pragma solidity ^0.4.0;
//@dontregenerate
contract IPennyAuctionFactory {
  function createAuction(uint _initialPrize,
	                       uint _bidPrice,
	                       uint _bidAddBlocks,
	                       uint _bidFeePct,
                           uint _initialBlocks) payable returns (address _addr);
}