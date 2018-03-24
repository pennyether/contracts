pragma solidity ^0.4.19;

import "./Ledger.sol";
import "./AddressSet.sol";
import "../roles/UsingTreasury.sol";

/**
  A simple class that manages bankroll, and maintains collateral.
  This class only ever sends profits the Treasury. No exceptions.

  - Anybody can add funding (according to whitelist)
  - Anybody can tell profits (balance - (funding + collateral)) to go to Treasury.
  - Anyone can remove their funding, so long as balance >= collateral.
  - Whitelist is managed by getWhitelistOwner() -- typically Admin.

  Exposes the following:
    Public Methods
     - addBankroll
     - removeBankroll
     - sendProfits
    Public Views
     - getCollateral
     - profits
     - profitsSent
     - profitsTotal
     - bankroll
     - bankrollAvailable
     - bankrolledBy
     - bankrollerTable
*/
contract Bankrollable is
	UsingTreasury
{   
    // How much profits have been sent. 
    uint public profitsSent;
    // Ledger keeps track of who has bankrolled us, and for how much
    Ledger public ledger;
    // This is a copy of ledger.total(), to save gas in .bankrollAvailable()
    uint public bankroll;
    // This is the whitelist of who can call .addBankroll()
    AddressSet public whitelist;

    modifier fromWhitelistOwner(){
        require(msg.sender == getWhitelistOwner());
        _;
    }

    event BankrollAdded(uint time, address indexed bankroller, uint amount, uint bankroll);
    event BankrollRemoved(uint time, address indexed bankroller, uint amount, uint bankroll);
    event ProfitsSent(uint time, address indexed treasury, uint amount);
    event AddedToWhitelist(uint time, address indexed addr, address indexed wlOwner);
    event RemovedFromWhitelist(uint time, address indexed addr, address indexed wlOwner);

    // Constructor creates the ledger and whitelist, with self as owner.
	function Bankrollable(address _registry)
		UsingTreasury(_registry)
		public
	{
        ledger = new Ledger(this);
        whitelist = new AddressSet(this);
    }


    /*****************************************************/
    /************** WHITELIST MGMT ***********************/
    /*****************************************************/    

    function addToWhitelist(address _addr)
        fromWhitelistOwner
        public
    {
        bool _didAdd = whitelist.add(_addr);
        if (_didAdd) AddedToWhitelist(now, _addr, msg.sender);
    }

    function removeFromWhitelist(address _addr)
        fromWhitelistOwner
        public
    {
        bool _didRemove = whitelist.remove(_addr);
        if (_didRemove) RemovedFromWhitelist(now, _addr, msg.sender);
    }

    /*****************************************************/
    /************** PUBLIC FUNCTIONS *********************/
    /*****************************************************/

    // Bankrollable contracts should be payable (to receive revenue)
    function () public payable {}

    // Increase funding by whatever value is sent
    function addBankroll()
        public
        payable 
    {
        require(whitelist.size()==0 || whitelist.has(msg.sender));
        ledger.add(msg.sender, msg.value);
        bankroll = ledger.total();
        BankrollAdded(now, msg.sender, msg.value, bankroll);
    }

	// Removes up to _amount from Ledger, and sends it to msg.sender._callbackFn
    function removeBankroll(uint _amount, string _callbackFn)
        public
        returns (uint _recalled)
    {
        // cap amount at the balance minus collateral, or nothing at all.
        address _bankroller = msg.sender;
        uint _collateral = getCollateral();
        uint _available = this.balance > _collateral ? this.balance - _collateral : 0;
        if (_amount > _available) _amount = _available;

        // Try to remove _amount from ledger, get actual _amount removed.
        _amount = ledger.subtract(_bankroller, _amount);
        bankroll = ledger.total();
        if (_amount == 0) return;

        bytes4 _sig = bytes4(keccak256(_callbackFn));
        require(_bankroller.call.value(_amount)(_sig));
        BankrollRemoved(now, _bankroller, _amount, bankroll);
        return _amount;
    }

    // Send any excess profits to treasury.
    function sendProfits()
        public
        returns (uint _profits)
    {
        _profits = profits();
        if (_profits == 0) return;
        profitsSent += _profits;
        // Send profits to Treasury
        address _tr = getTreasury();
        require(_tr.call.value(_profits)());
        ProfitsSent(now, _tr, _profits);
    }


    /*****************************************************/
    /************** PUBLIC VIEWS *************************/
    /*****************************************************/

    // Function must be overridden by inheritors to ensure collateral is kept.
	function getCollateral()
		public
		view
		returns (uint _amount);

    // Function must be overridden by inheritors to enable whitelist control.
    function getWhitelistOwner()
        public
        view
        returns (address _addr);

    // Profits are anything above bankroll + collateral, or 0.
    function profits()
        public
        view
        returns (uint _profits)
    {
        uint _balance = this.balance;
        uint _threshold = bankroll + getCollateral();
        return _balance > _threshold ? _balance - _threshold : 0;
    }

    function profitsTotal()
        public
        view
        returns (uint _profits)
    {
        return profitsSent + profits();
    }

    // Returns the amount that can currently be bankrolled.
    //   - 0 if balance < collateral
    //   - If profits: full bankroll
    //   - If no profits: remaning bankroll: balance - collateral
    function bankrollAvailable()
        public
        view
        returns (uint _amount)
    {
        uint _balance = this.balance;
        uint _bankroll = bankroll;
        uint _collat = getCollateral();
        // Balance is below collateral!
        if (_balance <= _collat) return 0;
        // No profits, but we have a balance over collateral.
        else if (_balance < _collat + _bankroll) return _balance - _collat;
        // Profits. Return only _bankroll
        else return _bankroll;
    }

    function bankrolledBy(address _addr)
        public
        view
        returns (uint _amount)
    {
        return ledger.balanceOf(_addr);
    }

    function bankrollerTable()
        public
        view
        returns (address[], uint[])
    {
        // Not available until Solidity 0.4.22
        // return ledger.balances();
    }
}