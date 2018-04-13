pragma solidity ^0.4.19;

import "./UsingRegistry.sol";

/******* USING PAC **************************

Gives the inherting contract access to:
    .getPaf(): returns current IPaf instance
    [modifier] .fromPaf(): requires the sender is current Paf.

*************************************************/
// Returned by .getPennyAuctionFactory()
interface IPennyAuctionFactory {
    function lastCreatedAuction() public view returns (address _auction);
    function getCollector() public view returns (address _collector);
}

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
        view
        returns (IPennyAuctionFactory)
    {
        return IPennyAuctionFactory(addressOf("PENNY_AUCTION_FACTORY"));
    }
}