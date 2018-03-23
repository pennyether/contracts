pragma solidity ^0.4.0;

import "../common/Bankrollable.sol";

contract TestBankrollable is Bankrollable {
	address public whitelistOwner;
	uint private collateral;

	function TestBankrollable(address _registry)
		Bankrollable(_registry)
		public
	{ }

	// Sets collateral
	function setCollateral(uint _amount)
		public
	{
		collateral = _amount;
	}

	// Sends ether, lowering the balance
	function removeBalance(uint _amount)
		public
	{
		address(0).transfer(_amount);
	}

	function setWhitelistOwner(address _address)
		public
	{
		whitelistOwner = _address;
	}

	// Receives ether, increasing the balance
	function receive() public payable {}

	// Overrides Fundable.getCollateral()
	// Ensures balance remains above collateral.
	function getCollateral()
		public
		view
		returns (uint _amount)
	{
		return collateral;
	}

	function getWhitelistOwner()
		public
		view
		returns (address _address)
	{
		return whitelistOwner;
	}
}