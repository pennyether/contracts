pragma solidity ^0.4.23;

import "../common/Bankrollable.sol";
import "../roles/UsingAdmin.sol";


/*********************************************************
*********************** INSTADICE ************************
**********************************************************

This contract allows for users to wager a limited amount on then
outcome of a random "multiplier" between [minMultiple, maxMultiple]
whose probability distribution is inversely proportional the 
the multiple. Eg:, a 2x roll has a 5% chance, a 10x roll has
about a 10% chance, 50x: 2%, and so on.

The user wins if the actual rolled result is greater than or
equal to the multiple they chose. Otherwise, they've "busted"
and win nothing.

When a roll is "finalized", it means the result was determined
and the payout paid to the user if they won. Each time somebody 
rolls, their previous roll is finalized. Roll results are based
on blockhash, and since only the last 256 blockhashes are 
available (who knows why it is so limited...), the user must
finalize within 256 blocks or their roll loses.

Note:
    - all values of "multiple" are 100x, eg: 215 = 2.15x
    - values of multiple are precise to two decimals
    - house edge is taken by reducing the resolve multiplier
      by a small amount.
*/
contract RocketDice is
    Bankrollable,
    UsingAdmin
{
    struct User {
        uint32 id;
        uint32 r_id;
        uint32 r_block;
        uint64 r_bet;      // how much they bet (max 18 ETH)
        uint32 r_multiple; // multiple, times 100. eg: 125 = 1.25x, 18050 = 180.5x
        uint16 r_feeBips; // house edge at time of roll
    }

    // These stats are updated on each roll.
    struct Stats {
        uint32 numUsers;
        uint32 numRolls;
        uint96 totalWagered;
        uint96 totalWon;
    }
    
    // Admin controlled settings
    struct Settings {
        uint64 minBet;    //
        uint64 maxBet;    // 
        uint32 minMultiple; // multiple, times 100
        uint32 maxMultiple; // multiple, times 100
        uint16 feeBips;   // each bip is .01%, eg: 100 = 1% fee.
    }

    mapping (address => User) public users;
    Stats stats;
    Settings settings;
    uint8 constant public version = 1;
    
    // Admin events
    event Created(uint time);
    event SettingsChanged(uint time, address indexed admin);

    // Events
    event RollWagered(uint time, uint32 indexed id, address indexed user, uint bet, uint32 multiple, uint16 feeBips);
    event RollRefunded(uint time, address indexed user, string msg, uint bet, uint32 multiple);
    event RollFinalized(uint time, uint32 indexed id, address indexed user, uint32 result, uint payout);
    event PayoutError(uint time, string msg);

    constructor(address _registry)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        public
    {
        // initialize to normalize gas cost
        stats.totalWagered = 1;

        // default settings
        settings.maxBet = .3 ether;
        settings.minBet = .001 ether;
        settings.minMultiple = 101;
        settings.maxMultiple = 50000;
        settings.feeBips = 100;
        emit Created(now);
    }


    ///////////////////////////////////////////////////
    ////// ADMIN FUNCTIONS ////////////////////////////
    ///////////////////////////////////////////////////

    // Changes the settings
    function changeSettings(
        uint64 _minBet,
        uint64 _maxBet,
        uint16 _minMultiple,
        uint16 _maxMultiple,
        uint16 _feeBips
    )
        public
        fromAdmin
    {
        require(_minBet <= _maxBet);    // makes sense
        require(_maxBet <= .375 ether); // capped at (block reward - uncle reward)
        require(_minMultiple >= 101);   // 1.01x
        require(_maxMultiple <= 50000); // 500.00x
        require(_feeBips <= 500);      // max of 5%
        settings.minBet = _minBet;
        settings.maxBet = _maxBet;
        settings.minMultiple = _minMultiple;
        settings.maxMultiple = _maxMultiple;
        settings.feeBips = _feeBips;
        emit SettingsChanged(now, msg.sender);
    }
    

    ///////////////////////////////////////////////////
    ////// PUBLIC FUNCTIONS ///////////////////////////
    ///////////////////////////////////////////////////

    // Resolves the last roll for the user.
    // Then creates a new roll.
    // Gas:
    //    Total: 56k (new), or up to 44k (repeat)
    //    Overhead: 36k
    //       22k: tx overhead
    //        2k: SLOAD
    //        3k: execution
    //        2k: curMaxBet()
    //        5k: update stats
    //        2k: RollWagered event
    //    New User: 20k
    //       20k: create user
    //    Repeat User: 8k, 16k
    //        5k: update user
    //        3k: RollFinalized event
    //        8k: pay last roll
    function roll(uint32 _multiple)
        public
        payable
        returns (bool _success)
    {
        // Ensure bet and number are valid.
        if (!_validateBetOrRefund(_multiple)) return;

        // Ensure one bet per block.
        User memory _prevUser = users[msg.sender];
        if (_prevUser.r_block == uint32(block.number)){
            _errorAndRefund("Only one bet per block allowed.", msg.value, _multiple);
            return false;
        }

        // Create and write new user data before finalizing last roll
        Stats memory _stats = stats;
        User memory _newUser = User({
            id: _prevUser.id == 0 ? _stats.numUsers + 1 : _prevUser.id,
            r_id: _stats.numRolls + 1,
            r_block: uint32(block.number),
            r_bet: uint64(msg.value),
            r_multiple: _multiple,
            r_feeBips: settings.feeBips
        });
        users[msg.sender] = _newUser;

        // Finalize last roll, if there was one.
        // This will throw if user won, but we couldn't pay.
        if (_prevUser.r_block != 0) _finalizePreviousRoll(_prevUser, _stats);

        // Increment stats data
        _stats.numUsers = _prevUser.id == 0 ? _stats.numUsers + 1 : _stats.numUsers;
        _stats.numRolls = stats.numRolls + 1;
        _stats.totalWagered = stats.totalWagered + uint96(msg.value);
        stats = _stats;

        // Save user in one write.
        emit RollWagered(now, _newUser.r_id, msg.sender, msg.value, _newUser.r_multiple, _newUser.r_feeBips);
        return true;
    }

    // Finalizes the previous roll and pays out user if they won.
    // Gas: 45k
    //   21k: tx overhead
    //    1k: SLOADs
    //    2k: execution
    //    8k: send winnings
    //    5k: update user
    //    5k: update stats
    //    3k: RollFinalized event
    function payoutPreviousRoll()
        public
        returns (bool _success)
    {
        // Load last roll in one SLOAD.
        User memory _prevUser = users[msg.sender];
        // Error if on same block.
        if (_prevUser.r_block == uint32(block.number)){
            emit PayoutError(now, "Cannot payout roll on the same block");
            return false;
        }
        // Error if nothing to payout.
        if (_prevUser.r_block == 0){
            emit PayoutError(now, "No roll to pay out.");
            return false;
        }

        // Clear last roll data
        User storage _user = users[msg.sender];
        _user.r_id = 0;
        _user.r_block = 0;
        _user.r_bet = 0;
        _user.r_multiple = 0;
        _user.r_feeBips = 0;

        // Finalize previous roll and update stats
        Stats memory _stats = stats;
        _finalizePreviousRoll(_prevUser, _stats);
        stats.totalWon = _stats.totalWon;
        return true;
    }


    ////////////////////////////////////////////////////////
    ////// PRIVATE FUNCTIONS ///////////////////////////////
    ////////////////////////////////////////////////////////

    // Validates the bet, or refunds the user.
    function _validateBetOrRefund(uint32 _multiple)
        private
        returns (bool _isValid)
    {
        Settings memory _settings = settings;
        if (_multiple < _settings.minMultiple) {
            _errorAndRefund("Roll multiple too small.", msg.value, _multiple);
            return false;
        }
        if (_multiple > _settings.maxMultiple){
            _errorAndRefund("Roll multiple too large.", msg.value, _multiple);
            return false;
        }
        if (msg.value < _settings.minBet){
            _errorAndRefund("Bet too small.", msg.value, _multiple);
            return false;
        }
        if (msg.value > _settings.maxBet){
            _errorAndRefund("Bet too large.", msg.value, _multiple);
            return false;
        }
        if (msg.value > curMaxBet()){
            _errorAndRefund("May be unable to payout on a win.", msg.value, _multiple);
            return false;
        }
        return true;
    }

    // Finalizes the previous roll for the _user.
    // This will modify _stats, but not _user.
    // Throws if unable to pay user on a win.
    function _finalizePreviousRoll(User memory _user, Stats memory _stats)
        private
    {
        assert(_user.r_block != uint32(block.number));
        assert(_user.r_block != 0);
        
        // compute result and isWinner
        uint32 _multiple = computeMultiple(_user.r_block, _user.r_id, _user.r_feeBips);
        bool _isWinner = _multiple >= _user.r_multiple;
        uint _payout = (uint(_user.r_bet) * uint(_user.r_multiple)) / 100;
        if (_isWinner) {
            require(msg.sender.call.value(_payout)());
            _stats.totalWon += uint96(_payout);
        }
        // they won and we paid, or they lost. roll is finalized.
        emit RollFinalized(now, _user.r_id, msg.sender, _multiple, _isWinner ? _payout : 0);
    }

    // Only called from above.
    // Refunds user the full value, and logs an error
    function _errorAndRefund(string _msg, uint _bet, uint32 _multiple)
        private
    {
        require(msg.sender.call.value(msg.value)());
        emit RollRefunded(now, msg.sender, _msg, _bet, _multiple);
    }


    ///////////////////////////////////////////////////
    ////// PUBLIC VIEWS ///////////////////////////////
    ///////////////////////////////////////////////////

    // IMPLEMENTS: Bankrollable.getCollateral()
    // This contract has no collateral, as it pays out in near realtime.
    function getCollateral() public view returns (uint _amount) {
        return 0;
    }

    // IMPLEMENTS: Bankrollable.getWhitelistOwner()
    // Ensures contract always has at least bankroll + totalCredits.
    function getWhitelistOwner() public view returns (address _wlOwner)
    {
        return getAdmin();
    }

    // Returns the largest bet such that we could pay out 2 maximum wins.
    // The likelihood that 2 maximum bets (with highest payouts) are won
    //  within a short period of time are extremely low.
    function curMaxBet() public view returns (uint _amount) {
        uint _maxPayout = (2 * settings.maxMultiple) / 100;
        return bankrollAvailable() / _maxPayout;
    }

    // Return the less of settings.maxBet and curMaxBet()
    function effectiveMaxBet() public view returns (uint _amount) {
        uint _curMax = curMaxBet();
        return _curMax > settings.maxBet ? settings.maxBet : _curMax;
    }

    // Returns a 100 * multiple, where multiple is a number between [1, maxRand]
    // The probability of getting a multiple is inversely proportional to its value:
    //   eg: 33% chance of 3x, 10% chance of 10x, 5% chance of 20x, 1% chance of 100x
    //
    // The house fee is taken out of the multiple itself, eg, if a multiple would have
    //  been 10x, and fee is 1%, it will return 9.9x.
    //
    // If the provided block number is too far in the past, a result of 0 is returned.
    function computeMultiple(uint32 _blockNumber, uint32 _id, uint _feeBips)
        public
        view
        returns (uint32 _multiple)
    {
        // If blockhash is not available, return 0.
        bytes32 _blockHash = blockhash(_blockNumber);
        if (_blockHash == 0) { return 0; }

        // the precision used before doing division
        uint _precision = 1e12;
        // This is also the max multiplier, should be <= 1e6 to prevent overflow.
        // This is also the number of discrete possibilities.
        //  Since _maxRand >> maxMultiple, this is essentially continuous.
        uint _maxRand = 1e6;    
        // Create a random number between 1 and 1,000,000.
        // The lower the number, the higher the multiple.
        uint _rand = uint(keccak256(_blockHash, _id)) % _maxRand + 1;

        // Compute the payout multiple (times 100)
        // We can safely cast to uint32, since the max value for this is:
        //  100 * _maxRand = 1e8, which is < 2^32 = 4e9.
        return uint32(
            (uint(100) * _precision * uint(10000 - _feeBips) * _maxRand)
            /
              (uint(1) * _precision * uint(10000)            * _rand)
        );
    }

    // Expose all Stats /////////////////////////////////
    function numUsers() public view returns (uint32) {
        return stats.numUsers;
    }
    function numRolls() public view returns (uint32) {
        return stats.numRolls;
    }
    function totalWagered() public view returns (uint) {
        return stats.totalWagered;
    }
    function totalWon() public view returns (uint) {
        return stats.totalWon;
    }
    //////////////////////////////////////////////////////

    // Expose all Settings ///////////////////////////////
    function minBet() public view returns (uint) {
        return settings.minBet;
    }
    function maxBet() public view returns (uint) {
        return settings.maxBet;
    }
    function minMultiple() public view returns (uint32) {
        return settings.minMultiple;
    }
    function maxMultiple() public view returns (uint32) {
        return settings.maxMultiple;
    }
    function feeBips() public view returns (uint16) {
        return settings.feeBips;
    }
    //////////////////////////////////////////////////////

}