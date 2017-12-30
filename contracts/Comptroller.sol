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
	function comptroller() public constant returns(address);
	function addToBankroll() public payable;
	function removeFromBankroll(uint _amount) public;
}
contract Comptroller {
	// Location of the treasury, once set, cannot change.
	_ICompTreasury public treasury;
	// Owner can call .initTreasury and .initSale
	address public owner;
	// Token contract that can mint / burn tokens
	DividendToken public token = new DividendToken();
	// Locker that holds PennyEther's tokens.
	DividendTokenLocker public locker;
	// 1 ETH gets 1 full token
	uint public tokensPerWei = 1 * (10 ** uint(token.decimals())) / (1 ether);
	// Once set to true, cannot be set to false
	bool public isSaleStarted;

	modifier fromOwner() { require(msg.sender==owner); _; }

	// events
	event TokensBought(address indexed sender, uint value, uint numTokens);
	event TokensBurned(address indexed sender, uint numTokens, uint refund);
	event TreasuryInit(address treasury);
	event SaleStarted(uint time);

	function Comptroller(address _owner)
		public
	{
		// Give the owner 1e-18 token, so he starts with 100% ownership.
		owner = _owner;
		locker = new DividendTokenLocker(token, _owner);
		token.mintTokens(locker, 1);
	}

	// Comptroller will receive from Treasury upon removing bankroll.
	// This happens in .burnTokens() when we call .removeFromBankroll()
	function ()
		payable
		public
	{
		require(msg.sender == address(treasury));
	}

	/*************************************************************/
	/************ OWNER FUNCTIONS ********************************/
	/*************************************************************/
	// Callable once: Allows owner to initialize the treasury one time.
	function initTreasury(address _treasury)
		fromOwner
		public
	{
		require(treasury == address(0));
		treasury = _ICompTreasury(_treasury);
		require(treasury.comptroller() == address(this));
		TreasuryInit(treasury);
	}
	// Callable once: Allows tokens to be bought / burnt.
	function initSale()
		fromOwner
		public
	{
		require(msg.sender == owner);
		require(!isSaleStarted);
		require(treasury != address(0));
		isSaleStarted = true;
		SaleStarted(now);
	}


	/*************************************************************/
	/********** BUYING/BURNING TOKENS ****************************/
	/*************************************************************/
	// Allows the sender to buy tokens.
	// Must send units of GWei, nothing lower.
	function buyTokens()
		public
		payable
		returns (uint _numTokens)
	{
		// ensure sale has started, require GWei amount.
		require(isSaleStarted);
		require(msg.value % 1000000000 == 0);
		// 20% goes to the locker as capital
		uint _capital = msg.value / 5;
		require(locker.call.value(_capital)());
		// the rest goes to the treasury bankroll
		uint _bankroll = msg.value - _capital;
		treasury.addToBankroll.value(_bankroll)();
		// mint tokens for the sender and locker
		// units: (wei) * (tokens * wei^-1) = (tokens)
		_numTokens = msg.value * tokensPerWei;
		token.mintTokens(msg.sender, _numTokens);
		token.mintTokens(locker, _numTokens / 5);
		TokensBought(msg.sender, msg.value, _numTokens);
		return;
	}

	// Allows the sender to burn up to _numTokens
	//   - If the sender does not have that many tokens, will
	//     burn their entire balance.
	//   - If Treasury does not have sufficient balance, it will
	//     it will burn as much as possible.
	function burnTokens(uint _numTokens)
		public
	{
		// Ensure sale has started.
		require(isSaleStarted);
		// If number is too large, use their whole balance.
		if (_numTokens > token.balanceOf(msg.sender)) {
			_numTokens = token.balanceOf(msg.sender);
		}
		// Should get back 80% of wei.
		uint _wei = (4 * _numTokens) / (5 * tokensPerWei);
		// If Treasury can't afford, lower amount of tokens.
		if (treasury.balance < _wei){
			_wei = treasury.balance;
			_numTokens = (5 *_wei * tokensPerWei) / 4;
		}
		// Burn tokens, remove from bankroll, send to user.
		// Require a minimum of 1Gwei to limit rounding errors.
		require(_wei > 1000000000);
		token.burnTokens(msg.sender, _numTokens);
		token.burnTokens(locker, _numTokens / 5);
		treasury.removeFromBankroll(_wei);
		require(msg.sender.call.value(_wei)());
		TokensBurned(msg.sender, _numTokens, _wei);
	}
}
