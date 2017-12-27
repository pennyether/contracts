pragma solidity ^0.4.19;
import "./PennyAuction.sol";
import "../roles/UsingPennyAuctionController.sol";
import "../roles/UsingTreasury.sol";

contract PennyAuctionFactory is
    UsingPennyAuctionController,
    UsingTreasury
{
    uint constant public version = 1;
    PennyAuction public lastCreatedAuction;

    event AuctionCreated(
        uint time,
        address addr,
        address collector,
        uint initialPrize,
        uint bidPrice,
        int bidIncr,
        uint bidAddBlocks,
        uint initialBlocks
    );

    function PennyAuctionFactory(address _registry)
        UsingPennyAuctionController(_registry)
        UsingTreasury(_registry)
        public
    {}

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

        // create an auction, event, and return.
        // throws if invalid params are passed.
        address _collector = address(getTreasury());
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
}