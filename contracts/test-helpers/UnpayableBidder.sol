pragma solidity ^0.4.0;

interface _IUbPennyAuction {
	function bidPrice() public constant returns (uint _bidPrice);
	function payWinner(uint _gasLimit) public returns (bool _success, uint _prizeSent);
}

contract UnpayableBidder {
	function doBid(address addr)
		public
	{
		_IUbPennyAuction auction = _IUbPennyAuction(addr);
		uint _bidPrice = auction.bidPrice();
		require(auction.call.value(_bidPrice)());
	}

	function doRedemption(address addr)
		public
		returns (bool _success, uint _prizeSent)
	{
		_IUbPennyAuction auction = _IUbPennyAuction(addr);
		return auction.payWinner(0); 
	}

	function fund() public payable {}
	
	function ()
		public
		payable
	{
		revert();
	}
}