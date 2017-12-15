pragma solidity ^0.4.11;

import "./DividendToken.sol";
import "./DividendTokenLocker.sol";

/*
A Comptroller:

	- Accept ETH via .mintTokens()
	- Refund ETH via .burnTokens()
	- Ensuring PennyEtherTokenLocker has 20% of tokens.

Owner is able to set the treasury, once.	   

As the owner of Token contract, it is able to call:
	- token.mintTokens(address, amount)
	- token.burnTokens(address, amount) 

It should also be the owner of the Treasury, so it can call:
	- treasury.addToBankroll(amount) 
	- treasury.removeFromBankroll(amount)
*/
contract ITreasury {
	function comptroller() public constant returns(address);
	function addToBankroll() public payable;
	function removeFromBankroll(uint _amount, address _receiver) public;
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
	// How many tokens to issue per ETH
	uint public tokensPerEth = 1000 * (10 ** uint(token.decimals()));

	// events
	event TokensBought(address indexed sender, uint value, uint numTokens);
	event TokensBurnt(address indexed sender, uint numTokens, uint refund);

	function TokenCrowdSale() public {}

	// Allows owner to initialize the treasury one time.
	function initTreasury(address _treasury) public {
		require(msg.sender == owner);
		require(treasury == address(0));
		ITreasury _iTreasury = ITreasury(_treasury);
		require(_iTreasury.comptroller() == address(this));
		treasury = _iTreasury;
	}

	// Allows the sender to buy tokens.
	function buyTokens()
		public
		payable
		returns (uint _numTokens)
	{
		// min amount is 1GWei, and treasury must be initalized
		require(msg.value >= 1000000000);
		require(treasury != address(0));
		// 20% goes to the owner
		uint _capital = msg.value / 5;
		require(owner.call.value(_capital)());
		// 80% goes to the treasury bankroll
		uint _bankroll = msg.value - _capital;
		treasury.addToBankroll.value(_bankroll)();
		// mint tokens for the sender and locker
		_numTokens = (tokensPerEth * msg.value) / (1 ether);
		token.mintTokens(msg.sender, _numTokens);
		token.mintTokens(locker, _numTokens / 5);
		TokensBought(msg.sender, msg.value, _numTokens);
		return;
	}

	function burnTokens(uint _numTokens)
		public
	{
		// If number is too large, use their whole balance.
		if (_numTokens > token.balanceOf(msg.sender))
			_numTokens = token.balanceOf(msg.sender);
		// ensure a minimum of 1GWei
		uint _wei = (_numTokens / tokensPerEth) * (1 ether);
		require(_wei >= 1000000000);
		// burn the tokens for sender, and for locker.
		token.burnTokens(msg.sender, _numTokens);
		token.burnTokens(locker, _numTokens / 5);
		treasury.removeFromBankroll(_wei, msg.sender);
		TokensBurnt(msg.sender, _numTokens, _wei);
	}
}
