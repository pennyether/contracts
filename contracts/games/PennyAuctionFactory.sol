pragma solidity ^0.4.19;
import "./PennyAuction.sol";

import "../roles/UsingPennyAuctionController.sol";

/**
The PennyAuctionFactory creates instances of PennyAuctions.
    - It sets _collector to the Registry's value of PennyAuctionController
    - It stores the address of lastCreatedAuction, so that the caller
      has a way to retrieve the value in case they are using a 
      low-level call.
    - It emits an event, this can be used to verify an Auction
      originated from this PennyAuctionFactory.
*/
contract PennyAuctionFactory is
    UsingPennyAuctionController
{
    uint constant public version = 1;
    PennyAuction public lastCreatedAuction;

    event AuctionCreated(
        uint time,
        address indexed addr,
        address collector,
        uint initialPrize,
        uint bidPrice,
        int bidIncr,
        uint bidAddBlocks,
        uint initialBlocks
    );

    function PennyAuctionFactory(address _registry)
        UsingPennyAuctionController(_registry)
        public
    {}

    // create an auction, event, and return.
    function createAuction(
        uint _initialPrize,
        uint _bidPrice,
        int _bidIncr,
        uint _bidAddBlocks,
        uint _initialBlocks
    )
        public
        payable
        fromPennyAuctionController
        returns (PennyAuction _auction)
    {
        require(msg.value == _initialPrize);

        // note: this throws if invalid params are passed.
        address _collector = getCollector();
		_auction = (new PennyAuction).value(_initialPrize)({
            _collector: _collector,
            _initialPrize: _initialPrize,
            _bidPrice: _bidPrice,
            _bidIncr: _bidIncr,
            _bidAddBlocks: _bidAddBlocks,
            _initialBlocks: _initialBlocks
        });
        lastCreatedAuction = _auction;

        AuctionCreated({
            time: now,
            addr: _auction,
            collector: _collector,
            initialPrize: _initialPrize,
            bidPrice: _bidPrice,
            bidAddBlocks: _bidAddBlocks,
            bidIncr: _bidIncr,
            initialBlocks: _initialBlocks
        });

        return _auction;
    }

    // This is useful to assure the contract calling .createAuction()
    //  that it itself is the collector.
    function getCollector() public view returns (address _collector) {
        return getPennyAuctionController();
    }
}