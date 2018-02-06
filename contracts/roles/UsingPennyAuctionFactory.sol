pragma solidity ^0.4.19;

import "./UsingRegistry.sol";
import "../interfaces/IPennyAuctionFactory.sol";


/******* USING PAC **************************
Gives the inherting contract access to:
	.getPaf(): returns current IPaf instance
	[modifier] .fromPaf(): requires the sender is current Paf.
*/
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