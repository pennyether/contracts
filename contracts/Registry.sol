pragma solidity ^0.4.19;

/*****************************************************
************* PENNYETHER REGISTRY ********************
******************************************************

UI: http://localhost:8080/status/system#registry

Registry allows a permanent owner to map names to addresses.
Anyone can find a mapped address by calling .addressOf(),
which throws if the name is not registered to an address.

Registry uses a doubly linked list to maintain an interable
list of name => address mappings. When a name is mapped to
the address 0, it is removed from the list.

Registry can return a mapping of all currently registered
names and addresses via .getMappings()

*/
contract Registry {
    // the permanent owner of the registry
    address public owner;

    // Doubly Linked List of NameEntries
    struct Entry {
        address addr;
        bytes32 next;
        bytes32 prev;
    }
    mapping (bytes32 => Entry) public entries;

    // Used to determine if an entry is empty or not.
    address constant NO_ADDRESS = address(0);

    event Registered(uint time, bytes32 name, address addr);
    event Unregistered(uint time, bytes32 name);

    function Registry(address _owner)
        public
    {
        owner = _owner;
    }

    function register(bytes32 _name, address _addr)
        public
    {
        require(msg.sender == owner);
        require(_name != 0 && _addr != 0);
        Entry storage entry = entries[_name];

        // If new entry, replace first one with this one.
        if (entry.addr == NO_ADDRESS) {
            entry.next = entries[0x0].next;
            entries[entries[0x0].next].prev = _name;
            entries[0x0].next = _name;
        }
        // Update the address
        entry.addr = _addr;
        Registered(now, _name, _addr);
    }

    function unregister(bytes32 _name) {
        require(msg.sender == owner);
        require(_name != 0);
        Entry storage entry = entries[_name];

        // Remove entry by stitching together prev and next
        if (entry.addr != NO_ADDRESS) {
            entries[entry.prev].next = entry.next;
            entries[entry.next].prev = entry.prev;
        }
        // Delete the entry
        delete entries[_name];
        Unregistered(now, _name);
    }

    // Retrieves the address for the name of _name.
    function addressOf(bytes32 _name)
        public
        view
        returns (address _addr)
    {
        _addr = entries[_name].addr;
        require(_addr != address(0));
        return _addr;
    }

    // Retrieves the name of _addr, if any
    function getMappings()
        public
        view
        returns (bytes32[] _names, address[] _addresses)
    {
        // Loop once to get the total count.
        uint _i;
        Entry memory _curEntry = entries[0x0];
        while (_curEntry.next > 0) {
            _curEntry = entries[_curEntry.next];
            _i++;
        }

        // Populate names and addresses
        _names = new bytes32[](_i);
        _addresses = new address[](_i);
        _i = 0;
        _curEntry = entries[0x0];
        while (_curEntry.next > 0) {
            _names[_i] = _curEntry.next;
            _addresses[_i] = entries[_curEntry.next].addr;
            _curEntry = entries[_curEntry.next];
            _i++;
        }
        return (_names, _addresses);
    }
}