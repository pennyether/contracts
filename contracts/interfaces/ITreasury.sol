pragma solidity ^0.4.0;
contract ITreasury {
  function fundMainController(uint _value) returns (bool _success);
  function withdraw(uint _value);
}