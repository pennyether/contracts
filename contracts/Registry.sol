pragma solidity ^0.4.19;

/*****************************************************
************* PENNYETHER REGISTRY ********************
******************************************************

UI: http://localhost:8080/status/system#registry

Registry allows a permanent owner to map names to addresses.
Anyone can find a mapped address by calling .addressOf(),
which throws if there is no mapping.

Notes:
    - Owner can never be changed.
    - To remove a mapping, register an address to 0.
*/
contract Registry {
    // the permanent owner of the registry
    address public owner;
    // for each name, holds the current address
    mapping (bytes32 => address) addresses;
    event NameRegistered(bytes32 name, address addr);

    function Registry(address _owner)
        public
    {
        owner = _owner;
    }

    // Adds the address to the mapping, so that it can be retrieved later by name.
    // Only the owner can register an address
    function register(bytes32 _name, address _addr)
        public
    {
        require(msg.sender == owner);
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