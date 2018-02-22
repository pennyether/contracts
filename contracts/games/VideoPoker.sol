pragma solidity ^0.4.19;

import "./VideoPokerUtils.sol";
import "../Fundable.sol";

contract VideoPoker is
    VideoPokerUtils,
    Fundable
{
    // All the data needed for each game.
    struct Game {
        // 1st 256-bit block
        uint32 id;
        address user;
        // 2nd 256-bit block
        uint64 bet;         // max of 18 Ether (set on bet)
        uint8 payTableId;   // the PayTable used (set on bet)
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
        uint32 curId;               // changes on bet
        uint64 totalWageredGwei;    // changes on bet
        uint64 totalWonGwei;        // changes on win finalization
        uint88 totalCredits;        // up to 300m Ether
        bool isSet;                 // set to true to normalize gas cost
    }
    Vars vars;
    
    // A Mapping of all games
    mapping(uint32=>Game) public games;
    
    // Credits
    mapping(address => uint) credits;
    
    // Admin controlled settings
    uint64 public maxBet = .5 ether;
    uint64 public minBet = .001 ether;

    // Note: Pay tables cannot be changed once added.
    // However, admin can change the current PayTable
    uint8 public curPayTableId = 0;
    uint8 public numPayTables = 0;
    mapping(uint8=>uint16[12]) payTables;
    
    // Admin Events
    event PayTableAdded(uint time, uint payTableIndex);
    event SettingsChanged(uint time, address indexed sender);

    // Game Events
    event BetSuccess(uint time, address indexed user, uint32 indexed id, uint bet);
    event BetFailure(uint time, address indexed user, uint bet, string msg);
    event DrawSuccess(uint time, address indexed user, uint32 indexed id, uint8 draw);
    event DrawWarning(uint time, address indexed user, uint32 indexed id, uint8 draw, string msg);
    event DrawFailure(uint time, address indexed user, uint32 indexed id, uint8 draw, string msg);
    event FinalizeSuccess(uint time, address indexed user, uint32 indexed id, uint8 result, uint payout);
    event FinalizeWarning(uint time, address indexed user, uint32 indexed id, string msg);
    event FinalizeFailure(uint time, address indexed user, uint32 indexed id, string msg);
    // If _payout = true on finalization
    event PayoutSuccess(uint time, address indexed user, uint32 indexed id, uint amt);
    event PayoutFailure(uint time, address indexed user, uint32 indexed id, uint amt);
    // Credits
    event CreditsAdded(uint time, address indexed user, uint32 indexed id, uint amt);
    event CreditsUsed(uint time, address indexed user, uint32 indexed id, uint amt);
    event CreditsCashedout(uint time, address indexed user, uint amt);
        
    function VideoPoker(address _registry)
        Fundable(_registry)
        public
    {
        // Add the default PayTable.
        _addPayTable(800, 50, 25, 9, 6, 4, 3, 2, 1);
        vars.isSet = true;
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
        require(_payTableId < numPayTables);
        minBet = _minBet;
        maxBet = _maxBet;
        curPayTableId = _payTableId;
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
    }
    

    /**************************************************/
    /****** PUBLIC FUNCTIONS **************************/
    /**************************************************/

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

    // Allows a user to create a game from Credits.
    //
    // Gas Cost: 80k
    //   - 22k: tx overhead
    //   - 46k: see _createNewGame()
    //   -  2k: curMaxBet()
    //   -  4k: 2 events: BetSuccess, CreditsUser
    //   -  5k: update credits[user]
    //   -  1k: SLOAD, execution
    function betWithCredits(uint64 _bet)
        public
    {
        if (_bet > maxBet)
            return _betFailure("Bet too large.", _bet, false);
        if (_bet < minBet)
            return _betFailure("Bet too small.", _bet, false);
        if (_bet > curMaxBet())
            return _betFailure("The bankroll is too low.", _bet, false);
        if (_bet > credits[msg.sender])
            return _betFailure("Insufficient credits", _bet, false);

        // no uint64 overflow: _bet < maxBet < .625 ETH < 2e64
        uint32 _id = _createNewGame(uint64(_bet), msg.sender);
        credits[msg.sender] -= _bet;
        CreditsUsed(now, msg.sender, _id, _bet);
        BetSuccess(now, msg.sender, _id, _bet);
    }

    // Allows a user to create a game from Ether sent.
    //
    // Gas Cost: 74k
    //   - 22k: tx overhead
    //   - 46k: see _createNewGame()
    //   -  2k: curMaxBet()
    //   -  2k: event
    //   -  1k: SLOAD, execution
    function bet()
        public
        payable
    {
        uint _bet = msg.value;
        if (_bet > maxBet)
            return _betFailure("Bet too large.", _bet, true);
        if (_bet < minBet)
            return _betFailure("Bet too small.", _bet, true);
        if (_bet > curMaxBet())
            return _betFailure("The bankroll is too low.", _bet, true);

        // no uint64 overflow: _bet < maxBet < .625 ETH < 2e64
        uint32 _id = _createNewGame(uint64(_bet), msg.sender);
        BetSuccess(now, msg.sender, _id, _bet);
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
    // Gas Cost: ~34k
    //   - 22k: tx
    //   - 10k: see _draw()
    //   -  2k: SLOADs, execution
    function draw(uint32 _id, uint8 _draws, bytes32 _hashCheck)
        public
    {
        Game storage _game = games[_id];
        if (_game.iBlock == 0)
            return _drawFailure(_id, _draws, "Invalid game Id.");
        if (_game.user != msg.sender)
            return _drawFailure(_id, _draws, "This is not your game.");
        if (_game.iBlock == block.number)
            return _drawFailure(_id, _draws, "Initial cards not dealt yet.");
        if (_game.dBlock != 0)
            return _drawFailure(_id, _draws, "Cards already drawn.");
        if (_draws > 63)
            return _drawFailure(_id, _draws, "Invalid draws.");
        if (_draws == 0)
            return _drawFailure(_id, _draws, "Cannot draw 0 cards. Use finalize instead.");
        
        _draw(_game, _draws, _hashCheck);
    }
        function _drawFailure(uint32 _id, uint8 _draws, string _msg)
            private
        {
            DrawFailure(now, msg.sender, _id, _draws, _msg);
        }
      

    // function finalizeAndBet(uint32 _id, uint _bet) {

    // }
    // function finalizeAndCashout(uint32 _id) {

    // }
    // function finalizeToCredits(uint32 _id) {

    // }


    // Callable any time after the initial hand. Will assume
    // no draws if called directly after new hand.
    //
    // Gas Cost: 44k (loss), 59k (win, has credits), 72k (win, no credits)
    //   - 22k: tx overhead
    //   - 21k, 36k, 49k: see _finalize()
    //   -  1k: SLOADs, execution
    function finalize(uint32 _id, bool _payoutToCredits)
        public
        returns (bool _didFinalize)
    {
        Game storage _game = games[_id];
        if (_game.iBlock == 0)
            return _finalizeFailure(_id, "Invalid game Id.");
        if (_game.user != msg.sender)
            return _finalizeFailure(_id, "This is not your game.");
        if (_game.iBlock == block.number)
            return _finalizeFailure(_id, "Initial hand not yet dealt.");
        if (_game.dBlock == block.number)
            return _finalizeFailure(_id, "Draw cards not yet dealt.");
        if (_game.handRank != uint8(HandRank.Undefined))
            return _finalizeFailure(_id, "Game already finalized.");

        _finalize(_game);
        return true;
    }
        function _finalizeFailure(uint32 _id, string _msg)
            private
            returns (bool)
        {
            FinalizeFailure(now, msg.sender, _id, _msg);
            return false;
        }


    /*******************************************************/
    /************** PRIVATE FUNCTIONS **********************/
    /*******************************************************/

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
        payTables[numPayTables] = _pt;
        numPayTables++;
    }

    // Increases totalCredits and credits[user]
    // Optionally increases totalWonGwei stat.
    function _creditUser(address _user, uint _amt, uint32 _gameId)
        private
    {
        if (_amt == 0) return;
        vars.totalCredits += uint88(_amt);
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
    // Gas Cost: 46k
    //   - 40k: 2 writes: Game
    //   -  5k: 1 update: curId / totalWageredGwei
    //   -  1k: SLOAD, execution
    function _createNewGame(uint64 _bet, address _user)
        private
        returns (uint32 _id)
    {
        // increment vars
        vars.totalWageredGwei += _bet / 1e9;
        vars.curId++;

        _id = vars.curId;
        Game storage _game = games[_id];
        _game.id = _id;
        _game.user = _user;
        _game.bet = _bet;
        _game.payTableId = curPayTableId;
        _game.iBlock = uint32(block.number);        
        return _id;
    }

    // Gets initialHand, and stores .draws and .dBlock.
    // Gas Cost: 10k
    //   - 3k: getHand()
    //   - 5k: 1 update: iHand, draws, dBlock
    //   - 2: event: DrawSuccess
    //   - 2k (maybe): DrawWarning
    function _draw(Game storage _game, uint8 _draws, bytes32 _hashCheck)
        private
    {
        // Deal the initial hand, or set draws to 5.
        uint32 _iHand;
        bytes32 _iBlockHash = block.blockhash(_game.iBlock);
        if (_iBlockHash != 0) {
            if (_iBlockHash != _hashCheck) {
                return _drawFailure(_game.id, _draws, "HashCheck Failed. Perhaps a reorg occurred.");
            }
            _iHand = getHand(uint(keccak256(_iBlockHash, _game.id)));
        } else {
            DrawWarning(now, msg.sender, _game.id, _draws, 
                "Initial hand no longer available. Drawing 5 cards.");
            _draws = 63;
        }

        // update game
        _game.iHand = _iHand;
        _game.draws = _draws;
        _game.dBlock = uint32(block.number);

        DrawSuccess(now, msg.sender, _game.id, _draws);
    }

    // Resolves game based on .iHand and .draws, crediting user on a win.
    // This always sets game.dHand and game.handRank.
    //
    // There are four possible scenarios:
    //   User draws 0 cards, and iBlock is fresh:
    //     - draw 5 cards into iHand, set dHand to iHand
    //   User draws 0 cards, and iBlock is too old:
    //     - draw 5 cards using prev block, set dHand and dBlock
    //   User draws N cads, and dBlock is fresh:
    //     - draw N cards into iHand, this is dHand
    //   User draws N cards, and dBlock is too old:
    //     - set dHand to iHand (note: iHand may be empty)
    //
    // Gas Cost: 21k loss, 36k win, 49k new win
    //   - 6k: drawToHand()
    //   - 7k: getHandRank()
    //   - 5k: 1 update: Game
    //   - 2k: FinalizeSuccess
    //   - 2k (maybe): FinalizeWarning
    //   - 1k: SLOADs, execution
    //   On Win:
    //   - 5k: 1 updates: totalCredits, totalWon
    //   - 5k or 20k: 1 update/write to credits[user]
    //   - 2k: event: AccountCredited
    //   - 1k: SLOADs, execution
    function _finalize(Game storage _game)
        private
    {
        // Require game is not already finalized
        assert(_game.handRank == uint8(HandRank.Undefined));

        // Compute _dHand
        uint32 _dHand;
        bytes32 _blockhash;
        uint32 _iHand;      // set if draws are 0, and iBlock is fresh
        uint32 _dBlock;     // set if draws are 0, and iBlock is old
        uint8 _draws;       // set if draws are 0, and iBlock is old
        if (_game.draws == 0) {
            _blockhash = block.blockhash(_game.iBlock);
            if (_blockhash != 0) {
                // draw 5 cards into iHand, use as dHand
                _iHand = getHand(uint(keccak256(_blockhash, _game.id)));
                _dHand = _iHand;
            } else {
                // draw 5 cards right now into dHand
                FinalizeWarning(now, _game.user, _game.id, "Initial hand not available. Drawing 5 cards.");
                _draws = 63;
                _dBlock = uint32(block.number - 1);
                _blockhash = block.blockhash(_dBlock);
                _dHand = getHand(uint(keccak256(_blockhash, _game.id)));
            }
        } else {
            _blockhash = block.blockhash(_game.dBlock);
            if (_blockhash != 0) {
                // draw cards to iHand, use as dHand
                _dHand = drawToHand(uint(keccak256(_blockhash, _game.id)), _game.iHand, _game.draws);
            } else {
                // cannot draw any cards. use iHand.
                if (_game.iHand == 0){
                    _dHand = 0;
                    FinalizeWarning(now, _game.user, _game.id, "Draw cards not available, and no initial hand.");
                } else {
                    _dHand = _game.iHand;
                    FinalizeWarning(now, _game.user, _game.id, "Draw cards not available. Using initial hand.");
                }
            }
        }

        // compute _handRank. be sure dHand is not empty
        uint8 _handRank = _dHand == 0
            ? uint8(HandRank.NotComputable)
            : uint8(getHandRank(_dHand));

        // if draws were 0, and could draw iHand, set iHand.
        if (_iHand > 0) _game.iHand = _iHand;
        // // if draws were 0, and could not draw iHand, set these.
        if (_dBlock > 0) _game.dBlock = _dBlock;
        if (_draws > 0) _game.draws = _draws;
        // // always set dHand and handRank
        _game.dHand = _dHand;
        _game.handRank = _handRank;

        // Compute _payout, credit user, emit event.
        uint _payout = payTables[_game.payTableId][_handRank] * uint(_game.bet);
        if (_payout > 0) _creditUser(_game.user, _payout, _game.id);
        FinalizeSuccess(now, _game.user, _game.id, _game.handRank, _payout);
    }



    /**********************************************************/
    /****************** PUBLIC VIEWS **************************/
    /**********************************************************/

    // OVERRIDES: Fundable.getProfits()
    // Ensures contract always has at least funding + totalCredits.
    function getProfits()
        public
        view
        returns (uint _amount)
    {
        uint _balance = this.balance;
        uint _threshold = funding + vars.totalCredits;
        if (_balance <= _threshold) return;
        return _balance - _threshold;
    }

    // Returns the largest bet such that we could pay out two RoyalFlushes.
    // The likelihood that two RoyalFlushes (with max bet size) are 
    // won within a 255 block period is extremely low.
    function curMaxBet() public view returns (uint) {
        // Upcast to uint for cheaper math below.
        uint _credits = vars.totalCredits;
        uint _funding = funding;
        uint _balance = this.balance;
        // These should never happen, but check anyway to prevent underflow.
        if (_balance <= _credits) return;
        if (_funding <= _credits) return;
        // Available balance is min(balance, funding) - totalCredits;
        uint _available = (_balance > _funding ? _funding : _balance) - _credits;
        // Return largest bet such that RF*2*bet = _available
        return _available / (payTables[curPayTableId][uint(HandRank.RoyalFlush)] * 2);
    }

    function getPayTable(uint8 _payTableId)
        public
        view
        returns (uint16[12])
    {
        require(_payTableId < numPayTables);
        return payTables[_payTableId];
    }

    function getIHand(uint32 _id)
        public
        view
        returns (uint32)
    {
        Game memory _game = games[_id];
        if (_game.iBlock == 0) return;
        if (_game.iHand != 0) return _game.iHand;
        
        bytes32 _iBlockHash = block.blockhash(_game.iBlock);
        if (_iBlockHash == 0) return;
        return getHand(uint(keccak256(_iBlockHash, _id)));
    }

    function getDHand(uint32 _id)
        public
        view
        returns (uint32)
    {
        Game memory _game = games[_id];
        if (_game.dBlock == 0) return;
        if (_game.dHand != 0) return _game.dHand;
        if (_game.draws == 0) return _game.iHand;

        bytes32 _dBlockHash = block.blockhash(_game.dBlock);
        if (_dBlockHash == 0) return _game.iHand;
        return drawToHand(uint(keccak256(_dBlockHash, _id)), _game.iHand, _game.draws);
    }

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

    function curId() public view returns (uint32) {
        return vars.curId;
    }
    function totalWagered() public view returns (uint) {
        return uint(vars.totalWageredGwei) * 1e9;
    }
    function totalWon() public view returns (uint) {
        return uint(vars.totalWonGwei) * 1e9;
    }
    function totalCredits() public view returns (uint) {
        return vars.totalCredits;
    }
}