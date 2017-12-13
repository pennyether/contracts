pragma solidity ^0.4.0;

contract __IToken {
	function collectDividends();
}

contract UnpayableTokenHolder {
	function collectDividends(address token){
		__IToken(token).collectDividends();
	}
	function () payable {
		throw;
	}
}