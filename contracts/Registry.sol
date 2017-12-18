pragma solidity ^0.4.0;

/**
The registry holds mappings of names to addresses.
It automatically adds a mapping for the creator, as OWNER.
Only the owner can register names.
*/
//@createInterface
contract Registry {
    // for each name, holds the current address
    mapping (bytes32 => address) addresses;
    event NameRegistered(bytes32 name, address addr);

    modifier fromOwner(){
        require(msg.sender == addresses["OWNER"]);
        _;
    }
    
    function Registry(){
        addresses["OWNER"] = msg.sender;
    }

    // Adds the address to the mapping, so that it can be retrieved later by name.
    // Only the owner can register an address
    function register(bytes32 _name, address _addr)
        fromOwner
    {
        addresses[_name] = _addr;
        NameRegistered(_name, _addr);
    }

    // Retrieves the address for the name of _name.
    function addressOf(bytes32 _name)
        constant
        returns (address _addr)
    {
        _addr = addresses[_name];
        require(_addr != 0);
        return _addr;
    }
}