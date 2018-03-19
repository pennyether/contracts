pragma solidity ^0.4.19;

import "./roles/UsingTreasury.sol";

/**
A simple class that allows anyone to bankroll, and maintains collateral.
  - Anybody can add funding.
  - Anybody can tell profits (balance - funding - collateral) to go to Treasury.
  - Anyone can remove their funding, so long as balance >= collateral.
  - When funding is removed, it is passed to bankroller.getBankrollBack()
*/
contract Bankrollable is
	UsingTreasury
{
    // .removeBankroll() passes back bankroll to this function.
    bytes4 constant CALLBACK_FN = bytes4(sha3("removeBankrollCallback()"));
    
    // Total bankroll amount.
	uint public bankroll;
    // Amount bankrolled per bankroller.
    mapping(address => uint) public bankrolled;

    event BankrollAdded(uint time, address indexed bankroller, uint amount, uint bankroll);
    event BankrollRemoved(uint time, address indexed bankroller, uint amount, uint bankroll);
    event ProfitsSent(uint time, address indexed treasury, uint amount);

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
        address _bankroller = msg.sender;
        bankroll += msg.value;
        bankrolled[_bankroller] += msg.value;
        BankrollAdded(now, _bankroller, msg.value, bankroll);
    }

	// Remove the lesser of: {bankrolled[sender], available}, or nothing at all.
    // Will send removed amount to the sender.
    function removeBankroll(uint _amount)
        public
        returns (uint _recalled)
    {
        address _bankroller = msg.sender;
        uint _collateral = getCollateral();
        uint _available = this.balance > _collateral ? this.balance - _collateral : 0;
        if (_amount > _available) _amount = _available;
        if (_amount > bankrolled[_bankroller]) _amount = bankrolled[_bankroller];
        if (_amount == 0) return;

        // Remove _amount from bankroll and bankrolled.
        // Then send it to CALLBACK_FN, and emit event.
        bankroll -= _amount;
        bankrolled[_bankroller] -= _amount;
        require(_bankroller.call.value(_amount)(CALLBACK_FN));
        BankrollRemoved(now, _bankroller, _amount, bankroll);
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

    // Allows external callers to somewhat verify this contract isBankrollable().
    // Unfortunately there's no _fool-proof_ way to verify this on-chain.
    function isBankrollable() public pure returns (bool _true) { return true; }
}