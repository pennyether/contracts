pragma solidity ^0.4.23;

/*
  A simple Contract that is called by CustodialWallet tests.
*/
contract DumbContract {
    uint public val1;
    uint public val2;

    function setVals(uint _val1, uint _val2)
        public
    {
        val1 = _val1;
        val2 = _val2;
    }

    function sendBalance()
        public
    {
        msg.sender.transfer(address(this).balance);
    }

    function payToSetVal2(uint _val2)
        payable
        public
    {
        val2 = _val2;
    }

    function () payable public {}
}