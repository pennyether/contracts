pragma solidity ^0.4.0;

contract __IPennyAuction {
	function bidPrice() returns (uint _bidPrice);
	function payWinner(uint _gasLimit) returns (bool _success, uint _prizeSent);
}

contract UnpayableBidder {
	function doBid(address addr){
		__IPennyAuction auction = __IPennyAuction(addr);
		uint _bidPrice = auction.bidPrice();
		if (!auction.call.value(_bidPrice)()){
		  	throw;
		}
	}
	function doRedemption(address addr)
		returns (bool _success, uint _prizeSent)
	{
		__IPennyAuction auction = __IPennyAuction(addr);
		return auction.payWinner(0); 
	}
	function fund() payable {}
	function () payable {
		throw;
	}
}