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
interface _IMrRocketDice {
    function roll(uint32 _multiple) external payable returns (bool);
    function payoutPreviousRoll() external returns (bool);
}

contract MaliciousRoller {
    function rollInstaDice(address _addr, uint8 _number, uint _bet) public {
        _IMrInstaDice _dice = _IMrInstaDice(_addr);
        _dice.roll.value(_bet)(_number);
    }
    function payoutInstaDice(address _addr) public {
        _IMrInstaDice _dice = _IMrInstaDice(_addr);
        _dice.payoutPreviousRoll();
    }

    function rollRocketDice(address _addr, uint32 _multiple, uint _bet) public {
        _IMrRocketDice _dice = _IMrRocketDice(_addr);
        _dice.roll.value(_bet)(_multiple);
    }
    function payoutRocketDice(address _addr) public {
        _IMrRocketDice _dice = _IMrRocketDice(_addr);
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