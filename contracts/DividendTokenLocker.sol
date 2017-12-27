pragma solidity ^0.4.19;

/**
  A contract that can only do one thing:
  	- call ".collectDividends()" on some other contract
  	- send entire balance to an unchangeable "owner"
*/
contract IDividendToken {
	function collectDividends() public returns (uint _amount);
}
contract DividendTokenLocker {
	address public owner;
	address public token;
	
    function DividendTokenLocker(address _token, address _owner)
    	public
    {
		token = _token;
		owner = _owner;
	}

	function () payable public {}

	function collect()
		public
	{
		require(msg.sender == owner);
		IDividendToken(token).collectDividends();
		require(owner.call.value(this.balance)());
	}
}