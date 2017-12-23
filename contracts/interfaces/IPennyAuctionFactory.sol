pragma solidity ^0.4.19;
interface IPennyAuctionFactory {
	// function createAuction(
	// 	uint _initialPrize,
	// 	uint _bidPrice,
	// 	uint _bidFeePct,
	// 	uint _bidAddBlocks,
	// 	uint _initialBlocks
	// ) public payable returns (address _addr);
	function lastCreatedAuction() public constant returns (address _auction);
}