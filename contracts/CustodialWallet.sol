pragma solidity ^0.4.23;

/*********************************************************
***************** Custodial Wallet ***********************
**********************************************************

UI: https://www.pennyether.com/status/system#wallet

This wallet is intended to be the permanent "owner" for any
important contracts. Instead of changing the owner, one
would change the "custodian" of this wallet. This ensures
ownership of contracts is always recoverable.

Supervisor and Owner accounts are inteded to be cold
wallets, and as such, must be changed any time they are used.
For added security, Supervisor and Owner wallets can be
multi-sig wallets.

- Custodian can:
   - make calls on behalf of the wallet
- Supervisor can:
   - change the custodian
   - collect the balance of the contract
   - in both cases, must provide a new supervisor.
- Owner can:
   - change the supervisor
   - must provide a new owner
   - this account is intended to never be used, and stored super-securely
 */
contract CustodialWallet {
    address public owner;
    address public supervisor;
    address public custodian;
    modifier fromOwner() { require(msg.sender == owner); _; }
    modifier fromSupervisor() { require(msg.sender == supervisor); _; }
    modifier fromCustodian() { require(msg.sender == custodian); _; }

    event Created(uint time);
    event CallSuccess(uint time, address indexed to, string msg);
    event CallFailure(uint time, address indexed to, string msg);
    event CollectSuccess(uint time, address indexed recipient, uint amt);
    event CollectFailure(uint time, address indexed recipient, uint amt);
    event CustodianChanged(uint time, address indexed prevAddr, address indexed newAddr);
    event SupervisorChanged(uint time, address indexed prevAddr, address indexed newAddr);
    event OwnerChanged(uint time, address indexed prevAddr, address indexed newAddr);
    
    constructor(address _custodian, address _supervisor, address _owner)
        public
    {
        _setCustodian(_custodian);
        _setSupervisor(_supervisor);
        _setOwner(_owner);
        emit Created(now);
    }
    
    // Does a call on behalf of this wallet.
    // Only custodian can do this.
    function doCall(address _to, bytes _data, string _msg)
        public
        payable
        fromCustodian
        returns (bool _success)
    {
        if (_to.call.value(msg.value)(_data)){
            emit CallSuccess(now, _to, _msg);
            return true;
        } else {
            emit CallFailure(now, _to, _msg);
            return false;
        }
    }
    
    // Sends entire balance to _recipient, and changes supervisor
    // Only supervisor can call this, and must change supervisor address.
    function collect(address _recipient, address _newSupervisor)
        public
        fromSupervisor
        returns (bool _success)
    {
        _setSupervisor(_newSupervisor);
        require(_recipient != 0);

        uint _amt = address(this).balance;
        if (_recipient.call.value(_amt)()){
            emit CollectSuccess(now, _recipient, _amt);
            return true;
        } else {
            emit CollectFailure(now, _recipient, _amt);
            return false;
        }
    }
    
    // Changes the custodian
    // Only supervisor can call this, and must change supervisor address.
    function setCustodian(address _newCustodian, address _newSupervisor)
        public
        fromSupervisor
    {
        _setCustodian(_newCustodian);
        _setSupervisor(_newSupervisor);
    }

    // Changes the supervisor, as well as the owner
    // Only owner can call this, and must change owner address.
    function setSupervisor(address _newSupervisor, address _newOwner)
        public
        fromOwner
    {
        _setSupervisor(_newSupervisor);
        _setOwner(_newOwner);
    }

    ////////////////////////////////////////////////////////
    ///////////////// PRIVATE SETTERS //////////////////////
    ////////////////////////////////////////////////////////
    function _setCustodian(address _newCustodian)
        private
    {
        require(_newCustodian > 0);
        emit CustodianChanged(now, custodian, _newCustodian);
        custodian = _newCustodian;
    }

    function _setSupervisor(address _newSupervisor)
        private
    {
        require(_newSupervisor > 0);
        emit SupervisorChanged(now, supervisor, _newSupervisor);
        supervisor = _newSupervisor;
    }

    function _setOwner(address _newOwner)
        private
    {
        require(_newOwner > 0);
        emit OwnerChanged(now, owner, _newOwner);
        owner = _newOwner;
    }

    function () public payable {}
}