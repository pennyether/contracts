pragma solidity ^0.4.0;

import "../Bankrollable.sol";

contract TestBankrollable is Bankrollable {
	uint private collateral;

	function TestBankrollable(address _registry)
		Bankrollable(_registry)
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
		address(0).send(_amount);
	}

	// Receives ether, increasing the balance
	function receive() payable {}

	// Overrides Fundable.getCollateral()
	// Ensures balance remains above collateral.
	function getCollateral()
		public
		view
		returns (uint _amount)
	{
		return collateral;
	}
}