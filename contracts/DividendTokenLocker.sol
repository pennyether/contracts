pragma solidity ^0.4.19;

/*********************************************************
*************** DIVIDEND TOKEN LOCKER ********************
**********************************************************

This contract holds a balance of tokens. Those tokens
cannot be transferred or burned.

Locker does only one thing, via the owner calling .collect():
  	- call ".collectDividends()" on the DividendToken
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