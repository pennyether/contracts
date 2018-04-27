pragma solidity ^0.4.23;

import "../common/Bankrollable.sol";

/*
  A simple class that inherits Bankrollable and allows the collateral
  and balance to be edited. This is used in Bankrollable tests to
  ensure Bankrollable does not send profits / bankroll in some cases.
*/
contract TestBankrollable is Bankrollable {
    address public whitelistOwner;
    uint private collateral;

    constructor(address _registry)
        Bankrollable(_registry)
        public
    { }

    // Sets collateral
    function setCollateral(uint _amount)
        public
    {
        collateral = _amount;
    }

    // Sends ether, lowering the balance
    function removeBalance(uint _amount)
        public
    {
        address(0).transfer(_amount);
    }

    function setWhitelistOwner(address _address)
        public
    {
        whitelistOwner = _address;
    }

    // Receives ether, increasing the balance
    function receive() public payable {}

    // Overrides Fundable.getCollateral()
    // Ensures balance remains above collateral.
    function getCollateral()
        public
        view
        returns (uint _amount)
    {
        return collateral;
    }

    function getWhitelistOwner()
        public
        view
        returns (address _address)
    {
        return whitelistOwner;
    }
}