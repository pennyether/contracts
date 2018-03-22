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
	
	struct Entry {	// Doubly linked list
		bool exists;
        address next;
        address prev;
    }
    mapping (address => Entry) public entries;

    address owner;
    modifier fromOwner() { require(msg.sender==owner); _; }

    // Constructor sets the owner.
    function AddressSet(address _owner)
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
	{
		if (_address == address(0)) return;
		Entry storage entry = entries[_address];
		if (entry.exists) return;

        // Replace first entry with this one.
        entry.exists = true;
        entry.next = entries[0x0].next;
        entries[entries[0x0].next].prev = _address;
        entries[0x0].next = _address;
	}

	function remove(address _address)
		fromOwner
		public
	{
		if (_address == address(0)) return;
		Entry storage entry = entries[_address];		
		if (!entry.exists) return;

		// Stitch together next and prev, delete entry.
		entries[entry.prev].next = entry.next;
        entries[entry.next].prev = entry.prev;
        delete entries[_address];
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