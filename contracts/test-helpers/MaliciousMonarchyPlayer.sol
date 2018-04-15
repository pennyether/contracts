pragma solidity ^0.4.0;


/*
  A simple Contract that can call a MonarchyGame. However,
  when it is gets sent Ether it uses a lot of gas.

  This is used to test that MonarchyGames can handle OOG attacks.
  Eg, this player cannot be refunded, and cannot be paid out on a win
    using the regular amount of gas.
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