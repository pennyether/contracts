pragma solidity ^0.4.11;

contract TokenCrowdSale {
	Token public token;
	uint public tokensPerEth = 2000;
	address public owner;

	event BoughtTokens(address _account, uint _wei, uint _tokens);
	modifier fromOwner(){ require(msg.sender==owner); _; }

	function TokenCrowdSale() public {
		owner = msg.sender;
		token = new Token();
	}

	function buyTokens()
		public
		payable
		returns (uint _amount)
	{
		_amount = (tokensPerEth * msg.value * (10 ** uint(token.decimals()))) / 1e18;
		token.mintTokens(msg.sender, _amount);
		BoughtTokens(msg.sender, msg.value, _amount);
		return;
	}

	function stopSale()
		public
		fromOwner
	{
		token.stopMinting();
	}
}

contract Token {
	// standard ERC20 fields
	string public name = "PennyEther";
	string public symbol = "BID";
	uint8 public decimals = 18;
	uint public totalSupply;
	event Transfer(address indexed _from, address indexed _to, uint _value);
	event Approval(address indexed _owner, address indexed _spender, uint _value);

	// non ERC20 fields and events
	mapping (address => uint) balances;
	mapping (address => mapping (address => uint)) allowed;
	event TransferFrom(address indexed _spender, address indexed _from, address indexed _to, uint _value);

	// Dividends work as follows:
	// Each time a new deposit is made, totalWeiPerToken is incremented
	// based on the dividendAmount/totalSupply.
	// A user is credited tokens based on totalWeiPerToken - lastWeiPerToken
	// times their current balance.
	// Before any user's balance is changed, they are credited dividends
	// and their lastWeiPerToken is updated to totalWeiPerToken.
	uint constant BIG_NUMBER = 10e32;
	uint public totalDividends;
	uint public collectedDividends;
	uint public totalWeiPerToken;
	mapping (address => uint) creditedDividends;
	mapping (address => uint) lastWeiPerToken;
	event CollectDividendsSuccess(address indexed _account, uint _amount);
	event CollectDividendsFailure(address indexed _account, uint _amount);
	event DividendReceived(address indexed _from, uint _amount);

	// crowdSale
	bool isMinting;
	address crowdSale;
	modifier fromCrowdSale() { require(msg.sender == crowdSale); _; }

	function Token() public {
		crowdSale = msg.sender;
		isMinting = true;
	}

	// Upon receiving payment, increment totalWeiPerToken.
	// Do not do this during minting.
	function () payable {
		require(!isMinting);
		totalDividends += msg.value;
		totalWeiPerToken += (msg.value * BIG_NUMBER) / totalSupply;
		DividendReceived(msg.sender, msg.value);
	}

	function stopMinting()
		fromCrowdSale
		public
	{
		isMinting = false;
	}

	function mintTokens(address _to, uint _amount)
		fromCrowdSale
		public
	{
		totalSupply += _amount;
		balances[_to] += _amount;
	}

	// Updates creditedDividends and token balances.
	function _transfer(address _from, address _to, uint _value)
		private
	{
		// check for overflow and for sufficient funds
		require(balances[_to] + _value > balances[_to]);
		require(balances[_from] >= _value);
		
		// Credit _to and _from with dividends before transferring.
		// See: updatedCreditedDividends() for more info.
		updateCreditedDividends(_to);
		updateCreditedDividends(_from);
		balances[_from] -= _value;
		balances[_to] += _value;
		Transfer(_from, _to, _value);
	}

	// Credits _account with whatever dividends they haven't yet been credited.
	// This needs to be called before a user's balance changes to ensure the
	// "totalWeiPerToken - lastWeiPerToken" is accurate.  If this isn't called,
	// a user could simply transfer a large amount of tokens and receive
	// a large dividend (or conversely transfer out tokens and receive no dividend).
	function updateCreditedDividends(address _account)
		private
	{
		creditedDividends[_account] += getUncreditedDividends(_account);
		lastWeiPerToken[_account] = totalWeiPerToken;
	}

	// Redeems the dividends owed to the sender.
	function collectDividends()
		public
		returns (bool _success)
	{
		// update creditedDividends, store amount, and zero it.
		updateCreditedDividends(msg.sender);
		uint _amount = creditedDividends[msg.sender];
		creditedDividends[msg.sender] = 0;

		// Try to send to msg.sender using full gas.
		// Rollback on failure.
		if (msg.sender.call.value(_amount)()) {
			collectedDividends += _amount;
			CollectDividendsSuccess(msg.sender, _amount);
			return true;
		} else {
			creditedDividends[msg.sender] = _amount;
			CollectDividendsFailure(msg.sender, _amount);
			return false;
		}
	}

	// ERC20
	function transfer(address _to, uint _value)
		public
	{
		_transfer(msg.sender, _to, _value);
	}

	// ERC20
	// Sends _from's tokens to _to, provided msg.spender has an allowance.
	function transferFrom(address _from, address _to, uint256 _value)
		public
		returns (bool success)
	{
		require(allowed[_from][msg.sender] >= _value);
		allowed[_from][msg.sender] -= _value;
		TransferFrom(msg.sender, _from, _to, _value);
		_transfer(_from, _to, _value);
		return true;
	}

	// ERC20
	// Sets an allowance for _spender to spend msg.sender's tokens.
	function approve(address _spender, uint _value)
		public
		returns (bool success)
	{
		allowed[msg.sender][_spender] = _value;
		Approval(msg.sender, _spender, _value);
		return true;
	}

	// ERC20
	// Returns how much of _owner's balance can be spent by _spender
	function allowance(address _owner, address _spender)
		public
		returns (uint remaining)
	{
		return allowed[_owner][_spender];
	}

	// ERC20
	// Returns how many tokens _owner has
	function balanceOf(address _owner)
		constant
		returns (uint balance)
	{
		return balances[_owner];
	}

	// For a given account, returns how many Wei they haven't yet been credited.
	function getUncreditedDividends(address _account)
		private
		constant
		returns (uint _amount)
	{
		uint _weiPerToken = totalWeiPerToken - lastWeiPerToken[_account];
		return (_weiPerToken * balances[_account]) / BIG_NUMBER;
	}

	// Returns how many wei a call to .collectDividends() would transfer.
	function getCollectableDividends(address _account)
		public
		constant
		returns (uint _amount)
	{
		return getUncreditedDividends(_account) + creditedDividends[_account];
	}
}
