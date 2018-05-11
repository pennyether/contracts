pragma solidity ^0.4.23;

import "../common/HasDailyLimit.sol";
import "../common/Bankrollable.sol";
import "../roles/UsingAdmin.sol";
import "../roles/UsingMonarchyFactory.sol";

// An interface to MonarchyGame instances.
interface IMonarchyGame {
    function sendPrize(uint _gasLimit) external returns (bool _success, uint _prizeSent);
    function sendFees() external returns (uint _feesSent);
    function prize() external view returns(uint);
    function numOverthrows() external view returns(uint);
    function fees() external view returns (uint _fees);
    function monarch() external view returns (address _addr);
    function isEnded() external view returns (bool _bool);
    function isPaid() external view returns (bool _bool);
}

/*

  MonarchyController manages a list of PredefinedGames.
  PredefinedGames' parameters are definable by the Admin.
  These gamess can be started, ended, or refreshed by anyone.

  Starting games uses the funds in this contract, unless called via
  .startDefinedGameManually(), in which case it uses the funds sent.

  All revenues of any started games will come back to this contract.

  Since this contract inherits Bankrollable, it is able to be funded
  via the Registry (or by anyone whitelisted). Profits will go to the
  Treasury, and can be triggered by anyone.

*/
contract MonarchyController is
    HasDailyLimit,
    Bankrollable,
    UsingAdmin,
    UsingMonarchyFactory
{
    uint constant public version = 2;

    // just some accounting/stats stuff to keep track of
    uint public totalFees;
    uint public totalPrizes;
    uint public totalOverthrows;
    IMonarchyGame[] public endedGames;

    // An admin-controlled index of available games.
    // Note: Index starts at 1, and is limited to 20.
    uint public numDefinedGames;
    mapping (uint => DefinedGame) public definedGames;
    struct DefinedGame {
        IMonarchyGame game;     // address of ongoing game (or 0)
        bool isEnabled;         // if true, can be started
        string summary;         // definable via editDefinedGame
        uint initialPrize;      // definable via editDefinedGame
        uint fee;               // definable via editDefinedGame
        int prizeIncr;          // definable via editDefinedGame
        uint reignBlocks;       // definable via editDefinedGame
        uint initialBlocks;     // definable via editDefinedGame
    }

    event Created(uint time);
    event DailyLimitChanged(uint time, address indexed owner, uint newValue);
    event Error(uint time, string msg);
    event DefinedGameEdited(uint time, uint index);
    event DefinedGameEnabled(uint time, uint index, bool isEnabled);
    event DefinedGameFailedCreation(uint time, uint index);
    event GameStarted(uint time, uint indexed index, address indexed addr, uint initialPrize);
    event GameEnded(uint time, uint indexed index, address indexed addr, address indexed winner);
    event FeesCollected(uint time, uint amount);


    constructor(address _registry) 
        HasDailyLimit(10 ether)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        UsingMonarchyFactory(_registry)
        public
    {
        emit Created(now);
    }

    /*************************************************************/
    /******** OWNER FUNCTIONS ************************************/
    /*************************************************************/

    function setDailyLimit(uint _amount)
        public
        fromOwner
    {
        _setDailyLimit(_amount);
        emit DailyLimitChanged(now, msg.sender, _amount);
    }


    /*************************************************************/
    /******** ADMIN FUNCTIONS ************************************/
    /*************************************************************/

    // allows admin to edit or add an available game
    function editDefinedGame(
        uint _index,
        string _summary,
        uint _initialPrize,
        uint _fee,
        int _prizeIncr,
        uint _reignBlocks,
        uint _initialBlocks
    )
        public
        fromAdmin
        returns (bool _success)
    {
        if (_index > numDefinedGames + 1 || _index > 20) {
            emit Error(now, "Index out of bounds.");
            return;
        }

        if (_index == numDefinedGames + 1) numDefinedGames++;
        definedGames[_index].summary = _summary;
        definedGames[_index].initialPrize = _initialPrize;
        definedGames[_index].fee = _fee;
        definedGames[_index].prizeIncr = _prizeIncr;
        definedGames[_index].reignBlocks = _reignBlocks;
        definedGames[_index].initialBlocks = _initialBlocks;
        emit DefinedGameEdited(now, _index);
        return true;
    }

    function enableDefinedGame(uint _index, bool _bool)
        public
        fromAdmin
        returns (bool _success)
    {
        if (_index > numDefinedGames) {
            emit Error(now, "Index out of bounds.");
            return;
        }
        definedGames[_index].isEnabled = _bool;
        emit DefinedGameEnabled(now, _index, _bool);
        return true;
    }


    /*************************************************************/
    /******* PUBLIC FUNCTIONS ************************************/
    /*************************************************************/

    function () public payable {
         totalFees += msg.value;
    }

    // This is called by anyone when a new MonarchyGame should be started.
    // In reality will only be called by TaskManager.
    //
    // Errors if:
    //      - isEnabled is false (or doesnt exist)
    //      - game is already started
    //      - not enough funds
    //      - PAF.getCollector() points to another address
    //      - unable to create game
    function startDefinedGame(uint _index)
        public
        returns (address _game)
    {
        DefinedGame memory dGame = definedGames[_index];
        if (_index > numDefinedGames) {
            _error("Index out of bounds.");
            return;
        }
        if (dGame.isEnabled == false) {
            _error("DefinedGame is not enabled.");
            return;
        }
        if (dGame.game != IMonarchyGame(0)) {
            _error("Game is already started.");
            return;
        }
        if (address(this).balance < dGame.initialPrize) {
            _error("Not enough funds to start this game.");
            return;
        }
        if (getDailyLimitRemaining() < dGame.initialPrize) {
            _error("Starting game would exceed daily limit.");
            return;
        }

        // Ensure that if this game is started, revenue comes back to this contract.
        IMonarchyFactory _mf = getMonarchyFactory();
        if (_mf.getCollector() != address(this)){
            _error("MonarchyFactory.getCollector() points to a different contract.");
            return;
        }

        // Try to create game via factory.
        bool _success = address(_mf).call.value(dGame.initialPrize)(
            bytes4(keccak256("createGame(uint256,uint256,int256,uint256,uint256)")),
            dGame.initialPrize,
            dGame.fee,
            dGame.prizeIncr,
            dGame.reignBlocks,
            dGame.initialBlocks
        );
        if (!_success) {
            emit DefinedGameFailedCreation(now, _index);
            _error("MonarchyFactory could not create game (invalid params?)");
            return;
        }

        // Get the game, add it to definedGames, and return.
        _useFromDailyLimit(dGame.initialPrize);
        _game = _mf.lastCreatedGame();
        definedGames[_index].game = IMonarchyGame(_game);
        emit GameStarted(now, _index, _game, dGame.initialPrize);
        return _game;
    }
        // Emits an error with a given message
        function _error(string _msg)
            private
        {
            emit Error(now, _msg);
        }

    function startDefinedGameManually(uint _index)
        public
        payable
        returns (address _game)
    {
        // refund if invalid value sent.
        DefinedGame memory dGame = definedGames[_index];
        if (msg.value != dGame.initialPrize) {
            _error("Value sent does not match initialPrize.");
            require(msg.sender.call.value(msg.value)());
            return;
        }

        // refund if .startDefinedGame fails
        _game = startDefinedGame(_index);
        if (_game == address(0)) {
            require(msg.sender.call.value(msg.value)());
        }
    }

    // Looks at all active defined games and:
    //  - tells each game to send fees to collector (us)
    //  - if ended: tries to pay winner, moves to endedGames
    function refreshGames()
        public
        returns (uint _numGamesEnded, uint _feesCollected)
    {
        for (uint _i = 1; _i <= numDefinedGames; _i++) {
            IMonarchyGame _game = definedGames[_i].game;
            if (_game == IMonarchyGame(0)) continue;

            // redeem the fees
            uint _fees = _game.sendFees();
            _feesCollected += _fees;

            // attempt to pay winner, update stats, and set game to empty.
            if (_game.isEnded()) {
                // paying the winner can error if the winner uses too much gas
                // in that case, they can call .sendPrize() themselves later.
                if (!_game.isPaid()) _game.sendPrize(2300);
                
                // update stats
                totalPrizes += _game.prize();
                totalOverthrows += _game.numOverthrows();

                // clear game, move to endedGames, update return
                definedGames[_i].game = IMonarchyGame(0);
                endedGames.push(_game);
                _numGamesEnded++;

                emit GameEnded(now, _i, address(_game), _game.monarch());
            }
        }
        if (_feesCollected > 0) emit FeesCollected(now, _feesCollected);
        return (_numGamesEnded, _feesCollected);
    }


    /*************************************************************/
    /*********** PUBLIC VIEWS ************************************/
    /*************************************************************/
    // IMPLEMENTS: Bankrollable.getCollateral()
    function getCollateral() public view returns (uint) { return 0; }
    function getWhitelistOwner() public view returns (address){ return getAdmin(); }

    function numEndedGames()
        public
        view
        returns (uint)
    {
        return endedGames.length;
    }

    function numActiveGames()
        public
        view
        returns (uint _count)
    {
        for (uint _i = 1; _i <= numDefinedGames; _i++) {
            if (definedGames[_i].game != IMonarchyGame(0)) _count++;
        }
    }

    function getNumEndableGames()
        public
        view
        returns (uint _count)
    {
        for (uint _i = 1; _i <= numDefinedGames; _i++) {
            IMonarchyGame _game = definedGames[_i].game;
            if (_game == IMonarchyGame(0)) continue;
            if (_game.isEnded()) _count++;
        }
        return _count;
    }

    function getFirstStartableIndex()
        public
        view
        returns (uint _index)
    {
        for (uint _i = 1; _i <= numDefinedGames; _i++) {
            if (getIsStartable(_i)) return _i;
        }
    }

    // Gets total amount of fees that are redeemable if refreshGames() is called.
    function getAvailableFees()
        public
        view
        returns (uint _feesAvailable)
    {
        for (uint _i = 1; _i <= numDefinedGames; _i++) {
            if (definedGames[_i].game == IMonarchyGame(0)) continue;
            _feesAvailable += definedGames[_i].game.fees();
        }
        return _feesAvailable;
    }

    function recentlyEndedGames(uint _num)
        public
        view
        returns (address[] _addresses)
    {
        // set _num to Min(_num, _len), initialize the array
        uint _len = endedGames.length;
        if (_num > _len) _num = _len;
        _addresses = new address[](_num);

        // Loop _num times, adding from end of endedGames.
        uint _i = 1;
        while (_i <= _num) {
            _addresses[_i - 1] = endedGames[_len - _i];
            _i++;
        }
    }

    /******** Shorthand access to definedGames **************************/
    function getGame(uint _index)
        public
        view
        returns (address)
    {
        return address(definedGames[_index].game);
    }

    function getIsEnabled(uint _index)
        public
        view
        returns (bool)
    {
        return definedGames[_index].isEnabled;
    }

    function getInitialPrize(uint _index)
        public
        view
        returns (uint)
    {
        return definedGames[_index].initialPrize;
    }

    function getIsStartable(uint _index)
        public
        view
        returns (bool _isStartable)
    {
        DefinedGame memory dGame = definedGames[_index];
        if (_index > numDefinedGames) return;
        if (dGame.isEnabled == false) return;
        if (dGame.game != IMonarchyGame(0)) return;
        if (dGame.initialPrize > address(this).balance) return;
        if (dGame.initialPrize > getDailyLimitRemaining()) return;
        return true;
    }
    /******** Shorthand access to definedGames **************************/
}