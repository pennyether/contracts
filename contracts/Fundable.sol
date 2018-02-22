pragma solidity ^0.4.19;

import "./roles/UsingAdmin.sol";
import "./roles/UsingTreasury.sol";

/**
A simple class that manages a "funding" variable.
  Anybody can (generously) add funding.
  Anybody can tell profits (balance - funding) to go to Treasury.
  Admin can remove funding (sends it to Treasury)
*/
contract Fundable is
	UsingAdmin,
	UsingTreasury
{
	uint128 public funding;

    event FundingAdded(uint time, address indexed sender, uint amount, uint funding);
    event FundingRemoved(uint time, address indexed recipient, uint amount, uint funding);
    event ProfitsSent(uint time, address indexed recipient, uint amount, uint funding);

	function Fundable(address _registry)
		UsingAdmin(_registry)
		UsingTreasury(_registry)
		public
	{}

	/*****************************************************/
    /************** ADMIN FUNCTIONS **********************/
    /*****************************************************/

	// Decreases funding by _amount
    function removeFunding(uint128 _amount)
        public
        fromAdmin
    {
        if (_amount > this.balance) _amount = uint128(this.balance);
        require(_amount <= funding);
        funding -= _amount;
        // send it to treasury
        address _tr = getTreasury();
        require(_tr.call.value(_amount)());
        FundingRemoved(now, _tr, _amount, funding);
    }


    /*****************************************************/
    /************** PUBLIC FUNCTIONS *********************/
    /*****************************************************/

	// Increase funding by whatever value is sent
    function addFunding()
        public
        payable 
    {
        funding += uint128(msg.value);
        FundingAdded(now, msg.sender, msg.value, funding);
    }

    function sendProfits()
        public
        returns (uint _profits)
    {
        _profits = getProfits();
        if (_profits == 0) return;
        // send it to treasury
        address _tr = getTreasury();
        require(_tr.call.value(_profits)());
        ProfitsSent(now, _tr, _profits, funding);
    }


    /*****************************************************/
    /************** PUBLIC VIEWS *************************/
    /*****************************************************/

    // Returns the difference between this.balance and funding
	// If negative, returns 0.
	function getProfits()
		public
		view
		returns (uint _amount)
	{
		uint _balance = this.balance;
		if (_balance <= funding) return;
		return _balance - funding;
	}
}