pragma solidity ^0.4.19;

import "./DividendToken.sol";
import "./DividendTokenLocker.sol";

/*
A Comptroller:
	- Accepts ETH via .mintTokens()
	- Refunds ETH via .burnTokens()
	- Ensures PennyEtherTokenLocker has 20% of tokens. 

As the owner of Token contract, it can call:
	- token.mintTokens(address, amount)
	- token.burnTokens(address, amount) 

As the owner of the owner of the Treasury, it can call:
	- treasury.addToBankroll(amount) 
	- treasury.removeFromBankroll(amount)

Other notes:
	- The treasury may only be set once and cannot be changed.
	- The token locker may only be set once and cannot be changed.
	- Once sale of tokens has started, cannot be stopped.
*/
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
	// Stores amtFunded for useres contributing before softCap
	mapping (address => uint) public amtFunded;	

	// events
	event BuyTokensSuccess(uint time, address indexed sender, uint value, uint numTokens);
	event BuyTokensFailure(uint time, address indexed sender, string reason);
	event SaleInitalized(uint time);		// emitted when wallet calls .initSale()
	event SaleStarted(uint time);			// emitted upon first tokens bought
	event SaleSuccessful(uint time);		// emitted when sale ends (may happen early)
	event SaleFailed(uint time);			// emitted if softCap not reached
	// Emitted after sale when a user burns their tokens via .burnTokens() or .sendRefund()
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
	/********** WALLET FUNCTIONS *********************************/
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
			// wallet should own close to 100%
			token.mintTokens(wallet, 1e30);
			SaleFailed(now);
			return;
		}

		// Mint 1/8 to wallet, and 1/8 to locker
		// Ownership will be: funders: 80%, locker: 10%, wallet: 10%
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

	// If sale was unsuccessful, allow wallet to drain the treasury.
	// Note: this does not effect refunds, they are held in Comptroller.
	function drainTreasury()
		public
	{
		require(wasSaleEnded && !wasSaleSuccessful);
		require(msg.sender == wallet);
		treasury.drain(wallet);
	}

	/*************************************************************/
	/********** PURE/VIEW ****************************************/
	/*************************************************************/
	// Returns the total amount of tokens minted at a given _ethAmt raised.
	// This hard codes the following:
	//	 - Start at 50% bonus, linear decay to 0% bonus at 20,000 ether.
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
			//     tokensPerEth = 3/2 - x/(2c), where c is bonus cutoff
			//	   let's try som values:
			//     with c=20000: (0, 1.5), (10000, 1.25), (20000, 1)
			//   Next, create a closed form integral:
			//     integral(3/2 - x/(2c), x) = 3x/2 - x^2/(4c)
			//     let's try some values:
			//     with c=20000: (0, 0), (10000, 13750), (20000, 25000)
			// Note: _ethAmt <= 20000, so there's no risk of overflow.
			//   eg: (20000e18)^2 is ~1e45.. well under 1e77
			_numTokens = (3*_ethAmt/2) - (_ethAmt*_ethAmt)/(4*bonusCap);
		}
	}

	// Returns how many tokens would be issued for _ethAmt sent.
	function getTokensFromEth(uint _ethAmt)
		public
		view
		returns (uint _numTokens)
	{
		return getTokensMintedAt(totalRaised + _ethAmt) - getTokensMintedAt(totalRaised);
	}
}