pragma solidity ^0.4.23;

import "./UsingRegistry.sol";

/******* USING PAC **************************

Gives the inherting contract access to:
    .getPaf(): returns current IPaf instance
    [modifier] .fromPaf(): requires the sender is current Paf.

*************************************************/
// Returned by .getMonarchyFactory()
interface IMonarchyFactory {
    function lastCreatedGame() external view returns (address _game);
    function getCollector() external view returns (address _collector);
}

contract UsingMonarchyFactory is
    UsingRegistry
{
    constructor(address _registry)
        UsingRegistry(_registry)
        public
    {}

    modifier fromMonarchyFactory(){ 
        require(msg.sender == address(getMonarchyFactory()));
        _;
    }

    function getMonarchyFactory()
        public
        view
        returns (IMonarchyFactory)
    {
        return IMonarchyFactory(addressOf("MONARCHY_FACTORY"));
    }
}