pragma solidity ^0.4.19;

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
	event AllowanceSet(address indexed owner, address indexed spender, uint amount);
	event AllowanceUsed(address indexed owner, address indexed spender, uint amount);

	// non public state variables
	bool public isFrozen;	// if true, tokens cannot be transferred
	mapping (address => uint) balances;
	mapping (address => mapping (address => uint)) allowed;
	event TokensMinted(address indexed account, uint amount, uint newTotalSupply);
	event TokensBurned(address indexed account, uint amount, uint newTotalSupply);

	// How dividends work.
	//
	// - A "point" is a fraction of a Wei (1e-32), it's used to reduce rounding errors.
	//
	// - Each time a new deposit is made, totalPointsPerToken is incremented by
	//     (depositAmtInWei * POINTS_PER_WEI) / totalSupply
	//   totalPointsPerToken represents how many points each token is entitled to
	//   from all the dividends ever received.
	//
	// - Each account has a `lastPointsPerToken` value, which stores the state of 
	//   `totalPointsPerToken` the last time that user was credited points. A user
	//	 can be credited (`totalPointsPerToken` - `lastPointsPerToken`) * balance.
	//
	// - .updateCreditedPoints(_account) will increment creditedPoints[account]
	//   by the points they are (see above). It then sets lastPointsPerToken[account]
	//   to the current totalPointsPerToken, so they will only be credited for
	//	 future dividends. This is called before an account balance changes
	//	 (transfer, mint, burn), or before .collectOwedDividends() is called.
	//
	// - .updateCreditedPoints() is called anytime tokens are minted, burned,
	//   or transferred. This ensures dividends are not transferrable.
	//
	// - .collectOwedDividends() calls .updateCreditedPoints(), converts points
	//   to wei and pays account, then resets creditedPoints[account] to 0.
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
	function ()
		payable
		public
	{
		// POINTS_PER_WEI is 1e32 -- no overflow unless we get 1e45 wei (1e27 ETH)
		if (msg.value==0) return;
		totalPointsPerToken += (msg.value * POINTS_PER_WEI) / totalSupply;
		totalDividends += msg.value;
		DividendReceived(msg.sender, msg.value);
	}

	/*************************************************************/
	/********** ERC 20 FUNCTIONS *********************************/
	/*************************************************************/
	function transfer(address _to, uint _value)
		public
	{
		_transfer(msg.sender, _to, _value);
	}

	function transferFrom(address _from, address _to, uint256 _value)
		public
		returns (bool success)
	{
		require(allowed[_from][msg.sender] >= _value);
		allowed[_from][msg.sender] -= _value;
		AllowanceUsed(_from, msg.sender, _value);
		_transfer(_from, _to, _value);
		return true;
	}

	function approve(address _spender, uint _value)
		public
		returns (bool success)
	{
		allowed[msg.sender][_spender] = _value;
		AllowanceSet(msg.sender, _spender, _value);
		return true;
	}

	function allowance(address _owner, address _spender)
		public
		constant
		returns (uint remaining)
	{
		return allowed[_owner][_spender];
	}

	function balanceOf(address _addr)
		public
		constant
		returns (uint balance)
	{
		return balances[_addr];
	}


	/*************************************************************/
	/******* COMPTROLLER FUNCTIONS *******************************/
	/*************************************************************/
	// Credits dividends, then mints more tokens.
	function mintTokens(address _to, uint _amount)
		onlyComptroller
		public
	{
		updateCreditedPoints(_to);
		totalSupply += _amount;
		balances[_to] += _amount;
		TokensMinted(_to, _amount, totalSupply);
	}
	
	// Credits dividends, burns tokens.
	function burnTokens(address _account, uint _amount)
	    onlyComptroller
	    public
	{
		require(balances[_account] >= _amount);
		updateCreditedPoints(_account);
		balances[_account] -= _amount;
		totalSupply -= _amount;
		TokensBurned(_account, _amount, totalSupply);
	}

	function setFrozen(bool _isFrozen)
		onlyComptroller
		public
	{
		isFrozen = _isFrozen;
	}

	/*************************************************************/
	/********** OTHER PUBLIC FUNCTIONS ***************************/
	/*************************************************************/
	// Updates creditedPoints, sends all wei to the owner
	function collectOwedDividends()
		public
	{
		// update creditedPoints, store amount, and zero it.
		updateCreditedPoints(msg.sender);
		uint _amount = creditedPoints[msg.sender] / POINTS_PER_WEI;
		creditedPoints[msg.sender] = 0;
		collectedDividends += _amount;
		CollectedDividends(msg.sender, _amount);
		require(msg.sender.call.value(_amount)());
	}


	/*************************************************************/
	/********** PRIVATE FUNCTIONS ********************************/
	/*************************************************************/
	// Normal ERC20 transfer, except before transferring
	// it credits points for both the sender and receiver.
	function _transfer(address _from, address _to, uint _value)
		private
	{	
		// ensure tokens are not frozen.
		require(!isFrozen);
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

	// Credits _account with whatever dividend points they haven't yet been credited.
	// This needs to be called before any user's balance changes to ensure their
	// "lastPointsPerToken" credits their current balance, and not an altered one.
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
		// the upper bound on this number is:
		//   ((1e32 * DIVIDEND_AMT) / totalSupply) * balances[_account]
		// since totalSupply >= balances[_account], this will overflow only if
		//   DIVIDEND_AMT is around 1e45 wei. Not ever going to happen.
		return _pointsPerToken * balances[_account];
	}


	/*************************************************************/
	/********* CONSTANTS *****************************************/
	/*************************************************************/
	// Returns how many wei a call to .collectOwedDividends() would transfer.
	function getOwedDividends(address _account)
		public
		constant
		returns (uint _amount)
	{
		return (getUncreditedPoints(_account) + creditedPoints[_account])/POINTS_PER_WEI;
	}
}