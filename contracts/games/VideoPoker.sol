pragma solidity ^0.4.19;

import "./VideoPokerUtils.sol";
import "../Bankrollable.sol";
import "../roles/UsingAdmin.sol";

contract VideoPoker is
    VideoPokerUtils,
    Bankrollable,
    UsingAdmin
{
    // All the data needed for each game.
    struct Game {
        // [1st 256-bit block]
        uint32 userId;
        uint64 bet;         // max of 18 Ether (set on bet)
        uint16 payTableId;  // the PayTable used (set on bet)
        uint32 iBlock;      // initial hand block (set on bet)
        uint32 iHand;       // initial hand (set on draw/finalize)
        uint8 draws;        // bitmap of which cards to draw (set on draw/finalize)
        uint32 dBlock;      // block of the dHand (set on draw/finalize)
        uint32 dHand;       // hand after draws (set on finalize)
        uint8 handRank;     // result of the hand (set on finalize)
    }

    // These variables change on each bet and finalization.
    // We put them in a struct with the hopes that optimizer
    //   will do one write if any/all of them change.
    struct Vars {
        // [1st 256-bit block]
        uint32 curId;               // (changes on bet)
        uint64 totalWageredGwei;    // (changes on bet)
        uint32 curUserId;           // (changes on bet, maybe)
        uint128 empty1;             // intentionally left empty, so the below
                                    //   updates occur in the same update
        // [2nd 256-bit block]
        uint64 totalWonGwei;        // (changes on finalization win)
        uint88 totalCredits;        // (changes on finalization win)
        uint8 empty2;               // set to true to normalize gas cost
    }

    struct Settings {
        uint64 minBet;
        uint64 maxBet;
        uint16 curPayTableId;
        uint16 numPayTables;
    }

    Settings settings;
    Vars vars;

    // A Mapping of all games
    mapping(uint32 => Game) public games;
    
    // Credits we owe the user
    mapping(address => uint) public credits;

    // Store a two-way mapping of address <=> userId
    // If we've seen a user before, betting will be just 1 write
    //  per Game struct vs 2 writes.
    // The trade-off is 3 writes for new users. Seems fair.
    mapping (address => uint32) public userIds;
    mapping (uint32 => address) public userAddresses;

    // Note: Pay tables cannot be changed once added.
    // However, admin can change the current PayTable
    mapping(uint16=>uint16[12]) payTables;

    // version of the game
    uint8 public constant version = 1;
    uint8 constant WARN_IHAND_TIMEOUT = 1; // "Initial hand not available. Drawing 5 new cards."
    uint8 constant WARN_DHAND_TIMEOUT = 2; // "Draw cards not available. Using initial hand."
    uint8 constant WARN_BOTH_TIMEOUT = 3;  // "Draw cards not available, and no initial hand."
    
    // Admin Events
    event PayTableAdded(uint time, address admin, uint payTableId);
    event SettingsChanged(uint time, address admin);
    // Game Events
    event BetSuccess(uint time, address indexed user, uint32 indexed id, uint bet, uint payTableId, uint uiid);
    event BetFailure(uint time, address indexed user, uint bet, string msg);
    event DrawSuccess(uint time, address indexed user, uint32 indexed id, uint32 iHand, uint8 draws, uint8 warnCode);
    event DrawFailure(uint time, address indexed user, uint32 indexed id, uint8 draws, string msg);
    event FinalizeSuccess(uint time, address indexed user, uint32 indexed id, uint32 dHand, uint8 handRank, uint payout, uint8 warnCode);
    event FinalizeFailure(uint time, address indexed user, uint32 indexed id, string msg);
    // If _payout = true on finalization
    event PayoutSuccess(uint time, address indexed user, uint32 indexed id, uint amt);
    event PayoutFailure(uint time, address indexed user, uint32 indexed id, uint amt);
    // Credits
    event CreditsAdded(uint time, address indexed user, uint32 indexed id, uint amt);
    event CreditsUsed(uint time, address indexed user, uint32 indexed id, uint amt);
    event CreditsCashedout(uint time, address indexed user, uint amt);
        
    function VideoPoker(address _registry)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        public
    {
        // Add the default PayTable.
        _addPayTable(800, 50, 25, 9, 6, 4, 3, 2, 1);
        // write to vars, to lower gas-cost for the first game.
        vars.empty1 = 1;
        vars.empty2 = 1;
        // initialize settings
        settings.minBet = .001 ether;
        settings.maxBet = .5 ether;
    }
    
    
    /************************************************************/
    /******************** ADMIN FUNCTIONS ***********************/
    /************************************************************/
    
    // Allows admin to change minBet, maxBet, and curPayTableId
    function changeSettings(uint64 _minBet, uint64 _maxBet, uint8 _payTableId)
        public
        fromAdmin
    {
        require(_minBet <= _maxBet);
        require(_maxBet <= .625 ether);
        require(_payTableId < settings.numPayTables);
        settings.minBet = _minBet;
        settings.maxBet = _maxBet;
        settings.curPayTableId = _payTableId;
        SettingsChanged(now, msg.sender);
    }
    
    // Allows admin to permanently add a PayTable
    function addPayTable(
        uint16 _rf, uint16 _sf, uint16 _foak, uint16 _fh,
        uint16 _fl, uint16 _st, uint16 _toak, uint16 _tp, uint16 _jb
    )
        public
        fromAdmin
    {
        _addPayTable(_rf, _sf, _foak, _fh, _fl, _st, _toak, _tp, _jb);
        PayTableAdded(now, msg.sender, settings.numPayTables-1);
    }
    

    /************************************************************/
    /****************** PUBLIC FUNCTIONS ************************/
    /************************************************************/

    // Allows a user to add credits to their account.
    function addCredits()
        public
        payable
    {
        _creditUser(msg.sender, msg.value, 0);
    }

    // Allows the user to cashout an amt (or their whole balance)
    function cashOut(uint _amt)
        public
    {
        _uncreditUser(msg.sender, _amt);
    }

    // Allows a user to create a game from Ether sent.
    //
    // Gas Cost: 55k (prev player), 95k (new player)
    //   - 22k: tx overhead
    //   - 26k, 66k: see _createNewGame()
    //   -  3k: event
    //   -  2k: curMaxBet()
    //   -  2k: SLOAD, execution
    function bet(uint _uiid)
        public
        payable
    {
        uint _bet = msg.value;
        if (_bet > settings.maxBet)
            return _betFailure("Bet too large.", _bet, true);
        if (_bet < settings.minBet)
            return _betFailure("Bet too small.", _bet, true);
        if (_bet > curMaxBet())
            return _betFailure("The bankroll is too low.", _bet, true);

        // no uint64 overflow: _bet < maxBet < .625 ETH < 2e64
        uint32 _id = _createNewGame(uint64(_bet));
        BetSuccess(now, msg.sender, _id, _bet, settings.curPayTableId, _uiid);
    }

    // Allows a user to create a game from Credits.
    //
    // Gas Cost: 61k
    //   - 22k: tx overhead
    //   - 26k: see _createNewGame()
    //   -  3k: event
    //   -  2k: curMaxBet()
    //   -  2k: 1 event: CreditsUsed
    //   -  5k: update credits[user]
    //   -  1k: SLOAD, execution
    function betWithCredits(uint64 _bet, uint _uiid)
        public
    {
        if (_bet > settings.maxBet)
            return _betFailure("Bet too large.", _bet, false);
        if (_bet < settings.minBet)
            return _betFailure("Bet too small.", _bet, false);
        if (_bet > curMaxBet())
            return _betFailure("The bankroll is too low.", _bet, false);
        if (_bet > credits[msg.sender])
            return _betFailure("Insufficient credits", _bet, false);

        uint32 _id = _createNewGame(uint64(_bet));
        credits[msg.sender] -= _bet;
        CreditsUsed(now, msg.sender, _id, _bet);
        BetSuccess(now, msg.sender, _id, _bet, settings.curPayTableId, _uiid);
    }

    function betFromGame(uint32 _id, bytes32 _hashCheck, uint _uiid)
        public
    {
        bool _didFinalize = finalize(_id, _hashCheck);
        uint64 _bet = games[_id].bet;
        if (!_didFinalize)
            return _betFailure("Failed to finalize prior game.", _bet, false);
        betWithCredits(_bet, _uiid);
    }

        // Logs an error, and optionally refunds user the _bet
        function _betFailure(string _msg, uint _bet, bool _doRefund)
            private
        {
            if (_doRefund) require(msg.sender.call.value(_bet)());
            BetFailure(now, msg.sender, _bet, _msg);
        }
        

    // Resolves the initial hand (if possible) and sets the users draws.
    // Users cannot draw 0 cards. They should instead use finalize().
    //
    // Notes:
    //  - If user unable to resolve initial hand, sets draws to 5
    //  - This always sets game.dBlock
    //
    // Gas Cost: ~38k
    //   - 23k: tx
    //   - 13k: see _draw()
    //   -  2k: SLOADs, execution
    function draw(uint32 _id, uint8 _draws, bytes32 _hashCheck)
        public
    {
        Game storage _game = games[_id];
        address _user = userAddresses[_game.userId];
        if (_game.iBlock == 0)
            return _drawFailure(_id, _draws, "Invalid game Id.");
        if (_user != msg.sender)
            return _drawFailure(_id, _draws, "This is not your game.");
        if (_game.iBlock == block.number)
            return _drawFailure(_id, _draws, "Initial cards not available.");
        if (_game.dBlock != 0)
            return _drawFailure(_id, _draws, "Cards already drawn.");
        if (_draws > 31)
            return _drawFailure(_id, _draws, "Invalid draws.");
        if (_draws == 0)
            return _drawFailure(_id, _draws, "Cannot draw 0 cards. Use finalize instead.");
        if (_game.handRank != uint8(HandRank.Undefined))
            return _drawFailure(_id, _draws, "Game already finalized.");
        
        _draw(_game, _id, _draws, _hashCheck);
    }
        function _drawFailure(uint32 _id, uint8 _draws, string _msg)
            private
        {
            DrawFailure(now, msg.sender, _id, _draws, _msg);
        }
      

    // Callable any time after the initial hand. Will assume
    // no draws if called directly after new hand.
    //
    // Gas Cost: 44k (loss), 59k (win, has credits), 72k (win, no credits)
    //   - 22k: tx overhead
    //   - 21k, 36k, 49k: see _finalize()
    //   -  1k: SLOADs, execution
    function finalize(uint32 _id, bytes32 _hashCheck)
        public
        returns (bool _didFinalize)
    {
        Game storage _game = games[_id];
        address _user = userAddresses[_game.userId];
        if (_game.iBlock == 0)
            return _finalizeFailure(_id, "Invalid game Id.");
        if (_user != msg.sender)
            return _finalizeFailure(_id, "This is not your game.");
        if (_game.iBlock == block.number)
            return _finalizeFailure(_id, "Initial hand not avaiable.");
        if (_game.dBlock == block.number)
            return _finalizeFailure(_id, "Drawn cards not available.");
        if (_game.handRank != uint8(HandRank.Undefined))
            return _finalizeFailure(_id, "Game already finalized.");

        _finalize(_game, _id, _hashCheck);
        return true;
    }
        function _finalizeFailure(uint32 _id, string _msg)
            private
            returns (bool)
        {
            FinalizeFailure(now, msg.sender, _id, _msg);
            return false;
        }


    /************************************************************/
    /****************** PRIVATE FUNCTIONS ***********************/
    /************************************************************/

    // Appends a PayTable to the mapping.
    // It ensures sane values. (Double the defaults)
    function _addPayTable(
        uint16 _rf, uint16 _sf, uint16 _foak, uint16 _fh,
        uint16 _fl, uint16 _st, uint16 _toak, uint16 _tp, uint16 _jb
    )
        private
    {
        require(_rf<=1600 && _sf<=100 && _foak<=50 && _fh<=18 && _fl<=12 
                 && _st<=8 && _toak<=6 && _tp<=4 && _jb<=2);

        uint16[12] memory _pt;
        _pt[uint8(HandRank.Undefined)] = 0;
        _pt[uint8(HandRank.RoyalFlush)] = _rf;
        _pt[uint8(HandRank.StraightFlush)] = _sf;
        _pt[uint8(HandRank.FourOfAKind)] = _foak;
        _pt[uint8(HandRank.FullHouse)] = _fh;
        _pt[uint8(HandRank.Flush)] = _fl;
        _pt[uint8(HandRank.Straight)] = _st;
        _pt[uint8(HandRank.ThreeOfAKind)] = _toak;
        _pt[uint8(HandRank.TwoPair)] = _tp;
        _pt[uint8(HandRank.JacksOrBetter)] = _jb;
        _pt[uint8(HandRank.NotComputable)] = 0;
        payTables[settings.numPayTables] = _pt;
        settings.numPayTables++;
    }

    // Increases totalCredits and credits[user]
    // Optionally increases totalWonGwei stat.
    function _creditUser(address _user, uint _amt, uint32 _gameId)
        private
    {
        if (_amt == 0) return;
        uint88 _totalCredits = vars.totalCredits + uint88(_amt);
        uint64 _totalWonGwei = vars.totalWonGwei + uint64(_amt / 1e9);
        vars.totalCredits = _totalCredits;
        vars.totalWonGwei = _totalWonGwei;
        credits[_user] += _amt;
        CreditsAdded(now, _user, _gameId, _amt);
    }

    // Lowers totalCredits and credits[user].
    // Sends to user, using unlimited gas.
    function _uncreditUser(address _user, uint _amt)
        private
    {
        if (_amt > credits[_user]) _amt = credits[_user];
        if (_amt == 0) return;
        vars.totalCredits -= uint88(_amt);
        credits[_user] -= _amt;
        require(_user.call.value(_amt)());
        CreditsCashedout(now, _user, _amt);
    }

    // Creates a new game with the specified bet and current PayTable.
    // Does no validation of the _bet size.
    //
    // Gas Cost: 26k, 66k
    //   Overhead:
    //     - 20k: 1 writes: Game
    //     -  5k: 1 update: vars
    //     -  1k: SLOAD, execution
    //   New User:
    //     - 40k: 2 writes: userIds, userAddresses
    //   Repeat User:
    //     -  0k: nothing extra
    function _createNewGame(uint64 _bet)
        private
        returns (uint32 _curId)
    {
        // get or create user id
        uint32 _curUserId = vars.curUserId;
        uint32 _userId = userIds[msg.sender];
        if (_userId == 0) {
            _curUserId++;
            userIds[msg.sender] = _curUserId;
            userAddresses[_curUserId] = msg.sender;
            _userId = _curUserId;
        }

        // increment vars
        _curId =  vars.curId + 1;
        uint64 _totalWagered = vars.totalWageredGwei + _bet / 1e9;
        vars.curId = _curId;
        vars.totalWageredGwei = _totalWagered;
        vars.curUserId = _curUserId;

        // save game
        uint16 _payTableId = settings.curPayTableId;
        Game storage _game = games[_curId];
        _game.userId = _userId;
        _game.bet = _bet;
        _game.payTableId = _payTableId;
        _game.iBlock = uint32(block.number);
        return _curId;
    }

    // Gets initialHand, and stores .draws and .dBlock.
    // Gas Cost: 13k
    //   - 3k: getHand()
    //   - 5k: 1 update: iHand, draws, dBlock
    //   - 3k: event: DrawSuccess
    //   - 2k: SLOADs, other
    function _draw(Game storage _game, uint32 _id, uint8 _draws, bytes32 _hashCheck)
        private
    {
        // assert hand is not already drawn
        assert(_game.dBlock == 0);

        // Deal the initial hand, or set draws to 5.
        uint32 _iHand;
        bytes32 _iBlockHash = block.blockhash(_game.iBlock);
        uint8 _warnCode;
        if (_iBlockHash != 0) {
            // Ensure they are drawing against expected hand
            if (_iBlockHash != _hashCheck) {
                return _drawFailure(_id, _draws, "HashCheck Failed. Try refreshing game.");
            }
            _iHand = getHand(uint(keccak256(_iBlockHash, _id)));
        } else {
            _warnCode = WARN_IHAND_TIMEOUT;
            _draws = 31;
        }

        // update game
        _game.iHand = _iHand;
        _game.draws = _draws;
        _game.dBlock = uint32(block.number);

        DrawSuccess(now, msg.sender, _id, _game.iHand, _draws, _warnCode);
    }

    // Resolves game based on .iHand and .draws, crediting user on a win.
    // This always sets game.dHand and game.handRank.
    //
    // There are four possible scenarios:
    //   User draws N cads, and dBlock is fresh:
    //     - draw N cards into iHand, this is dHand
    //   User draws N cards, and dBlock is too old:
    //     - set dHand to iHand (note: iHand may be empty)
    //   User draws 0 cards, and iBlock is fresh:
    //     - draw 5 cards into iHand, set dHand to iHand
    //   User draws 0 cards, and iBlock is too old:
    //     - fail: set draws to 5, return. (user should call finalize again)
    //
    // Gas Cost: 21k loss, 36k win, 49k new win
    //   - 6k: if draws > 0: drawToHand()
    //   - 7k: getHandRank()
    //   - 5k: 1 update: Game
    //   - 2k: FinalizeSuccess
    //   - 1k: SLOADs, execution
    //   On Win: +13k, or +28k
    //   - 5k: 1 updates: totalCredits, totalWon
    //   - 5k or 20k: 1 update/write to credits[user]
    //   - 2k: event: AccountCredited
    //   - 1k: SLOADs, execution
    function _finalize(Game storage _game, uint32 _id, bytes32 _hashCheck)
        private
    {
        // Require game is not already finalized
        assert(_game.handRank == uint8(HandRank.Undefined));

        // Compute _dHand
        address _user = userAddresses[_game.userId];
        bytes32 _blockhash;
        uint32 _dHand;
        uint32 _iHand;  // set if draws are 0, and iBlock is fresh
        uint8 _warnCode;
        if (_game.draws != 0) {
            _blockhash = block.blockhash(_game.dBlock);
            if (_blockhash != 0) {
                // draw cards to iHand, use as dHand
                _dHand = drawToHand(uint(keccak256(_blockhash, _id)), _game.iHand, _game.draws);
            } else {
                // cannot draw any cards. use iHand.
                if (_game.iHand != 0){
                    _dHand = _game.iHand;
                    _warnCode = WARN_DHAND_TIMEOUT;
                } else {
                    _dHand = 0;
                    _warnCode = WARN_BOTH_TIMEOUT;
                }
            }
        } else {
            _blockhash = block.blockhash(_game.iBlock);
            if (_blockhash != 0) {
                // ensure they are drawing against expected hand
                if (_blockhash != _hashCheck) {
                    _finalizeFailure(_id, "HashCheck Failed. Try refreshing game.");
                    return;
                }
                // draw 5 cards into iHand, use as dHand
                _iHand = getHand(uint(keccak256(_blockhash, _id)));
                _dHand = _iHand;
            } else {
                // can't finalize with iHand. Draw 5 cards.
                _finalizeFailure(_id, "Initial hand not available. Drawing 5 new cards.");
                _game.draws = 31;
                _game.dBlock = uint32(block.number);
                DrawSuccess(now, _user, _id, 0, 31, WARN_IHAND_TIMEOUT);
                return;
            }
        }

        // Compute _handRank. be sure dHand is not empty
        uint8 _handRank = _dHand == 0
            ? uint8(HandRank.NotComputable)
            : uint8(getHandRank(_dHand));

        // This only happens if draws==0, and iHand was drawable.
        if (_iHand > 0) _game.iHand = _iHand;
        // Always set dHand and handRank
        _game.dHand = _dHand;
        _game.handRank = _handRank;

        // Compute _payout, credit user, emit event.
        uint _payout = payTables[_game.payTableId][_handRank] * uint(_game.bet);
        if (_payout > 0) _creditUser(_user, _payout, _id);
        FinalizeSuccess(now, _user, _id, _game.dHand, _game.handRank, _payout, _warnCode);
    }



    /************************************************************/
    /******************** PUBLIC VIEWS **************************/
    /************************************************************/

    // OVERRIDES: Fundable.getProfits()
    // Ensures contract always has at least bankroll + totalCredits.
    function getCollateral()
        public
        view
        returns (uint _amount)
    {
        return vars.totalCredits;
    }

    // Returns the largest bet such that we could pay out two RoyalFlushes.
    // The likelihood that two RoyalFlushes (with max bet size) are 
    //  won within a 255 block period is extremely low.
    function curMaxBet() public view returns (uint) {
        // Return largest bet such that RF*2*bet = bankrollable
        uint _maxPayout = payTables[settings.curPayTableId][uint(HandRank.RoyalFlush)] * 2;
        return getAvailableBankroll() / _maxPayout;
    }

    function getPayTable(uint16 _payTableId)
        public
        view
        returns (uint16[12])
    {
        require(_payTableId < settings.numPayTables);
        return payTables[_payTableId];
    }

    function getCurPayTable()
        public
        view
        returns (uint16[12])
    {
        return getPayTable(settings.curPayTableId);
    }

    // Gets the initial hand of a game.
    function getIHand(uint32 _id)
        public
        view
        returns (uint32)
    {
        Game memory _game = games[_id];
        if (_game.iHand != 0) return _game.iHand;
        if (_game.iBlock == 0) return;
        
        bytes32 _iBlockHash = block.blockhash(_game.iBlock);
        if (_iBlockHash == 0) return;
        return getHand(uint(keccak256(_iBlockHash, _id)));
    }

    // Get the final hand of a game.
    // This will return iHand if there are no draws yet.
    function getDHand(uint32 _id)
        public
        view
        returns (uint32)
    {
        Game memory _game = games[_id];
        if (_game.dHand != 0) return _game.dHand;
        if (_game.draws == 0) return _game.iHand;
        if (_game.dBlock == 0) return;

        bytes32 _dBlockHash = block.blockhash(_game.dBlock);
        if (_dBlockHash == 0) return _game.iHand;
        return drawToHand(uint(keccak256(_dBlockHash, _id)), _game.iHand, _game.draws);
    }

    // Returns the hand rank and payout of a Game.
    function getDHandRank(uint32 _id)
        public
        view
        returns (uint8)
    {
        uint32 _dHand = getDHand(_id);
        return _dHand == 0
            ? uint8(HandRank.NotComputable)
            : uint8(getHandRank(_dHand));
    }

    // Expose Vars //////////////////////////////////////
    function curId() public view returns (uint32) {
        return vars.curId;
    }
    function totalWagered() public view returns (uint) {
        return uint(vars.totalWageredGwei) * 1e9;
    }
    function curUserId() public view returns (uint) {
        return uint(vars.curUserId);
    }
    function totalWon() public view returns (uint) {
        return uint(vars.totalWonGwei) * 1e9;
    }
    function totalCredits() public view returns (uint) {
        return vars.totalCredits;
    }
    /////////////////////////////////////////////////////

    // Expose Settings //////////////////////////////////
    function minBet() public view returns (uint) {
        return settings.minBet;
    }
    function maxBet() public view returns (uint) {
        return settings.maxBet;
    }
    function curPayTableId() public view returns (uint) {
        return settings.curPayTableId;
    }
    function numPayTables() public view returns (uint) {
        return settings.numPayTables;
    }

    /////////////////////////////////////////////////////
}