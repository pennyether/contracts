pragma solidity ^0.4.19;

import "./UsingRegistry.sol";
import "../interfaces/IPennyAuctionController.sol";


/******* USING PAC **************************
Gives the inherting contract access to:
	.getPac(): returns current IPac instance
	[modifier] .fromPac(): requires the sender is current Pac.
*/
contract UsingPennyAuctionController is
	UsingRegistry
{
	function UsingPennyAuctionController(address _registry)
		UsingRegistry(_registry)
		public
	{}

	modifier fromPennyAuctionController(){
		require(msg.sender == address(getPennyAuctionController()));
		_;
	}

	function getPennyAuctionController()
		public
		constant
		returns (IPennyAuctionController)
	{
		return IPennyAuctionController(addressOf("PENNY_AUCTION_CONTROLLER"));
	}
}