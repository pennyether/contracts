pragma solidity ^0.4.0;

interface _IUthToken {
	function collectDividends() public;
}

contract UnpayableTokenHolder {
	function collectDividends(address token) public {
		_IUthToken(token).collectDividends();
	}
	function () public payable {
		revert();
	}
}