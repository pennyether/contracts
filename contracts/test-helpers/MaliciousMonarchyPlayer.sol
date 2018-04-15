pragma solidity ^0.4.0;


/*
  A simple Contract that can bid on a PennyAuction. However,
  when it is gets sent Ether it uses a lot of gas.

  This is used to test that PennyAuctions dont fail even if the
  winner is not payable, and that the winner can claim the prize.
*/
interface _IEpbMonarchy {
    function fee() public constant returns (uint _fee);
    function payWinner(uint _gasLimit) public returns (bool _success, uint _prizeSent);
}
contract MaliciousMonarchyPlayer {
    
    function doOverthrow(address addr) public {
        _IEpbMonarchy game = _IEpbMonarchy(addr);
        uint _fee = game.fee();
        require(game.call.value(_fee)());
    }

    function doRedemption(address addr)
        public
        returns (bool _success, uint _prizeSent)
    {
        _IEpbMonarchy game = _IEpbMonarchy(addr);
        return game.payWinner(0); 
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