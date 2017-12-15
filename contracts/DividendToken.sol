pragma solidity ^0.4.11;

contract DividendToken {
	// Comptroller can call .mintTokens() and .burnTokens().
	address public comptroller = msg.sender;
	modifier onlyComptroller(){ require(msg.sender==comptroller); _; }

	/* STANDARD ERC20 TOKEN */
	string public name = "PennyEther";
	string public symbol = "BID";
	uint8 public decimals = 18;
	uint public totalSupply;
	event Transfer(address indexed from, address indexed to, uint amount);
	event Approval(address indexed owner, address indexed spender, uint amount);

	// non public state variables
	mapping (address => uint) balances;
	mapping (address => mapping (address => uint)) allowed;
	event TransferFrom(address indexed spender, address indexed from, address indexed to, uint amount);

	// How dividends work.
	//
	// - A "point" is a fraction of a Wei, it's used to reduce rounding errors.
	//
	// - Each time a new deposit is made, totalPointsPerToken is incremented by
	//             (depositAmtInWei * POINTS_PER_WEI) / totalSupply
	//   totalPointsPerToken represents how many points each token is entitled to
	//   from all the dividends ever received.
	//
	// - Each account has a `lastPointsPerToken` value, which stores the state of 
	//   `totalPointsPerToken` the last time that user was credited points. A user
	//	 can be credited (`totalPointsPerToken` - `lastPointsPerToken`) * balance.
	//
	// - .updateCreditedPoints(_account) will increment creditedPoints[account]
	//   by the points they are owed.  It then sets lastPointsPerToken[account]
	//   to the current totalPointsPerToken, so they will only be credited for
	//	 future dividends.  This is called before an account balance changes
	//	 (transfer, mint, burn), or before .collectDividends() is called.
	//
	// - When a user collects, creditedPoints are converter to wei, and paid.
	uint constant POINTS_PER_WEI = 1e32;
	uint public totalDividends;
	uint public collectedDividends;
	uint public totalPointsPerToken;
	mapping (address => uint) public creditedPoints;
	mapping (address => uint) public lastPointsPerToken;
	event CollectedDividends(address indexed account, uint amount);
	event DividendReceived(address indexed sender, uint amount);

	function DividendToken() public {}

	// Upon receiving payment, increment lastPointsPerToken.
	function () payable public {
		// POINTS_PER_WEI is 1e32 -- no overflow unless we get 1e45 wei (1e27 ETH)
		totalPointsPerToken += (msg.value * POINTS_PER_WEI) / totalSupply;
		totalDividends += msg.value;
		DividendReceived(msg.sender, msg.value);
	}

	// ERC20
	function transfer(address _to, uint _value)
		public
	{
		_transfer(msg.sender, _to, _value);
	}

	// ERC20
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
	function approve(address _spender, uint _value)
		public
		returns (bool success)
	{
		allowed[msg.sender][_spender] = _value;
		Approval(msg.sender, _spender, _value);
		return true;
	}

	// ERC20
	function allowance(address _owner, address _spender)
		public
		constant
		returns (uint remaining)
	{
		return allowed[_owner][_spender];
	}

	// ERC20
	function balanceOf(address _owner)
		public
		constant
		returns (uint balance)
	{
		return balances[_owner];
	}

	// Callable by comptroller, adds tokens to a balance.
	// It first credits them with whatever points are owed.
	function mintTokens(address _to, uint _amount)
		onlyComptroller
		public
	{
		updateCreditedPoints(_to);
		totalSupply += _amount;
		balances[_to] += _amount;
	}
	
	// Callable by comptroller, removes tokens from a balance.
	// It first credits them with whatever points are owed.
	function burnTokens(address _account, uint _amount)
	    onlyComptroller
	    public
	{
	    require(balances[_account] >= _amount);
	    updateCreditedPoints(_account);
	    balances[_account] -= _amount;
	    totalSupply -= _amount;
	}

	// Normal ERC20 transfer, except before transferring
	// it credits points for the sender and receiver.
	function _transfer(address _from, address _to, uint _value)
		private
	{
		// check for overflow and for sufficient funds
		require(balances[_to] + _value > balances[_to]);
		require(balances[_from] >= _value);
		
		// Credit _to and _from with dividends before transferring.
		// See: updatedCreditedPoints() for more info.
		updateCreditedPoints(_to);
		updateCreditedPoints(_from);
		balances[_from] -= _value;
		balances[_to] += _value;
		Transfer(_from, _to, _value);
	}

	// Updates creditedPoints, sends all wei to the owner
	function collectDividends()
		public
	{
		// update creditedPoints, store amount, and zero it.
		updateCreditedPoints(msg.sender);
		uint _amount = creditedPoints[msg.sender] / POINTS_PER_WEI;
		creditedPoints[msg.sender] = 0;
		CollectedDividends(msg.sender, _amount);
		msg.sender.transfer(_amount);
	}

	// Credits _account with whatever dividend points they haven't yet been credited.
	// This needs to be called before a user's balance changes to ensure their
	// "lastPointsPerToken" is always accurate.  If this isn't called, a user
	// could simply transfer a large amount of tokens and receive lots of points
	// (or conversely transfer out tokens and receive no dividend).
	function updateCreditedPoints(address _account)
		private
	{
		creditedPoints[_account] += getUncreditedPoints(_account);
		lastPointsPerToken[_account] = totalPointsPerToken;
	}

	// For a given account, returns how many Wei they haven't yet been credited.
	function getUncreditedPoints(address _account)
		private
		constant
		returns (uint _amount)
	{
		uint _pointsPerToken = totalPointsPerToken - lastPointsPerToken[_account];
		return _pointsPerToken * balances[_account];
	}

	// Returns how many wei a call to .collectDividends() would transfer.
	function getCollectableDividends(address _account)
		public
		constant
		returns (uint _amount)
	{
		return (getUncreditedPoints(_account) + creditedPoints[_account])/POINTS_PER_WEI;
	}
}