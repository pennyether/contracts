pragma solidity ^0.4.19;

import "./DividendToken.sol";
import "./DividendTokenLocker.sol";


/*********************************************************
*********************** COMPTROLLER **********************
**********************************************************

UI: https://www.pennyether.com/status/system#comptroller

The Comptroller:
	- Creates DividendToken and DividendTokenLocker
	- Manages the CrowdSale:
		- Mints tokens in exchange for Eth
		- Monitors dates and amount raised
	- After unsuccessful CrowdSale (soft cap not met):
		- Allows funders to receive a full refund
		- Allows "wallet" to drain Treasury
	- After successful CrowdSale (soft cap met):
		- Sends bankroll to Treasury
		- Mints tokens for TokenLocker and Wallet
	  	- Allows users to burn tokens for a refund:
	  		- Tells Treasury to send some bankroll to Token Holder
			- Ensures PennyEtherTokenLocker stays at 10%

Permissons:
	- wallet (permanent):
		- can set CrowdSale parameters
		- upon failed CrowdSale, can drain Treasury
	- Anybody:
		- During CrowdSale:
			- Can send Ether to get tokens
			- Can start/end the sale, provided conditions are met.
		- After successful CrowdSale:
			- Can burn tokens for a .5 Ether refund
		- After unsuccessful Crowdsale:
			- Can receive a full refund

The Comptroller is the owner of the Token Contract, and has
special permissions on the Treasury contact.

  * As the owner of Token contract, Comptroller can call:
 	- token.mintTokens(address, amount) [only during CrowdSale]
	- token.burnTokens(address, amount) [only when SoftCap Met]

  * As the owner of the owner of the Treasury, it can call:
	- treasury.addToBankroll(amount) 
		- after the ICO, sends Ether to treasury as bankroll
	- treasury.removeFromBankroll(amount, recipient)
		- after CrowdSale, when a user burns tokens
	- treasury.drain(address)
		- after CrowdSale, if SoftCap not met

Other notes:
	- All addresses are final, and cannot be changed
	- Once sale has started, it cannot be stopped

*/

// This is the interface to the Treasury.
interface _ICompTreasury {
	// after ICO, will add funds to bankroll.
	function addToBankroll() public payable;
	// after ICO, if softcap met, will allow users to burn tokens.
	function removeFromBankroll(uint _amount, address _recipient) public;
	// after ICO, if softcap not met, will allow wallet to get treasury funds.
	function drain(address _recipient) public;
	// when ending ICO, will ensure Treasury has a full balance.
	function getMinBalanceToDistribute() public constant returns (uint _amount);
}
contract Comptroller {
	// These values are set in the constructor and can never be changed.
	address public wallet;				// Wallet can call .initSale().
	_ICompTreasury public treasury;		// Location of the treasury.
	DividendToken public token;			// Token contract that can mint / burn tokens
	DividendTokenLocker public locker;	// Locker that holds PennyEther's tokens.

	// These values are set on .initSale()
	uint public dateSaleStarted;	// date sale begins
	uint public dateSaleEnded;		// date sale is endable
	uint public softCap;			// sale considered successfull if amt met
	uint public hardCap;			// will not raise more than this
	uint public bonusCap;			// amt at which bonus ends

	// CrowdSale Variables
	uint public totalRaised;
	bool public wasSaleStarted;				// True when sale is started
	bool public wasSaleEnded;				// True when sale is ended
	bool public wasSaleSuccessful;			// True if softCap met
	// Stores amtFunded for useres contributing before softCap is met
	mapping (address => uint) public amtFunded;	

	// Sale Events
	event SaleInitalized(uint time);		// emitted when wallet calls .initSale()
	event SaleStarted(uint time);			// emitted upon first tokens bought
	event SaleSuccessful(uint time);		// emitted when sale ends (may happen early)
	event SaleFailed(uint time);			// emitted if softCap not reached
	// During sale
	event BuyTokensSuccess(uint time, address indexed sender, uint value, uint numTokens);
	event BuyTokensFailure(uint time, address indexed sender, string reason);
	// After sale, via .burnTokens() or .sendRefund()
	event UserRefunded(uint time, address indexed sender, uint numTokens, uint refund);

	function Comptroller(address _wallet, address _treasury)
		public
	{
		wallet = _wallet;
		treasury = _ICompTreasury(_treasury);
		token = new DividendToken();
		locker = new DividendTokenLocker(token, _wallet);
		// When initialized, the wallet should own the only token.
		token.mintTokens(wallet, 1);
	}


	/*************************************************************/
	/********** WALLET (OWNER) FUNCTIONS *************************/
	/*************************************************************/
	// Sets parameters of the CrowdSale
	// Cannot be called once the crowdsale has started.
	function initSale(uint _dateStarted, uint _dateEnded, uint _softCap, uint _hardCap, uint _bonusCap)
		public
	{
		require(msg.sender == wallet);
		require(treasury != address(0));
		require(!wasSaleStarted);
		require(_softCap <= _hardCap);
		require(_bonusCap <= _hardCap);
		dateSaleStarted = _dateStarted;
		dateSaleEnded = _dateEnded;
		softCap = _softCap;
		hardCap = _hardCap;
		bonusCap = _bonusCap;
		SaleInitalized(now);
	}

	// ONLY IF sale was unsuccessful, allow wallet to drain the treasury.
	// This exists to give "wallet" control over Treasury funds if
	// 	 CrowdSale fails. Otherwise, those funds would be unrecoverable.
	// Note: this does not effect refunds, they are held in Comptroller.
	function drainTreasury()
		public
	{
		require(msg.sender == wallet);
		require(wasSaleEnded && !wasSaleSuccessful);
		treasury.drain(wallet);
	}


	/*************************************************************/
	/********** DURING CROWDSALE *********************************/
	/*************************************************************/
	function () public payable {
		buyTokens();
	}

	// Allows the sender to buy tokens.
	// Must send units of GWei, nothing lower.
	function buyTokens()
		public
		payable
	{
		// Ensure sale is ongoing, and that amount is even GWei
		if (dateSaleStarted==0 || now < dateSaleStarted)
			return errorAndRefund("CrowdSale has not yet started.");
		if (now > dateSaleEnded)
			return errorAndRefund("CrowdSale has ended.");
		if (totalRaised >= hardCap)
			return errorAndRefund("HardCap has been reached.");
		if (msg.value % 1000000000 != 0)
			return errorAndRefund("Must send an even amount of GWei.");

		if (!wasSaleStarted) startSale();

		// Only allow up to (hardCap - totalRaised) to be raised.
		uint _amt = (totalRaised + msg.value) > hardCap
			? hardCap - totalRaised
			: msg.value;

		// Mint the tokens for the user
		uint _numTokens = getTokensFromEth(_amt);
		token.mintTokens(msg.sender, _numTokens);
		totalRaised += _amt;
		BuyTokensSuccess(now, msg.sender, _amt, _numTokens);

		// In case softCap not met, we may need to refund the user.
		if (totalRaised < softCap) {
			amtFunded[msg.sender] += _amt;
		}

		// If totalRaised is hardCap, end the sale and refund user excess
		if (totalRaised >= hardCap) {
			// A re-entry here would do nothing, hardCap has been reached
			if (msg.value > _amt)
				require(msg.sender.call.value(msg.value - _amt)());
		}
	}
		// Refunds user, logs error reason
		function errorAndRefund(string _reason)
			private
		{
			require(msg.sender.call.value(msg.value)());
			BuyTokensFailure(now, msg.sender, _reason);
		}
		function startSale()
			private
		{
			wasSaleStarted = true;
			token.setFrozen(true);
			SaleStarted(now);
		}

	// Finalizes the sale, if necessary. Callable by anyone.
	function endSale()
		public
	{
		// Require sale has been started but not yet ended.
		require(wasSaleStarted && !wasSaleEnded);
		// Require hardCap met, or date is after sale ended.
		require(totalRaised >= hardCap || now > dateSaleEnded);
		
		// Mark sale as over. If softcap not met, nothing else to do.
		wasSaleEnded = true;
		wasSaleSuccessful = totalRaised >= softCap;
		if (!wasSaleSuccessful) {
			// mint a ton of tokens to wallet, so they own ~100%
			token.mintTokens(wallet, 1e30);
			SaleFailed(now);
			return;
		}

		// Mint 1/8 to wallet, and 1/8 to locker
		// Disribution will be: funders: 80%, locker: 10%, wallet: 10%
		// Wallet already has 1 token, so subtract it.
		uint _totalMinted = token.totalSupply();
		token.mintTokens(wallet, _totalMinted/8 - 1);
		token.mintTokens(locker, _totalMinted/8);

		// Allow tokens to be transferrable
		token.setFrozen(false);

		// Move half of burnable-tokens' ETH value to bankroll
		_totalMinted += token.balanceOf(wallet);
		treasury.addToBankroll.value(_totalMinted / 2)();

		// Ensure treasury is fully topped off
		uint _threshold = treasury.getMinBalanceToDistribute();
		if (treasury.balance < _threshold) {
			uint _required = _threshold - treasury.balance;
			if (_required > this.balance) _required = this.balance;
			require(treasury.call.value(_required)());
		}
		
		// send remaining balance to wallet
		if (this.balance > 0)
			require(wallet.call.value(this.balance)());
		SaleSuccessful(now);
	}


	/*************************************************************/
	/********** AFTER CROWDSALE **********************************/
	/*************************************************************/
	// If sale was successful, allows the sender to burn up to _numTokens
	//   - If the sender does not have that many tokens, will
	//     burn their entire balance.
	//   - If Treasury does not have sufficient balance, it will
	//     it will burn as much as possible.
	function burnTokens(uint _numTokens)
		public
	{
		// Ensure sale ended successfully.
		require(wasSaleEnded && wasSaleSuccessful);

		// If number is too large, use their whole balance.
		if (_numTokens > token.balanceOf(msg.sender)) {
			_numTokens = token.balanceOf(msg.sender);
		}
		// Should get back 50% as wei.
		uint _wei = _numTokens / 2;
		// If Treasury can't afford, lower amount of tokens.
		if (treasury.balance < _wei){
			_wei = treasury.balance;
			_numTokens = _wei * 2;
		}
		// Require a minimum of 1Gwei to limit rounding errors.
		require(_wei > 1000000000);
		// Burn user's tokens
		token.burnTokens(msg.sender, _numTokens);
		// For every 9 user tokens burned, burn 1 locker token.
		// This keeps locker at 10% ownership
		token.burnTokens(locker, _numTokens / 9);
		// removeFromBankroll. This sends it to the user (or fails).
		treasury.removeFromBankroll(_wei, msg.sender);
		UserRefunded(now, msg.sender, _numTokens, _wei);
	}

	// If sale was unsuccessful, allow users to get full refund.
	function sendRefund()
		public
	{
		// Ensure sale ended unsuccessfully.
		require(wasSaleEnded && !wasSaleSuccessful);
		require(amtFunded[msg.sender] > 0);
		// Send the user the amount they funded
		uint _amt = amtFunded[msg.sender];
		amtFunded[msg.sender] = 0;
		require(msg.sender.call.value(_amt)());
		UserRefunded(now, msg.sender, token.balanceOf(msg.sender), _amt);
	}


	/*************************************************************/
	/********** PURE/VIEW ****************************************/
	/*************************************************************/
	// Returns the total amount of tokens minted at a given _ethAmt raised.
	// This hard codes the following:
	//	 - Start at 50% bonus, linear decay to 0% bonus at bonusCap.
	// The math behind it is explaind in comments.
	function getTokensMintedAt(uint _ethAmt)
		public
		view
		returns (uint _numTokens)
	{
		if (_ethAmt > hardCap) {
			// Return the full bonus amount, plus the rest
			_numTokens = (bonusCap * 5)/4 + (hardCap - bonusCap);
		} else if (_ethAmt > bonusCap) {
			// Return the full bonus amount, plus whatever amt in ether.
			_numTokens = (bonusCap * 5)/4 + (_ethAmt - bonusCap);
		} else {
			// Use a closed form integral to compute tokens.
			//   First make a function for tokensPerEth:
			//     tokensPerEth = 3/2 - x/(2c), where c is bonusCap
			//	   Let's try some values:
			//       with c=20000: (0, 1.5), (10000, 1.25), (20000, 1)
			//   Next, create a closed form integral:
			//     integral(3/2 - x/(2c), x) = 3x/2 - x^2/(4c)
			//     Let's try some values:
			//       with c=20000: (0, 0), (10000, 13750), (20000, 25000)
			// Note: _ethAmt <= 20000, so there's no risk of overflow.
			//   eg: (20000e18)^2 is ~1e45.. well under 1e77
			_numTokens = (3*_ethAmt/2) - (_ethAmt*_ethAmt)/(4*bonusCap);
		}
	}

	// Returns how many tokens would be issued for _ethAmt sent,
	// depending on current totalRaised.
	function getTokensFromEth(uint _amt)
		public
		view
		returns (uint _numTokens)
	{
		return getTokensMintedAt(totalRaised + _amt) - getTokensMintedAt(totalRaised);
	}
}