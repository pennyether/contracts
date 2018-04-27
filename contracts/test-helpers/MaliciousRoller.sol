pragma solidity ^0.4.23;


/*
  A simple contract to call the InstaDice contract.
  This contract fails to accept payment unless a lot of gas is used.
  This tests cases where InstaDice payment could fail.
*/
interface _IMrInstaDice {
    function roll(uint8 _number) external payable returns (bool);
    function payoutPreviousRoll() external returns (bool);
}
contract MaliciousRoller {
    
    function roll(address _addr, uint8 _number, uint _bet) public {
        _IMrInstaDice _dice = _IMrInstaDice(_addr);
        _dice.roll.value(_bet)(_number);
    }

    function payoutPreviousRoll(address _addr) public {
        _IMrInstaDice _dice = _IMrInstaDice(_addr);
        _dice.payoutPreviousRoll();
    }

    function fund() public payable {}

    function () public payable {
        // burn some gas.
        uint bla;
        for (uint i=0; i<2000; i++){
            bla += i;
        }
    }
}