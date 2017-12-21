pragma solidity ^0.4.0;

contract __IToken {
	function collectDividends() public;
}

contract UnpayableTokenHolder {
	function collectDividends(address token) public {
		__IToken(token).collectDividends();
	}
	function () public payable {
		revert();
	}
}