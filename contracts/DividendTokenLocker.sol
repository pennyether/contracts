pragma solidity ^0.4.23;

/*********************************************************
*************** DIVIDEND TOKEN LOCKER ********************
**********************************************************

This contract holds a balance of tokens and enforces that
the balance of tokens is always above the amount that has
not yet vested. All dividends are always collectable.

Owner Permissions:
    - to collect all dividends
    - to transfer tokens, such that some minimum balance
      is maintained, as defined by the vesting parameters

Comptroller Permissions:
    - Specifies the token and owner
    - Specifies the amount to vest, and over what period
*/
contract IDividendToken {
    function collectOwedDividends() external returns (uint);
    function transfer(address _to, uint _value) external;
    function balanceOf(address _addr) external view returns (uint);
}
contract DividendTokenLocker {
    // set in the constructor
    address public comptroller;
    address public owner;
    IDividendToken public token;
    // set by comptroller via .setVesting()
    uint public vestingAmt;
    uint public vestingStartDay;
    uint public vestingDays;

    // events, for transparency
    event Created(uint time, address comptroller, address token, address owner);
    event VestingStarted(uint time, uint numTokens, uint vestingDays);
    event Transferred(uint time, address recipient, uint numTokens);
    event Collected(uint time, address recipient, uint amount);
    
    // Initialize the comptroller, token, and owner addresses.
    constructor(address _token, address _owner)
        public
    {
        comptroller = msg.sender;
        token = IDividendToken(_token);
        owner = _owner;
        emit Created(now, comptroller, token, owner);
    }

    // Allow this contract to get sent Ether (eg, dividendsOwed)
    function () payable public {}


    /***************************************************/
    /*********** CREATOR FUNCTIONS *********************/
    /***************************************************/

    // Starts the vesting process for the current balance.
    // TokenLocker will ensure a minimum balance is maintained
    //  based off of the vestingAmt and vestingDays.
    function startVesting(uint _numTokens, uint _vestingDays)
        public
    {
        require(msg.sender == comptroller);
        vestingAmt = _numTokens;
        vestingStartDay = _today();
        vestingDays = _vestingDays;
        emit VestingStarted(now, _numTokens, _vestingDays);
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
        uint _amount = address(this).balance;

        // Send amount (if any), emit event.
        if (_amount > 0) require(owner.call.value(_amount)());
        emit Collected(now, owner, _amount);
    }

    // Allows the owner to transfer tokens, such that the
    //  balance of tokens cannot go below getMinTokenBalance().
    function transfer(address _to, uint _numTokens)
        public
    {
        require(msg.sender == owner);
        uint _available = tokensAvailable();
        if (_numTokens > _available) _numTokens = _available;

        // Transfer (if _numTokens > 0), and emit event.
        if (_numTokens > 0) {
            token.transfer(_to, _numTokens);
        }
        emit Transferred(now, _to, _numTokens);
    }


    /***************************************************/
    /*********** VIEWS *********************************/
    /***************************************************/

    function tokens()
        public
        view
        returns (uint)
    {
        return token.balanceOf(this);
    }

    // Returns the minimum allowed tokenBalance.
    // Starts at vestingAmt, goes to 0 after vestingDays.
    function tokensUnvested()
        public
        view
        returns (uint)
    {
        return vestingAmt - tokensVested();
    }

    // Returns how many tokens have vested.
    // Starts at 0, goes to vestingAmt after vestingDays.
    function tokensVested()
        public
        view
        returns (uint)
    {
        uint _daysElapsed = _today() - vestingStartDay;
        return _daysElapsed >= vestingDays
            ? vestingAmt
            : (vestingAmt * _daysElapsed) / vestingDays;
    }

    // Returns the amount of tokens available to be transferred.
    // This is the balance, minus how many tokens must be maintained due to vesting.
    function tokensAvailable()
        public
        view
        returns (uint)
    {
        // token.balanceOf() and getMinTokenBalance() can never be greater than
        //   all the Ether in the world, so we dont worry about overflow.
        int _available = int(tokens()) - int(tokensUnvested());
        return _available > 0 ? uint(_available) : 0;
    }

    // Returns the current day.
    function _today()
        private 
        view 
        returns (uint)
    {
        return now / 1 days;
    }
}