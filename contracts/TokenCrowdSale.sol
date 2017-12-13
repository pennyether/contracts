pragma solidity ^0.4.11;

import "./Token.sol";

contract TokenCrowdSale {
	Token public token = new Token();
	uint public tokensPerEth = 500;
	address public owner = msg.sender;

	event BuyTokensSuccess(address indexed sender, uint value, uint tokens);
	event BuyTokensFailure(address indexed sender, uint value, string reason);

	function TokenCrowdSale() public {}

	function buyTokens()
		public
		payable
		returns (uint _amount)
	{
		// tokensPerEth * 10 ** token.decimals() is: 1e4 + 1e18 = 1e22.
		// Unless they send 1e55 wei (1e37 ETH), there's no chance of an overflow.
		_amount = (tokensPerEth * msg.value * (10 ** uint(token.decimals()))) / 1e18;
		token.mintTokens(msg.sender, _amount);
		BuyTokensSuccess(msg.sender, msg.value, _amount);
		return;
	}

	function stopSale()
		public
	{
		require(msg.sender == owner);
		token.stopMinting();
	}
}
