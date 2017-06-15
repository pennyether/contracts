pragma solidity ^0.4.0;

contract IPennyAuction {
	function bidPrice() returns (uint _bidPrice);
	function redeem() returns (uint _prizeSent);
}

contract PennyAuctionBidder {
	IPennyAuction public auction;
	bool public didRedeem;
	bool public didFallback;

	function PennyAuctionBidder(address _auctionAddress){
		auction = IPennyAuction(_auctionAddress);
	}
	function doBid(){
		uint _bidPrice = auction.bidPrice();
		if (!auction.call.value(_bidPrice)()){
		  	throw;
		}
	}
	function doRedemption(){
		didFallback = false;
		auction.redeem();
		didRedeem = true;
	}
	function () payable {
		// burn some gas.
		uint bla;
		for (var i=0; i<100; i++){
			bla += i;
		}
		didFallback = true;
	}
}