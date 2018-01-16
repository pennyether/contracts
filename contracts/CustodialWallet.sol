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
    
    function CustodialWallet(address _custodian, address _supervisor, address _owner)
        public
    {
        custodian = _custodian;
        supervisor = _supervisor;
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
    
    function collect(address _to, address _newSupervisor)
        public
        fromSupervisor
        returns (bool _success)
    {
        require(_newSupervisor != 0);
        supervisor = _newSupervisor;
        return _to.call.value(this.balance)();
    }
    
    // Whenever this is called, the supervisor must change as well.
    // This enforces that the wallet of owner is always cold.
    function setCustodian(address _newCustodian, address _newSupervisor)
        public
        fromSupervisor
    {
        require(_newSupervisor != 0);
        custodian = _newCustodian;
        supervisor = _newSupervisor;
    }

    // Callable by owner in case supervisor can not be used.
    function setSupervisor(address _newSupervisor, address _newOwner)
        public
        fromOwner
    {
        require(_newOwner != 0);
        require(_newSupervisor != 0);
        supervisor = _newSupervisor;
        owner = _newOwner;
    }

    function () public payable {}
}