pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/IPennyAuctionFactory.sol";

contract UsingPennyAuctionFactory is
	UsingRegistry
{
	function UsingPennyAuctionFactory(address _registry)
		UsingRegistry(_registry)
		public
	{}

	modifier fromPennyAuctionFactory(){ 
		require(msg.sender == address(getPennyAuctionFactory()));
		_;
	}

	function getPennyAuctionFactory()
		public
		constant
		returns (IPennyAuctionFactory)
	{
		return IPennyAuctionFactory(addressOf("PENNY_AUCTION_FACTORY"));
	}
}