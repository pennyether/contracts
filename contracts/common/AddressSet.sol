pragma solidity ^0.4.23;

/**
    This is a simple class that maintains a doubly linked list of
    addresses it has seen. Addresses can be added and removed
    from the set, and a full list of addresses can be obtained.

    Methods:
     - [fromOwner] .add()
     - [fromOwner] .remove()
    Views:
     - .size()
     - .has()
     - .addresses()
*/
contract AddressSet {
    
    struct Entry {  // Doubly linked list
        bool exists;
        address next;
        address prev;
    }
    mapping (address => Entry) public entries;

    address public owner;
    modifier fromOwner() { require(msg.sender==owner); _; }

    // Constructor sets the owner.
    constructor(address _owner)
        public
    {
        owner = _owner;
    }


    /******************************************************/
    /*************** OWNER METHODS ************************/
    /******************************************************/

    function add(address _address)
        fromOwner
        public
        returns (bool _didCreate)
    {
        // Do not allow the adding of HEAD.
        if (_address == address(0)) return;
        Entry storage entry = entries[_address];
        // If already exists, do nothing. Otherwise set it.
        if (entry.exists) return;
        else entry.exists = true;

        // Replace first entry with this one.
        // Before: HEAD <-> X <-> Y
        // After: HEAD <-> THIS <-> X <-> Y
        // do: THIS.NEXT = [0].next; [0].next.prev = THIS; [0].next = THIS; THIS.prev = 0;
        Entry storage HEAD = entries[0x0];
        entry.next = HEAD.next;
        entries[HEAD.next].prev = _address;
        HEAD.next = _address;
        return true;
    }

    function remove(address _address)
        fromOwner
        public
        returns (bool _didExist)
    {
        // Do not allow the removal of HEAD.
        if (_address == address(0)) return;
        Entry storage entry = entries[_address];
        // If it doesn't exist already, there is nothing to do.
        if (!entry.exists) return;

        // Stitch together next and prev, delete entry.
        // Before: X <-> THIS <-> Y
        // After: X <-> Y
        // do: THIS.next.prev = this.prev; THIS.prev.next = THIS.next;
        entries[entry.prev].next = entry.next;
        entries[entry.next].prev = entry.prev;
        delete entries[_address];
        return true;
    }


    /******************************************************/
    /*************** PUBLIC VIEWS *************************/
    /******************************************************/

    function size()
        public
        view
        returns (uint _size)
    {
        // Loop once to get the total count.
        Entry memory _curEntry = entries[0x0];
        while (_curEntry.next > 0) {
            _curEntry = entries[_curEntry.next];
            _size++;
        }
        return _size;
    }

    function has(address _address)
        public
        view
        returns (bool _exists)
    {
        return entries[_address].exists;
    }

    function addresses()
        public
        view
        returns (address[] _addresses)
    {
        // Populate names and addresses
        uint _size = size();
        _addresses = new address[](_size);
        // Iterate forward through all entries until the end.
        uint _i = 0;
        Entry memory _curEntry = entries[0x0];
        while (_curEntry.next > 0) {
            _addresses[_i] = _curEntry.next;
            _curEntry = entries[_curEntry.next];
            _i++;
        }
        return _addresses;
    }
}