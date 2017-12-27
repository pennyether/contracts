pragma solidity ^0.4.0;

/**
 * Allows a custodian to control a wallet.
 *  - owner is intended to be a cold wallet.
 *  - custodian can be revoked / changed by owner.
 *  - when custodian is changed, owner must be changed
 */
contract CustodialWallet {
    address public owner;
    address public custodian;
    modifier fromOwner() { require(msg.sender == owner); _; }
    modifier fromCustodian{ require(msg.sender == custodian); _; }
    
    function CustodialWallet(address _custodian, address _owner)
        public
    {
        custodian = _custodian;
        owner = _owner;
    }
    
    function doCall(address _to, bytes _data)
        public
        payable
        fromCustodian
        returns (bool _success)
    {
        return _to.call.value(msg.value)(_data);
    }
    
    function collect(address _to)
        public
        fromCustodian
        returns (bool _success)
    {
        return _to.call.value(this.balance)();
    }
    
    // Whenever this is called, the owner must change as well.
    // This enforces that the wallet of owner is always cold.
    function setCustodian(address _newCustodian, address _newOwner)
        public
        fromOwner
    {
        require(_newOwner != 0);
        custodian = _newCustodian;
        owner = _newOwner;
    }

    function () public payable {}
}