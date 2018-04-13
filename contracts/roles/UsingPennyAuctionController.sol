pragma solidity ^0.4.19;

import "./UsingRegistry.sol";

/******* USING PAC **************************

Gives the inherting contract access to:
    .getPac(): returns current IPac instance
    [modifier] .fromPac(): requires the sender is current Pac.

*************************************************/
// Returned by .getPennyAuctionController()
interface IPennyAuctionController {
    function refreshAuctions() public returns (uint _numAuctionsEnded, uint _feesSent);
    function startDefinedAuction(uint _index) payable public returns (address _auction);
    function getFirstStartableIndex() public view returns (uint _index);
    function getNumEndableAuctions() public constant returns (uint _count);
    function getAvailableFees() public constant returns (uint _feesAvailable);
    function getInitialPrize(uint _index) public constant returns (uint);
    function getIsStartable(uint _index) public constant returns (bool);
}

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