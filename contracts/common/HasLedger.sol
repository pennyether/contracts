/**
	This is a simple class that maintains a doubly linked list of
	address => uint amounts. Address balances can be added to 
	or removed from via _addLedgerAmount() and _removeLedgerAmount().
	If an address has a 0 amount, it is removed from the list.

	This exposes only the following internal methods:
	  - _addToLedger(_address, _amt)
	  - _subractFromLedger(_address, _amt)
	  - _getLedgerTotal returns (uint)
	  - _getLedgerMappings() returns (address[], uint[])
	  - _getLedgerEntry returns (uint)

	And one public mapping:
	  - (address => LedgerEntry) ledgerEntries

	For transparency, exposes the whole ledger via ledgerEntries.
	This ensures if a Ledger gets spammed, it is always traversable.
*/
contract HasLedger {
	
	uint private total;		// Total amount in Ledger
	struct LedgerEntry {	// Doubly linked list tracks amount per address
        uint amt;
        address next;
        address prev;
    }
    mapping (address => LedgerEntry) public ledgerEntries;

    function _addToLedger(address _address, uint _amt)
		internal
	{
		if (_amt == 0) return;
		LedgerEntry storage entry = ledgerEntries[_address];

        // If new entry, replace first entry with this one.
        if (entry.amt == 0) {
            entry.next = ledgerEntries[0x0].next;
            ledgerEntries[ledgerEntries[0x0].next].prev = _address;
            ledgerEntries[0x0].next = _address;
        }
        // Update stats.
        total += _amt;
		entry.amt += _amt;
	}

	function _subtractFromLedger(address _address, uint _amt)
		internal
		returns (uint _amtRemoved)
	{
		LedgerEntry storage entry = ledgerEntries[_address];
		uint _maxAmt = entry.amt;
		if (_maxAmt == 0) return;
		
		if (_amt >= _maxAmt) {
			// Subtract the max amount, and delete entry.
			total -= _maxAmt;
			ledgerEntries[entry.prev].next = entry.next;
            ledgerEntries[entry.next].prev = entry.prev;
            delete ledgerEntries[_address];
            return _maxAmt;
		} else {
			// Subtract the amount from entry.
			total -= _amt;
			entry.amt -= _amt;
			return _amt;
		}
	}

	function _getLedger()
		internal
		view
		returns (address[] _addresses, uint[] _amounts)
	{
		// Loop once to get the total count.
        uint _i;
        LedgerEntry memory _curEntry = ledgerEntries[0x0];
        while (_curEntry.next > 0) {
            _curEntry = ledgerEntries[_curEntry.next];
            _i++;
        }

        // Populate names and addresses
        _addresses = new address[](_i);
        _amounts = new uint[](_i);
        _i = 0;
        _curEntry = ledgerEntries[0x0];
        while (_curEntry.next > 0) {
            _addresses[_i] = _curEntry.next;
            _amounts[_i] = ledgerEntries[_curEntry.next].amt;
            _curEntry = ledgerEntries[_curEntry.next];
            _i++;
        }
        return (_addresses, _amounts);
	}

	function _getLedgerTotal()
		internal
		view
		returns (uint _amt)
	{
		return total;
	}
}