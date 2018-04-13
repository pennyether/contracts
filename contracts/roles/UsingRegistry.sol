pragma solidity ^0.4.19;

/******* USING Registry **************************

Gives the inherting contract access to:
    .addressOf(bytes32): returns current address mapped to the name.
    [modifier] .fromOwner(): requires the sender is owner.

*************************************************/
// Returned by .getRegistry()
interface IRegistry {
    function owner() public constant returns (address _addr);
    function addressOf(bytes32 _name) public constant returns (address _addr);
}

contract UsingRegistry {
    IRegistry private registry;

    modifier fromOwner(){
        require(msg.sender == getOwner());
        _;
    }

    function UsingRegistry(address _registry)
        public
    {
        require(_registry != 0);
        registry = IRegistry(_registry);
    }

    function addressOf(bytes32 _name)
        internal
        constant
        returns(address _addr)
    {
        return registry.addressOf(_name);
    }

    function getOwner()
        public
        constant
        returns (address _addr)
    {
        return registry.owner();
    }

    function getRegistry()
        public
        constant
        returns (IRegistry _addr)
    {
        return registry;
    }
}