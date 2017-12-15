pragma solidity ^0.4.0;
contract ITreasury {
  function fundMainController(uint _value, string _note) returns (bool _success);
  function canFund(uint _amount) constant returns (bool);
  function acceptRefund(string _note) payable;
}