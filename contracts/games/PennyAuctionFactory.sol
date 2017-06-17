pragma solidity ^0.4.0;
import "./PennyAuction.sol";
import "../roles/UsingPennyAuctionController.sol";
import "../roles/UsingTreasury.sol";

//@createInterface
contract PennyAuctionFactory is
    UsingPennyAuctionController,
    UsingTreasury
{
    event AuctionCreated(
        address addr,
        uint initialPrize,
        uint bidPrice,
        uint bidTimeS,
        uint bidFeePct,
        uint auctionTimeS
    );

    function PennyAuctionFactory(address _registry)
        UsingPennyAuctionController(_registry)
        UsingTreasury(_registry)
    {}

    function createAuction(uint _initialPrize,
	                       uint _bidPrice,
	                       uint _bidTimeS,
	                       uint _bidFeePct,
                           uint _auctionTimeS)
        fromPennyAuctionController
        returns (bool _success, PennyAuction _addr)
    {
        // create an auction
		PennyAuction _auction = new PennyAuction({
            _admin: address(getPennyAuctionController()),
            _collector: address(getTreasury()),
            _initialPrize: _initialPrize,
            _bidPrice: _bidPrice,
            _bidTimeS: _bidTimeS,
            _bidFeePct: _bidFeePct,
            _auctionTimeS: _auctionTimeS
        });

        // Hi. I'm Ethereum.  I'm a fucking retard that can't actually
        // return values in transaction calls.  Instead I make you log
        // an event.
        // The only reason this exists is so unit tests can actually
        // test this contract.
        AuctionCreated({
            addr: _auction,
            initialPrize: _initialPrize,
            bidPrice: _bidPrice,
            bidTimeS: _bidTimeS,
            bidFeePct: _bidFeePct,
            auctionTimeS: _auctionTimeS
        });

        return (true, _auction);
    }
}