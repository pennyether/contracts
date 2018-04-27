pragma solidity ^0.4.23;

interface _IUthToken {
    function collectDividends() external;
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

    function tokenFallback(address sender, uint amt, bytes data) public returns (bool _success) {
        emit TokenFallback(msg.sender, sender, amt, data);
        return true;
    }

    function () public payable {
        revert();
    }
}