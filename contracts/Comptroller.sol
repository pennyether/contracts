pragma solidity ^0.4.19;

/************************************************************************
*********************** COMPTROLLER *************************************
*************************************************************************

   UI: https://www.pennyether.com/status/system#comptroller

   The Comptroller creates the DividendToken and DividendTokenLocker,
   runs the CrowdSale, can raise capital for Treasury, and allows
   users to burn their tokens for refund.


THE CROWDSALE
------------------------------------------------------------------------

  The owner can configure the CrowdSale via .initSale().
  Owner is allowed to change the terms of the CrowdSale at any time,
  as long as it hasn't started yet. Configurable parameters are:
  	- dateSaleStarted: when the sale will start
  	- daleSaleEnded: when the sale will end
  	- softCap: amount required for the sale to be considered successful
  	- hardCap: maximum amount to be raised
  	- bonusCap: how many Ether the bonus period extends to
  	- capital: how many Ether to send to Treasury as capital

  The CrowdSale is started as soon as one user buys tokens, and ends
  if the hardCap is met, or dateSaleEnded is reached. The CrowdSale
  will be considered "successful" if the SoftCap is reached. The 
  exchange rate is 1 Ether = 1 Token, plus a bonus amount that 
  starts at 50% for the 1st Ether, sliding down to 0% at `bonusCap`.

  Upon a successful CrowdSale:
  	- Tokens are unfronzen
  	- Owner wallet gets 20% of tokens, which will vest for 600 days.
  	- .5 Ether per token is sent to Treasury as reserve
  	  - Comptroller allows tokens to be burned for .5 ETH, guaranteed.
	- `capital` Ether is sent to the Treasury
	- the remaning Ether is sent to the owner wallet

  Upon an unsuccessful CrowdSale:
	- Tokens remain frozen
	- Investors can call .getRefund() for a full refund
	- Owner gets minted a ton of tokens (to maintain ~100% ownership)

RAISING CAPITAL
------------------------------------------------------------------------

  The Treasury has a method called .capitalNeeded(). This value is 
  changable by Admin, via a governance described in Treasury. When this
  value is > 0, Comptroller will accept Ether in exchange for tokens at
  a rate of 1 Ether per Token, until Treasury.capitalNeeded() is zero.

  Per Ether raised, .5 goes to Treasury as reserve (should the user
  later decide to burn tokens), and .5 goes to Treasury as raised
  capital, to be used to fund game contracts.


PERMISSIONS
------------------------------------------------------------------------

  Comptroller owns the Token, and is only address that can call:
 	- token.mint(address, amount)
 		- During CrowdSale
 		- When raising capital for Treasury
	- token.burn(address, amount)
		- Only after SoftCap is met; when a user burns tokens.

  The following addresses have permission on Comptroller:
	- Owner Wallet (permanent):
		- Can set CrowdSale parameters, if it hasn't started yet.
	- Anybody:
		- During CrowdSale:
			.fund(): Send Ether, get Tokens. Refunds on failure.
			.endSale(): End the sales, provided conditions are met.
		- After successful CrowdSale:
			.burnTokens(): Receive .5 ETH per token burned.
		- After unsuccessful Crowdsale:
			.refund(): Receive a full refund of amount sent to .fund()
		- If Treasury.capitalNeeded() > 0
			.fundCapital(): Send Ether, get Tokens. Refunds on failure.

CONCLUSION
------------------------------------------------------------------------

  The above description covers the entirety of this contract. There are
  no emergency features or emergency stop gaps in the contract. All
  addresses in this contract (wallet, treasury, token, locker) are 
  unchangable. If you find behavior in this contract that is incorrect,
  do the right thing and let us know. Enjoy.

  A full suite of tests can be found here:


  And, ideally, this contract will have been audited by third parties.

*************************************************************************/

// This is the interface to the Treasury.
interface _ICompTreasury {
	// after CrowdSale, will add funds to bankroll.
	function addCapital() public payable;
	// after CrowdSale, if softcap met, will allow users to burn tokens.
	function addReserve() public payable;
	// called when user burns tokens
	function removeReserve(uint _amount, address _recipient) public;
	// used to determine if Treasury wants to raise capital.
	function capitalNeeded() public returns (uint);
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
	uint public targetCapital;		// amt to send to Treasury as capital

	// CrowdSale Variables
	uint public totalRaised;
	bool public wasSaleStarted;				// True if sale was started
	bool public wasSaleEnded;				// True if sale was ended
	bool public wasSoftCapMet;				// True if softCap was met
	// Stores amtFunded for useres contributing before softCap is met
	mapping (address => uint) public amtFunded;	

	event Created(uint time, address wallet, address treasury);
	// CrowdSale Meta Events
	event SaleInitalized(uint time);		// emitted when wallet calls .initSale()
	event SaleStarted(uint time);			// emitted upon first tokens bought
	event SaleSuccessful(uint time);		// emitted when sale ends (may happen early)
	event SaleFailed(uint time);			// emitted if softCap not reached
	// CrowdSale purchase
	event BuyTokensSuccess(uint time, address indexed account, uint value, uint numTokens);
	event BuyTokensFailure(uint time, address indexed account, string reason);
	// If user sends too much, or if softcap not met.
	event UserRefunded(uint time, address indexed account, uint refund);
	// Burning Tokens
	event BurnTokensSuccess(uint time, address indexed tokenHolder, uint numTokens, uint refund);
	event BurnTokensFailure(uint time, address indexed tokenHolder, uint numTokens, string reason);
	

	function Comptroller(address _wallet, address _treasury)
		public
	{
		wallet = _wallet;
		treasury = _ICompTreasury(_treasury);
		token = new DividendToken("PennyEtherToken", "PENNY");
		locker = new DividendTokenLocker(token, _wallet);
		// When initialized, the wallet should own the only token.
		// Ensure it is not transferrable, since we'll burn it after CrowdSale.
		token.mint(wallet, 1);
		token.freeze(true);
		Created(now, _wallet, _treasury);
	}


	/*************************************************************/
	/********** WALLET (OWNER) FUNCTIONS *************************/
	/*************************************************************/

	// Sets parameters of the CrowdSale
	// Cannot be called once the crowdsale has started.
	function initSale(uint _dateStarted, uint _dateEnded, uint _softCap, uint _hardCap, uint _bonusCap, uint _targetCapital)
		public
	{
		require(msg.sender == wallet);
		require(!wasSaleStarted);
		require(_softCap <= _hardCap);
		require(_bonusCap <= _hardCap);
		require(_targetCapital <= _softCap);
		dateSaleStarted = _dateStarted;
		dateSaleEnded = _dateEnded;
		softCap = _softCap;
		hardCap = _hardCap;
		bonusCap = _bonusCap;
		targetCapital = _targetCapital;
		SaleInitalized(now);
	}


	/*************************************************************/
	/********** DURING CROWDSALE *********************************/
	/*************************************************************/

	function () public payable {
		fund();
	}

	// Allows the sender to buy tokens.
	//
	// Refunds if:
	//  - CrowdSale start not defined, or time is before it.
	//  - CrowdSale end date reached.
	//  - CrowdSale HardCap has been met.
	//  - Non-even amount of GWei sent.
	//
	// Otherwise:
	//  - Starts sale (if it's not already started)
	//  - Issues tokens to user (takes into account bonus period)
	//  - If SoftCap not yet met, records amtFunded (so can refund)
	//  - Refunds any excess amount sent (if HardCap was just met)
	function fund()
		public
		payable
	{
		if (dateSaleStarted==0 || now < dateSaleStarted)
			return _errorBuyingTokens("CrowdSale has not yet started.");
		if (now > dateSaleEnded)
			return _errorBuyingTokens("CrowdSale has ended.");
		if (totalRaised >= hardCap)
			return _errorBuyingTokens("HardCap has been reached.");
		if (msg.value % 1000000000 != 0)
			return _errorBuyingTokens("Must send an even amount of GWei.");

		// Mark sale as started if haven't done so already.
		if (!wasSaleStarted) {
			wasSaleStarted = true;
			SaleStarted(now);
		}

		// Only allow up to (hardCap - totalRaised) to be raised.
		uint _amtToFund = (totalRaised + msg.value) > hardCap
			? hardCap - totalRaised
			: msg.value;

		// Mint the tokens for the user, increment totalRaised
		uint _numTokens = getTokensFromEth(_amtToFund);
		token.mint(msg.sender, _numTokens);
		totalRaised += _amtToFund;
		BuyTokensSuccess(now, msg.sender, _amtToFund, _numTokens);

		// Increment the amount they funded, if softCap not met.
		if (totalRaised < softCap) {
			amtFunded[msg.sender] += _amtToFund;
		}

		// Refund the user any amount sent over _amtToFund
		uint _refund = msg.value > _amtToFund ? msg.value - _amtToFund : 0;
		if (_refund > 0){
			require(msg.sender.call.value(_refund)());
			UserRefunded(now, msg.sender, _refund);
		}
	}
		
	// Ends the CrowdSale. Callable by anyone.
	//
	// Throws if:
	//   - Sale is not started, or sale is already ended.
	//   - HardCap not met and sale end date not reached.
	//
	// If SoftCap met:
	//   - Unfreezes tokens.
	//   - Gives owners 20% in TokenLocker, vesting 600 days.
	//   - Sends .5 Eth per token to Treasury, as reserve.
	//   - Sends `targetCapital` to Treasury, as capital raised.
	//   - Sends remaining funds to Owner Wallet
	//
	// If SoftCap not met:
	//   - Mints a ton of tokens for owner (to maintain 100% ownership)
	//   - Funders will be able to call .refund()
	function endSale()
		public
	{
		// Require sale has been started but not yet ended.
		require(wasSaleStarted && !wasSaleEnded);
		// Require hardCap met, or date is after sale ended.
		require(totalRaised >= hardCap || now > dateSaleEnded);
		
		// Mark sale as over, and if it was successful.
		wasSaleEnded = true;
		wasSoftCapMet = totalRaised >= softCap;

		// Softcap not met. Mint tokens so wallet owns ~100%.
		if (!wasSoftCapMet) {
			token.mint(wallet, 1e30);
			SaleFailed(now);
			return;
		}

		// Burn wallet's 1 token, and allow tokens to be transferred.
		token.burn(wallet, 1);
		token.freeze(false);

		// Mint 1/4 to locker (resuling in 20%), and start vesting.
		uint _lockerAmt = token.totalSupply() / 4;
		token.mint(locker, _lockerAmt);
		locker.startVesting(_lockerAmt, 600);	// vest for 600 days.

		// Move half of tokens' ETH value to reserve
		treasury.addReserve.value(token.totalSupply() / 2)();
		// Send up to `targetCapital` ETH to treasury as capital
		uint _capitalAmt = this.balance > targetCapital ? targetCapital : this.balance;
		treasury.addCapital.value(_capitalAmt)();
		
		// Send remaining balance to wallet
		wallet.call.value(this.balance)();
		// Emit event once and forever
		SaleSuccessful(now);
	}


	/*************************************************************/
	/********** AFTER CROWDSALE **********************************/
	/*************************************************************/

	// If sale was successful, allows the sender to burn up to _numTokens
	//   - If the sender does not have that many tokens, will
	//     burn their entire balance.
	function burnTokens(uint _numTokens)
		public
	{
		// Ensure sale ended and softcap was met
		if (!wasSaleEnded)
			return BurnTokensFailure(now, msg.sender, _numTokens, "CrowdSale has not ended.");
		if (!wasSoftCapMet)
			return BurnTokensFailure(now, msg.sender, _numTokens, "SoftCap not met. Use .refund()");

		// If numTokens is too large, use their whole balance.
		// Error if no tokens to burn.
		uint _balance = token.balanceOf(msg.sender);
		uint _amtToBurn = _numTokens > _balance ? _balance : _numTokens;
		if (_amtToBurn == 0) {
			return BurnTokensFailure(now, msg.sender, _numTokens, "User has no tokens.");
		}

		// Burn user's tokens, and send bankroll to user
		// .removeFromBankroll will fail if unable to send.
		uint _burnRefund = _amtToBurn / 2;
		token.burn(msg.sender, _amtToBurn);
		treasury.removeReserve(_burnRefund, msg.sender);
		BurnTokensSuccess(now, msg.sender, _amtToBurn, _burnRefund);
	}

	// If softCap was not met, allow users to get full refund.
	function refund()
		public
	{
		// Ensure softCap not met, and user funded.
		require(wasSaleEnded && !wasSoftCapMet);
		require(amtFunded[msg.sender] > 0);
		// Send the user the amount they funded, or throw
		uint _amt = amtFunded[msg.sender];
		amtFunded[msg.sender] = 0;
		require(msg.sender.call.value(_amt)());
		UserRefunded(now, msg.sender, _amt);
	}

	// Callable any time Treasury.capitalNeeded() > 0
	//
	// This mints tokens and dilutes everyone, including owners.
	// This aligns the owners with investors: there's no reason to 
	// raise capital unless it is needed.
	//
	// For each 1 Ether received:
	//  - will issue 1 Token to the sender.
	//  - will allocate .5 ETH as reserve.
	//  - will allocate .5 ETH as capital.
	function fundCapital()
		public
		payable
	{
		if (!wasSaleEnded)
			return _errorBuyingTokens("Sale has not ended.");
		if (!wasSoftCapMet)
			return _errorBuyingTokens("SoftCap was not met.");
			
		// Cap _amount to the amount we need. Error if 0.
		uint _amtNeeded = capitalFundable();
		uint _amount = msg.value > _amtNeeded ? _amtNeeded : msg.value;
		if (_amount == 0) {
			return _errorBuyingTokens("No capital is needed.");
		}
		
		// Calculate how much goes to reserve and capital. (50/50)
		uint _reserve = _amount / 2;
		uint _capital = _amount - _reserve;

		// Mint tokens, send capital and reserve.
		token.mint(msg.sender, _amount);
		treasury.addCapital.value(_capital)();
		treasury.addReserve.value(_reserve)();
		BuyTokensSuccess(now, msg.sender, _amount, _amount);

		// Refund excess
		uint _refund = msg.value > _amount ? msg.value - _amount : 0;
		if (_refund > 0) {
			require(msg.sender.call.value(_refund)());
			UserRefunded(now, msg.sender, _refund);
		}
	}


	/*************************************************************/
	/********** PRIVATE ******************************************/
	/*************************************************************/

	// Called when user cannot buy tokens.
	// Returns nice error message and saves gas.
	function _errorBuyingTokens(string _reason)
		private
	{
		require(msg.sender.call.value(msg.value)());
		BuyTokensFailure(now, msg.sender, _reason);
	}


	/*************************************************************/
	/********** PUBLIC VIEWS *************************************/
	/*************************************************************/

	// Returns the amount of Ether that can be sent to ".fundCapital()"
	function capitalFundable()
		public
		view
		returns (uint _amt)
	{
		return treasury.capitalNeeded() * 2;
	}

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
			// Past HardCap. Return the full bonus amount, plus the rest
			_numTokens = (5*bonusCap/4) + (hardCap - bonusCap);
		} else if (_ethAmt > bonusCap) {
			// Past Bonus Period. Return the full bonus amount, plus the non-bonus amt.
			_numTokens = (5*bonusCap/4) + (_ethAmt - bonusCap);
		} else {
			// In Bonus period. Use a closed form integral to compute tokens.
			//
			//   First make a function for tokensPerEth:
			//      tokensPerEth(x) = 3/2 - x/(2c), where c is bonusCap
			//      Test: with c=20000: (0, 1.5), (10000, 1.25), (20000, 1)
			//   Next, create a closed form integral:
			//      integral(3/2 - x/(2c), x) = 3x/2 - x^2/(4c)
			//      Test: with c=20000: (0, 0), (10000, 13750), (20000, 25000)
			//
			// Note: if _ethAmt = bonusCap, _numTokens = (5*bonusCap)/4
			// Note: Overflows if _ethAmt^2 > 2^256, or ~3e38 Eth. Bonus Cap << 3e38
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


import "./DividendToken.sol";
import "./DividendTokenLocker.sol";