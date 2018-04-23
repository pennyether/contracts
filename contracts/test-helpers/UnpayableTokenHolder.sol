pragma solidity ^0.4.19;

interface _IUthToken {
    function collectDividends() public;
}

/*
  A TokenHolder that tries to collect dividends, but reverts
  when paid. Used to test that DividendToken still works.
*/
contract UnpayableTokenHolder {

    event TokenFallback(address token, address sender, uint amt, bytes data);
    
    function collectDividends(address token) public {
        _IUthToken(token).collectDividends();
    }

    function tokenFallback(address sender, uint amt, bytes data) public {
        TokenFallback(msg.sender, sender, amt, data);
    }

    function () public payable {
        revert();
    }
}