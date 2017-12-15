pragma solidity ^0.4.11;

/**
	A locker is a simple wallet that collects dividends
	from a DividendToken, and sends those to its owner.

	It cannot interact with the DividendToken in any other
	way, eg, it cannot mint or burn tokens.
*/
contract IDividendToken {
	function collectDividends() public returns (uint _amount);
}
contract DividendTokenLocker {
	address public owner;
	address public token;
	function () payable public {}
    function DividendTokenLocker(address _token, address _owner) public {
		token = _token;
		owner = _owner;
	}
	function collectDividends() public {
		IDividendToken(token).collectDividends();
		require(owner.call.value(this.balance)());
	}
}