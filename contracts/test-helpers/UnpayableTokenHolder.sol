pragma solidity ^0.4.0;

interface _IUthToken {
	function collectDividends() public;
}

/*
  A TokenHolder that tries to collect dividends, but reverts
  when paid. Used to test that DividendToken still works.
*/
contract UnpayableTokenHolder {
	function collectDividends(address token) public {
		_IUthToken(token).collectDividends();
	}
	function () public payable {
		revert();
	}
}