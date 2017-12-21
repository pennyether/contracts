pragma solidity ^0.4.0;

contract __IPennyAuction {
	function bidPrice() public constant returns (uint _bidPrice);
	function payWinner(uint _gasLimit) public returns (bool _success, uint _prizeSent);
}

contract UnpayableBidder {
	function doBid(address addr)
		public
	{
		__IPennyAuction auction = __IPennyAuction(addr);
		uint _bidPrice = auction.bidPrice();
		require(auction.call.value(_bidPrice)());
	}

	function doRedemption(address addr)
		public
		returns (bool _success, uint _prizeSent)
	{
		__IPennyAuction auction = __IPennyAuction(addr);
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