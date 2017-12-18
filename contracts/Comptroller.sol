pragma solidity ^0.4.11;

import "./DividendToken.sol";
import "./DividendTokenLocker.sol";

/*
A Comptroller:

	- Accepts ETH via .mintTokens()
	- Refunds ETH via .burnTokens()
	- Ensures PennyEtherTokenLocker has 20% of tokens.   

As the owner of Token contract, it is able to call:
	- token.mintTokens(address, amount)
	- token.burnTokens(address, amount) 

It should also be the owner of the Treasury, so it can call:
	- treasury.addToBankroll(amount) 
	- treasury.removeFromBankroll(amount)

The treasury can be set by the owner, once.
*/
contract ITreasury {
	function comptroller() public constant returns(address);
	function addToBankroll() public payable;
	function removeFromBankroll(uint _amount) public;
}
contract Comptroller {
	// Location of the treasury
	ITreasury public treasury;
	// Owner that can initialize the Treasury
	// And that gets sent ETH capital
	address public owner = msg.sender;
	// Token contract that can mint / burn tokens
	DividendToken public token = new DividendToken();
	// Locker that holds PennyEther's tokens.
	DividendTokenLocker public locker = new DividendTokenLocker(token, owner);
	// 1 ETH gets 1000 full tokens, so 1 Wei gets that divided by WeiPerEth.
	uint public tokensPerWei = 1000 * (10 ** uint(token.decimals())) / (1 ether);

	// events
	event TokensBought(address indexed sender, uint value, uint numTokens);
	event TokensBurnt(address indexed sender, uint numTokens, uint refund);

	function Comptroller() public {
		// the locker will always own at least 1 token.
		// this way, if nobody buys tokens, locker gets all profits.
		token.mintTokens(locker, 1);
	}

	// Only accept payment from Treasury
	// This hapens in burnTokens when we call .removeFromBankroll()
	function () payable {
		require(msg.sender == address(treasury));
	}

	// Allows owner to initialize the treasury one time.
	function initTreasury(address _treasury) public {
		require(msg.sender == owner);
		require(treasury == address(0));
		require(ITreasury(_treasury).comptroller() == address(this));
		treasury = ITreasury(_treasury);
	}

	// Allows the sender to buy tokens.
	function buyTokens()
		public
		payable
		returns (uint _numTokens)
	{
		// ensure treasuy exists, limit rounding errors
		require(treasury != address(0));
		require(msg.value >= 1000000000);
		// 20% goes to the owner
		uint _capital = msg.value / 5;
		require(owner.call.value(_capital)());
		// 80% goes to the treasury bankroll
		uint _bankroll = msg.value - _capital;
		treasury.addToBankroll.value(_bankroll)();
		// mint tokens for the sender and locker
		_numTokens = msg.value * tokensPerWei;
		token.mintTokens(msg.sender, _numTokens);
		token.mintTokens(locker, _numTokens / 5);
		TokensBought(msg.sender, msg.value, _numTokens);
		return;
	}

	function burnTokens(uint _numTokens)
		public
	{
		// If number is too large, use their whole balance.
		require(treasury != address(0));
		if (_numTokens > token.balanceOf(msg.sender))
			_numTokens = token.balanceOf(msg.sender);
		// should get back 80% of wei.
		// if treasury cannot afford, lower number of tokens to burn.
		uint _wei = (4 * _numTokens) / (5 * tokensPerWei);
		if (treasury.balance < _wei){
			_wei = treasury.balance;
			_numTokens = (5 *_wei * tokensPerWei) / 4;
		}
		// burn the tokens for sender, and for locker.
		require(_wei >= 1000000000);
		token.burnTokens(msg.sender, _numTokens);
		token.burnTokens(locker, _numTokens / 5);
		// remove from bankroll (this pays us), and send to user.
		treasury.removeFromBankroll(_wei);
		require(msg.sender.call.value(_wei)());
		TokensBurnt(msg.sender, _numTokens, _wei);
	}
}
