pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/IPennyAuctionFactory.sol";

contract UsingPennyAuctionFactory is
	UsingRegistry
{
	function UsingPennyAuctionFactory(address _registry) UsingRegistry(_registry){}

	modifier fromPennyAuctionFactory(){ 
		if (msg.sender == address(getPennyAuctionFactory())) _;
		else RegistryError("Only callable by PennyAuctionFactory");
	}

	function getPennyAuctionFactory()
		constant
		returns (IPennyAuctionFactory)
	{
		return IPennyAuctionFactory(addressOf("PENNY_AUCTION_FACTORY"));
	}
}