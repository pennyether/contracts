pragma solidity ^0.4.19;

/*
Registry allows the owner (whoever created the contract)
to map names to addresses.  Anyone can find a mapped
address by calling addressOf(), which throws if there
is no mapping.

To remove a mapping, the owner can register an address
as 0.
*/
contract Registry {
    // for each name, holds the current address
    mapping (bytes32 => address) addresses;
    event NameRegistered(bytes32 name, address addr);

    modifier fromOwner(){
        require(msg.sender == addresses["OWNER"]);
        _;
    }
    
    function Registry()
        public
    {
        addresses["OWNER"] = msg.sender;
    }

    // Adds the address to the mapping, so that it can be retrieved later by name.
    // Only the owner can register an address
    function register(bytes32 _name, address _addr)
        public
        fromOwner
    {
        addresses[_name] = _addr;
        NameRegistered(_name, _addr);
    }

    // Retrieves the address for the name of _name.
    function addressOf(bytes32 _name)
        public
        constant
        returns (address _addr)
    {
        _addr = addresses[_name];
        require(_addr != 0);
        return _addr;
    }
}