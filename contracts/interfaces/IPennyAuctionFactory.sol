pragma solidity ^0.4.19;
interface IPennyAuctionFactory {
	function lastCreatedAuction() public constant returns (address _auction);
}