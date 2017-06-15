pragma solidity ^0.4.0;
contract IRegistry {
  function register(bytes32 _name, address _addr);
  function addressOf(bytes32 _name) constant returns (address _addr);
}