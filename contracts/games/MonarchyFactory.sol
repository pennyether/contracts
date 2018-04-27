pragma solidity ^0.4.23;
import "./MonarchyGame.sol";

import "../roles/UsingMonarchyController.sol";

/**
The MonarchyFactory creates instances of MonarchyGames.
    - It sets _collector to the Registry's value of PennyAuctionController
    - It stores the address of lastCreatedAuction, so that the caller
      has a way to retrieve the value in case they are using a 
      low-level call.
    - It emits an event, this can be used to verify a MonarchyGame
      originated from this MonarchyFactory.
*/
contract MonarchyFactory is
    UsingMonarchyController
{
    uint constant public version = 1;
    MonarchyGame public lastCreatedGame;

    event GameCreated(
        uint time,
        address indexed addr,
        address collector,
        uint initialPrize,
        uint fee,
        int prizeIncr,
        uint reignBlocks,
        uint initialBlocks
    );
    event Created(uint time);

    constructor(address _registry)
        UsingMonarchyController(_registry)
        public
    {
        emit Created(now);
    }

    // create an game, event, and return.
    function createGame(
        uint _initialPrize,
        uint _fee,
        int _prizeIncr,
        uint _reignBlocks,
        uint _initialBlocks
    )
        public
        payable
        fromMonarchyController
        returns (MonarchyGame _game)
    {
        require(msg.value == _initialPrize);

        // note: this throws if invalid params are passed.
        address _collector = getCollector();
        _game = (new MonarchyGame).value(_initialPrize)({
            _collector: _collector,
            _initialPrize: _initialPrize,
            _fee: _fee,
            _prizeIncr: _prizeIncr,
            _reignBlocks: _reignBlocks,
            _initialBlocks: _initialBlocks
        });
        lastCreatedGame = _game;

        emit GameCreated({
            time: now,
            addr: _game,
            collector: _collector,
            initialPrize: _initialPrize,
            fee: _fee,
            prizeIncr: _prizeIncr,
            reignBlocks: _reignBlocks,
            initialBlocks: _initialBlocks
        });

        return _game;
    }

    // This is useful to assure the contract calling .createGame()
    //  that it itself is the collector.
    function getCollector() public view returns (address _collector) {
        return getMonarchyController();
    }
}