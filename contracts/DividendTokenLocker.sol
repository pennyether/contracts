pragma solidity ^0.4.19;

/*********************************************************
*************** DIVIDEND TOKEN LOCKER ********************
**********************************************************

This contract holds a balance of tokens, and allows the owner:
	- to collect all dividends
	- to transfer tokens, such that some minimum balance
	  is maintained, as defined by the vesting parameters

Notes:
	- Only the creator can specify the number of vesting days.
	- If additional tokens are added, they can be transferred.
*/
contract IDividendToken {
	function collectOwedDividends() public returns (uint);
	function transfer(address _to, uint _value) public;
	function balanceOf(address _addr) public returns (uint);
}
contract DividendTokenLocker {
	// set by creator in the constructor
	address public creator;
	address public owner;
	IDividendToken public token;
	// set by creator via .setVesting()
	uint public vestingAmt;
	uint public vestingStartDay;
	uint public vestingDays;

	// events, for transparency
	event Initialized(uint time, address creator, address token, address owner);
	event VestingStarted(uint time, uint numTokens, uint vestingDays);
	event Transferred(uint time, address recipient, uint numTokens);
	event Collected(uint time, address recipient, uint amount);
	
	// Initialize the creator, token, and owner addresses.
    function DividendTokenLocker(address _token, address _owner)
    	public
    {
    	creator = msg.sender;
		token = IDividendToken(_token);
		owner = _owner;
		Initialized(now, creator, token, owner);
	}

	// Allow this contract to get sent Ether (eg, dividendsOwed)
	function () payable public {}


	/***************************************************/
	/*********** CREATOR FUNCTIONS *********************/
	/***************************************************/

	// Starts the vesting process for the current balance.
	// TokenLocker will ensure a minimum balance is maintained
	//  based off of the vestingAmt and vestingDays.
	function startVesting(uint _vestingDays) {
		require(msg.sender == creator);
		uint _numTokens = token.balanceOf(this);
		vestingAmt = _numTokens;
		vestingStartDay = today();
		vestingDays = _vestingDays;
		VestingStarted(now, _numTokens, _vestingDays);
	}


	/***************************************************/
	/*********** OWNER FUNCTIONS ***********************/
	/***************************************************/

	// Allows the owner to collect the balance of this contract,
	//  including any owed dividends.
	function collect()
		public
	{
		require(msg.sender == owner);
		// Collect dividends, and get new balance.
		token.collectOwedDividends();
		uint _amount = this.balance;

		// Send amount (if any), emit event.
		if (_amount > 0){
			require(owner.call.value(_amount)());
		}
		Collected(now, owner, _amount);
	}

	// Allows the owner to transfer tokens, such that the
	//  balance of tokens cannot go below getMinTokenBalance().
	function transfer(address _to, uint _numTokens)
		public
	{
		require(msg.sender == owner);
		// token.balanceOf() and getMinTokenBalance() can never be greater than
		//   all the Ether in the world, so we dont worry about overflow.
		int _maxAllowed = int(token.balanceOf(this)) - int(getMinTokenBalance());

		// Set _maxAllowed and _numTokens to be 0 <= x <= balance
		if (_maxAllowed < 0) _maxAllowed = 0;
		if (_numTokens > uint(_maxAllowed)) _numTokens = uint(_maxAllowed);

		// Transfer (if _numTokens > 0), and emit event.
		if (_numTokens > 0) {
			token.transfer(_to, _numTokens);
		}
		Transferred(now, _to, _numTokens);
	}


	/***************************************************/
	/*********** VIEWS *********************************/
	/***************************************************/

	// Returns the minimum allowed tokenBalance.
	// Starts at vestingAmt, goes to 0 after vestingDays.
	function getMinTokenBalance()
		public
		view
		returns (uint)
	{
		return vestingAmt - getNumTokensVested();
	}

	// Returns how many tokens have vested.
	// Starts at 0, goes to vestingAmt after vestingDays.
	function getNumTokensVested()
		public
		view
		returns (uint)
	{
		uint _daysElapsed = today() - vestingStartDay;
		if (_daysElapsed >= vestingDays) return vestingAmt;
		else return (vestingAmt * _daysElapsed) / vestingDays;
	}

	// Returns the current day.
	function today()
  		private 
  		view 
  		returns (uint)
  	{
    	return now / 1 days;
  	}
}