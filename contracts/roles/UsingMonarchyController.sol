pragma solidity ^0.4.23;

import "./UsingRegistry.sol";

/******* USING PAC **************************

Gives the inherting contract access to:
    .getMonarchyController(): returns current IMC instance
    [modifier] .fromMonarchyController(): requires the sender is current MC.

*************************************************/
// Returned by .getMonarchyController()
interface IMonarchyController {
    function refreshGames() external returns (uint _numGamesEnded, uint _feesSent);
    function startDefinedGame(uint _index) external payable returns (address _game);
    function getFirstStartableIndex() public view returns (uint _index);
    function getNumEndableGames() public view returns (uint _count);
    function getAvailableFees() public view returns (uint _feesAvailable);
    function getInitialPrize(uint _index) public view returns (uint);
    function getIsStartable(uint _index) public view returns (bool);
}

contract UsingMonarchyController is
    UsingRegistry
{
    constructor(address _registry)
        UsingRegistry(_registry)
        public
    {}

    modifier fromMonarchyController(){
        require(msg.sender == address(getMonarchyController()));
        _;
    }

    function getMonarchyController()
        public
        view
        returns (IMonarchyController)
    {
        return IMonarchyController(addressOf("MONARCHY_CONTROLLER"));
    }
}