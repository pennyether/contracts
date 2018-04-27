pragma solidity ^0.4.23;

/*
    Exposes the following internal methods:
        - _useFromDailyLimit(uint)
        - _setDailyLimit(uint)
        - getDailyLimit()
        - getDailyLimitUsed()
        - getDailyLimitUnused()
*/
contract HasDailyLimit {
    // squeeze all vars into one storage slot.
    struct DailyLimitVars {
        uint112 dailyLimit; // Up to 5e15 * 1e18.
        uint112 usedToday;  // Up to 5e15 * 1e18.
        uint32 lastDay;     // Up to the year 11,000,000 AD
    }
    DailyLimitVars private vars;
    uint constant MAX_ALLOWED = 2**112 - 1;

    constructor(uint _limit) public {
        _setDailyLimit(_limit);
    }

    // Sets the daily limit.
    function _setDailyLimit(uint _limit) internal {
        require(_limit <= MAX_ALLOWED);
        vars.dailyLimit = uint112(_limit);
    }

    // Uses the requested amount if its within limit. Or throws.
    // You should use getDailyLimitRemaining() before calling this.
    function _useFromDailyLimit(uint _amount) internal {
        uint _remaining = updateAndGetRemaining();
        require(_amount <= _remaining);
        vars.usedToday += uint112(_amount);
    }

    // If necessary, resets the day's usage.
    // Then returns the amount remaining for today.
    function updateAndGetRemaining() private returns (uint _amtRemaining) {
        if (today() > vars.lastDay) {
            vars.usedToday = 0;
            vars.lastDay = today();
        }
        uint112 _usedToday = vars.usedToday;
        uint112 _dailyLimit = vars.dailyLimit;
        // This could be negative if _dailyLimit was reduced.
        return uint(_usedToday >= _dailyLimit ? 0 : _dailyLimit - _usedToday);
    }

    // Returns the current day.
    function today() private view returns (uint32) {
        return uint32(block.timestamp / 1 days);
    }


    /////////////////////////////////////////////////////////////////
    ////////////// PUBLIC VIEWS /////////////////////////////////////
    /////////////////////////////////////////////////////////////////

    function getDailyLimit() public view returns (uint) {
        return uint(vars.dailyLimit);
    }
    function getDailyLimitUsed() public view returns (uint) {
        return uint(today() > vars.lastDay ? 0 : vars.usedToday);
    }
    function getDailyLimitRemaining() public view returns (uint) {
        uint _used = getDailyLimitUsed();
        return uint(_used >= vars.dailyLimit ? 0 : vars.dailyLimit - _used);
    }
}