pragma solidity ^0.4.0;

/**
 * Allows a custodian to control a wallet, and allows
 * Supervisor and Owner accounts to be used once for any
 * action. (This helps enforce that they are "cold" wallets)
 *
 *  - Custodian can:
 *      - make calls on behalf of the wallet
 *  - Supervisor can:
 *      - change the custodian
 *      - collect the balance of the contract
 *      - in both cases, must provide a new supervisor.
 *  - Owner can:
 *      - change the supervisor
 *      - must provide a new owner
 */
contract CustodialWallet {
    address public owner;
    address public supervisor;
    address public custodian;
    modifier fromOwner() { require(msg.sender == owner); _; }
    modifier fromSupervisor() { require(msg.sender == supervisor); _; }
    modifier fromCustodian() { require(msg.sender == custodian); _; }

    event CallSuccess(uint time, address indexed to, string msg);
    event CallFailure(uint time, address indexed to, string msg);
    event CollectSuccess(uint time, address indexed recipient, uint amt);
    event CollectFailure(uint time, address indexed recipient, uint amt);
    event CustodianChanged(uint time, address indexed prevAddr, address indexed newAddr);
    event SupervisorChanged(uint time, address indexed prevAddr, address indexed newAddr);
    event OwnerChanged(uint time, address indexed prevAddr, address indexed newAddr);
    
    function CustodialWallet(address _custodian, address _supervisor, address _owner)
        public
    {
        _setCustodian(_custodian);
        _setSupervisor(_supervisor);
        _setOwner(_owner);
    }
    
    function doCall(address _to, bytes _data, string _msg)
        public
        payable
        fromCustodian
        returns (bool _success)
    {
        if (_to.call.value(msg.value)(_data))
            CallSuccess(now, _to, _msg);
        else
            CallFailure(now, _to, _msg);
    }
    
    // Sends entire balance to _recipient, and changes supervisor
    function collect(address _recipient, address _newSupervisor)
        public
        fromSupervisor
        returns (bool _success)
    {
        _setSupervisor(_newSupervisor);
        uint _amt = this.balance;
        if (_recipient.call.value(this.balance)())
            CollectSuccess(now, _recipient, _amt);
        else
            CollectFailure(now, _recipient, _amt);
    }
    
    // Changes the custodian, as well as the supervisor
    function setCustodian(address _newCustodian, address _newSupervisor)
        public
        fromSupervisor
    {
        _setCustodian(_newCustodian);
        _setSupervisor(_newSupervisor);
    }

    // Changes the supervisor, as well as the owner
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
        custodian = _newCustodian;
        CustodianChanged(now, custodian, _newCustodian);
    }

    function _setSupervisor(address _newSupervisor)
        private
    {
        require(_newSupervisor > 0);
        supervisor = _newSupervisor;
        SupervisorChanged(now, supervisor, _newSupervisor);
    }

    function _setOwner(address _newOwner)
        private
    {
        require(_newOwner > 0);
        owner = _newOwner;
        OwnerChanged(now, owner, _newOwner);
    }

    function () public payable {}
}