pragma solidity ^0.4.19;

import "./UsingRegistry.sol";

/******* USING PAC **************************

Gives the inherting contract access to:
    .getMonarchyController(): returns current IMC instance
    [modifier] .fromMonarchyController(): requires the sender is current MC.

*************************************************/
// Returned by .getMonarchyController()
interface IMonarchyController {
    function refreshGames() public returns (uint _numGamesEnded, uint _feesSent);
    function startDefinedGame(uint _index) payable public returns (address _game);
    function getFirstStartableIndex() public view returns (uint _index);
    function getNumEndableGames() public constant returns (uint _count);
    function getAvailableFees() public constant returns (uint _feesAvailable);
    function getInitialPrize(uint _index) public constant returns (uint);
    function getIsStartable(uint _index) public constant returns (bool);
}

contract UsingMonarchyController is
    UsingRegistry
{
    function UsingMonarchyController(address _registry)
        UsingRegistry(_registry)
        public
    {}

    modifier fromMonarchyController(){
        require(msg.sender == address(getMonarchyController()));
        _;
    }

    function getMonarchyController()
        public
        constant
        returns (IMonarchyController)
    {
        return IMonarchyController(addressOf("MONARCHY_CONTROLLER"));
    }
}