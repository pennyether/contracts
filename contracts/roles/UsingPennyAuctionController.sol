pragma solidity ^0.4.0;

import "./UsingRegistry.sol";
import "../interfaces/IPennyAuctionController.sol";

contract UsingPennyAuctionController is
	UsingRegistry
{
	function UsingPennyAuctionController(address _registry) UsingRegistry(_registry){}

	modifier fromPennyAuctionController(){
		if (msg.sender == address(getPennyAuctionController())) _;
		else RegistryError("Only callable by PennyAuctionController");
	}

	function getPennyAuctionController()
		constant
		returns (IPennyAuctionController)
	{
		return IPennyAuctionController(addressOf("PENNY_AUCTION_CONTROLLER"));
	}
}