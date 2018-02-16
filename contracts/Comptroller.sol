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
		- Allows funders to receive a full refund via .sendRefund()
		- Allows "wallet" to drain Treasury via .drainTreasury()
	- After successful CrowdSale (soft cap met):
		- Mints 20% tokens to TokenLocker, for vesting
		- Sends bankroll to Treasury (.5 Ether per Token Minted)
	  	- Allows users to burn tokens for a refund via .burnTokens()
	  		- This removes bankroll from Treasury

Permissons:
	- wallet (permanent):
		- can set CrowdSale parameters
		- upon failed CrowdSale, can drain Treasury
	- Anybody:
		- During CrowdSale:
			- Can send Ether to get tokens, provided conditions are met.
			- Can end the sale, provided conditions are met.
		- After successful CrowdSale:
			- Can burn tokens for a .5 Ether refund
		- After unsuccessful Crowdsale:
			- Can receive a full refund via .sendRefund

The Comptroller is the owner of the Token Contract, and has
special permissions on the Treasury contact.

  - As the owner of Token contract, Comptroller can call:
 	- token.mintTokens(address, amount) [only during CrowdSale]
	- token.burnTokens(address, amount) [only when SoftCap Met]
	- These calls only occur during the CrowdSale, and never again.

  - As the owner of the owner of the Treasury, it can call:
  	- After CrowdSale, if softCap met:
		- treasury.addToBankroll(): sends .5 Ether per Token
		- treasury.removeFromBankroll(): removes .5 Ether per Token burned
	- After CrowdSale, if softCap not met:
		- treasury.drain(address): removes all funds from Treasury

Other notes:
	- All addresses are final, and cannot be changed
	- Once sale has started, it cannot be stopped
	- No owner intervention allowed, no emergency features

*/

// This is the interface to the Treasury.
interface _ICompTreasury {
	// after CrowdSale, will add funds to bankroll.
	function addToBankroll() public payable;
	// after CrowdSale, if softcap met, will allow users to burn tokens.
	function removeFromBankroll(uint _amount, address _recipient) public;
	// after CrowdSale, if softcap not met, will allow wallet to get treasury funds.
	function drain(address _recipient) public;
	// after CrowdSale, used to ensure Treasury has a full balance.
	function getDividendThreshold() public constant returns (uint _amount);
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
	bool public wasSaleStarted;				// True if sale was started
	bool public wasSaleEnded;				// True if sale was ended
	bool public wasSaleSuccessful;			// True if softCap was met
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
		// Ensure it is not transferrable, since we'll burn it after CrowdSale.
		token.mintTokens(wallet, 1);
		token.setFrozen(true);
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
		require(wasSaleStarted && !wasSaleSuccessful);
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
		// If sale has not yet started, refund
		if (dateSaleStarted==0 || now < dateSaleStarted)
			return errorAndRefund("CrowdSale has not yet started.");

		// Set sale as started (even though it may already be completed)
		// This handles the case of zero CrowdSale participants
		if (!wasSaleStarted) startSale();

		// If sale has ended, or msg.value is not even amt of gWei, refund
		if (now > dateSaleEnded)
			return errorAndRefund("CrowdSale has ended.");
		if (totalRaised >= hardCap)
			return errorAndRefund("HardCap has been reached.");
		if (msg.value % 1000000000 != 0)
			return errorAndRefund("Must send an even amount of GWei.");

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
		// Increment the amount they funded
		if (totalRaised < softCap) {
			amtFunded[msg.sender] += _amt;
		}

		// Refund the user any excess amount.
		// A re-entry here would do nothing, hardCap has been reached
		if (msg.value > _amt)
			require(msg.sender.call.value(msg.value - _amt)());
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
		
		// Mark sale as over.
		wasSaleEnded = true;
		wasSaleSuccessful = totalRaised >= softCap;

		// If softCap not met:
		//   Mint a ton of tokens to wallet, so they own ~100%
		//   This ensures wallet receives nearly 100% of dividends.
		if (!wasSaleSuccessful) {
			token.mintTokens(wallet, 1e30);
			SaleFailed(now);
			return;
		}

		// Burn owner's 1 token, and allow tokens to be transferred.
		token.burnTokens(wallet, 1);
		token.setFrozen(false);

		// Mint 1/4 to locker, and start vesting.
		uint _lockerAmt = token.totalSupply() / 4;
		token.mintTokens(locker, _lockerAmt);
		locker.startVesting(600);

		// Move half of tokens' ETH value to bankroll
		treasury.addToBankroll.value(token.totalSupply() / 2)();

		// Ensure Treasury balance is at getDividendThreshold()
		// If dailyFundLimit is some huge value, its possible we cant afford
		// In that case, send the rest of balance to treasury.
		uint _threshold = treasury.getDividendThreshold();
		if (treasury.balance < _threshold) {
			uint _required = _threshold - treasury.balance;
			if (_required > this.balance) _required = this.balance;
			require(treasury.call.value(_required)());
		}
		
		// Send remaining balance to wallet
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
		// Throw if they have no tokens to burn.
		if (_numTokens > token.balanceOf(msg.sender)) {
			_numTokens = token.balanceOf(msg.sender);
		}
		require(_numTokens > 0);

		// Should get back 50% as wei.
		// If Treasury can't afford, lower amount of tokens.
		uint _burnRefund = _numTokens / 2;
		if (treasury.balance < _burnRefund){
			_burnRefund = treasury.balance;
			_numTokens = _burnRefund * 2;
		}

		// Burn user's tokens, and send bankroll to user
		// .removeFromBankroll will fail if unable to send.
		token.burnTokens(msg.sender, _numTokens);
		treasury.removeFromBankroll(_burnRefund, msg.sender);
		UserRefunded(now, msg.sender, _numTokens, _burnRefund);
	}

	// If sale was unsuccessful, allow users to get full refund.
	function sendRefund()
		public
	{
		// Ensure sale ended unsuccessfully.
		require(wasSaleEnded && !wasSaleSuccessful);
		require(amtFunded[msg.sender] > 0);
		// Send the user the amount they funded, or fail
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