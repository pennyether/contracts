pragma solidity ^0.4.0;
contract ITreasury {
  function fundMainController(uint _value, string _note) returns (bool _success);
  function withdraw(uint _value);
  function refund(string _note) payable;
}