pragma solidity ^0.4.19;

import "./roles/UsingTreasury.sol";
import "./common/HasLedger.sol";

/**
A simple class that allows anyone to bankroll, and maintains collateral.
  - Anybody can add funding.
  - Anybody can tell profits (balance - funding - collateral) to go to Treasury.
  - Anyone can remove their funding, so long as balance >= collateral.
  - When funding is removed, it is passed to bankroller.getBankrollBack()
*/
contract Bankrollable is
	UsingTreasury,
    HasLedger
{    
    event BankrollAdded(uint time, address indexed bankroller, uint amount, uint bankroll);
    event BankrollRemoved(uint time, address indexed bankroller, uint amount, uint bankroll);
    event ProfitsSent(uint time, address indexed treasury, uint amount);

	function Bankrollable(address _registry)
		UsingTreasury(_registry)
        HasLedger()
		public
	{}


    /*****************************************************/
    /************** PUBLIC FUNCTIONS *********************/
    /*****************************************************/

    // Increase funding by whatever value is sent
    function addBankroll()
        public
        payable 
    {
        _addToLedger(msg.sender, msg.value);
        BankrollAdded(now, msg.sender, msg.value, _getLedgerTotal());
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
        _amount = _subtractFromLedger(_bankroller, _amount);
        if (_amount == 0) return;

        bytes4 _sig = bytes4(keccak256(_callbackFn));
        require(_bankroller.call.value(_amount)(_sig));
        BankrollRemoved(now, _bankroller, _amount, _getLedgerTotal());
        return _amount;
    }

    // Send any excess profits to treasury.
    function sendProfits()
        public
        returns (uint _profits)
    {
        _profits = getProfits();
        if (_profits == 0) return;
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

    // Profits are anything above bankroll + collateral, or 0.
    function getProfits()
        public
        view
        returns (uint _profits)
    {
        uint _balance = this.balance;
        uint _threshold = _getLedgerTotal() + getCollateral();
        return _balance > _threshold ? _balance - _threshold : 0;
    }

    // Returns the amount that can currently be bankrolled.
    //   - 0 if balance < collateral
    //   - If profits: full bankroll
    //   - If no profits: remaning bankroll: balance - collateral
    function getAvailableBankroll()
        public
        view
        returns (uint _amount)
    {
        uint _balance = this.balance;
        uint _bankroll = _getLedgerTotal();
        uint _collat = getCollateral();
        // Balance is below collateral!
        if (_balance <= _collat) return 0;
        // No profits, but we have a balance over collateral.
        else if (_balance < _collat + _bankroll) return _balance - _collat;
        // Profits. Return only _bankroll
        else return _bankroll;
    }

    function getBankrollerTable()
        public
        view
        returns (address[], uint[])
    {
        return _getLedger();
    }

    function bankroll()
        public
        view
        returns (uint _amount)
    {
        return _getLedgerTotal();
    }

    function bankrolled(address _addr)
        public
        view
        returns (uint _amount)
    {
        return ledgerEntries[_addr].amt;
    }
}