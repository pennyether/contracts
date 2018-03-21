pragma solidity ^0.4.0;

import "../common/HasLedger.sol";

contract TestLedger is HasLedger {
	function addToLedger(address _address, uint _value) public {
		_addToLedger(_address, _value);
	}

	function subtractFromLedger(address _address, uint _value) public {
		_subtractFromLedger(_address, _value);
	}

	function getLedger() public returns (address[], uint[]) {
		return _getLedger();
	}

	function getLedgerTotal() public returns (uint) {
		return _getLedgerTotal();
	}
}