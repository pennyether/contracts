pragma solidity ^0.4.0;

contract IPennyAuction {
	function bidPrice() returns (uint _bidPrice);
	function redeem() returns (uint _prizeSent);
}

contract PennyAuctionBidder {
	IPennyAuction public auction;

	function PennyAuctionBidder(address _auctionAddress){
		auction = IPennyAuction(_auctionAddress);
	}
	function doBid(){
		uint _bidPrice = auction.bidPrice();
		if (!auction.call.value(_bidPrice)()){
		  	throw;
		}
	}
	function doRedemption(){ auction.redeem(); }
	function fund() payable {}
	function () payable {
		// burn some gas.
		uint bla;
		for (uint i=0; i<2000; i++){
			bla += i;
		}
	}
}