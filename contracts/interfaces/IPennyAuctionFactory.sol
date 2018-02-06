pragma solidity ^0.4.19;

/******* IPennyAuctionFactory **************************
when contracts inheriting UsingPennyAuctionFactory call
.getPennyAuctionFactory(), they are returned an instace of this.
*/
interface IPennyAuctionFactory {
	function lastCreatedAuction() public constant returns (address _auction);
}