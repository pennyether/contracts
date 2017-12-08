pragma solidity ^0.4.0;

contract IPennyAuction {
	function bidPrice() returns (uint _bidPrice);
	function payWinner(uint _gasLimit) returns (bool _success, uint _prizeSent);
}

contract UnpayableBidder {
	function doBid(address addr){
		IPennyAuction auction = IPennyAuction(addr);
		uint _bidPrice = auction.bidPrice();
		if (!auction.call.value(_bidPrice)()){
		  	throw;
		}
	}
	function doRedemption(address addr)
		returns (bool _success, uint _prizeSent)
	{
		IPennyAuction auction = IPennyAuction(addr);
		return auction.payWinner(0); 
	}
	function fund() payable {}
	function () payable {
		throw;
	}
}