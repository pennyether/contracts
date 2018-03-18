pragma solidity ^0.4.19;

import "./roles/UsingTreasury.sol";

/**
A simple class that allows anyone to bankroll, and maintains collateral.
  - Anybody can add funding.
  - Anybody can tell profits (balance - funding - collateral) to go to Treasury.
  - Anyone can remove their funding, so long as balance >= collateral.
*/
contract Bankrollable is
	UsingTreasury
{
	uint public bankroll;
    mapping(address => uint) public bankrolled;

    event BankrollAdded(uint time, address indexed sender, uint amount, uint bankroll);
    event BankrollRemoved(uint time, address indexed recipient, uint amount, uint bankroll);
    event ProfitsSent(uint time, address indexed recipient, uint amount);

	function Bankrollable(address _registry)
		UsingTreasury(_registry)
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
        bankroll += msg.value;
        bankrolled[msg.sender] += msg.value;
        BankrollAdded(now, msg.sender, msg.value, bankroll);
    }

	// Remove the lesser of: {bankrolled[sender], available}, or nothing at all.
    // Will send removed amount to the sender.
    function removeBankroll(uint _amount)
        public
    {
        uint _collateral = getCollateral();
        uint _available = this.balance > _collateral ? this.balance - _collateral : 0;
        if (_amount > _available) _amount = _available;
        if (_amount > bankrolled[msg.sender]) _amount = bankrolled[msg.sender];
        if (_amount == 0) return;

        bankroll -= _amount;
        bankrolled[msg.sender] -= _amount;
        require(msg.sender.call.value(_amount)());
        BankrollRemoved(now, msg.sender, _amount, bankroll);
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

    // Function can be overridden by inheritors to ensure collateral is kept.
	function getCollateral()
		public
		view
		returns (uint _amount)
	{
		return 0;
	}

    // Profits are anything above bankroll + collateral, or 0.
    function getProfits()
        public
        view
        returns (uint _profits)
    {
        uint _balance = this.balance;
        uint _threshold = bankroll + getCollateral();
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
        uint _bankroll = bankroll;
        uint _collat = getCollateral();
        // Balance is below collateral!
        if (_balance <= _collat) return 0;
        // No profits, but we have a balance over collateral.
        else if (_balance < _collat + bankroll) return _balance - _collat;
        // Profits. Return only _bankroll
        else return _bankroll;
    }
}