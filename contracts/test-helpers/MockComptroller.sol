pragma solidity ^0.4.23;

/*
  A simple Contract that simulates being a Comptroller.
  Used to test Treasury not sending dividends unless CrowdSale is complete
*/
contract MockComptroller {
    address public treasury;
    address public token;
    bool public wasSaleEnded;

    function setToken(address _addr) public { token = _addr; }
    function setTreasury(address _addr) public { treasury = _addr; }
    function endCrowdSale() public { wasSaleEnded = true; }
}