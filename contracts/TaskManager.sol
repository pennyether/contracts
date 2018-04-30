pragma solidity ^0.4.23;

import "./common/HasDailyLimit.sol";
import "./common/Bankrollable.sol";
import "./roles/UsingAdmin.sol";
import "./roles/UsingMonarchyController.sol";

/*
  This is a simple class that pays anybody to execute methods on
  other contracts. The reward amounts are configurable by the Admin,
  with some hard limits to prevent the Admin from pilfering. The
  contract has a DailyLimit, so even if the Admin is compromised,
  the contract cannot be drained.

  TaskManager is Bankrollable, meaning it can accept bankroll from 
  the Treasury (and have it recalled).  However, it will never generate
  profits. On rare occasion, new funds will need to be added to ensure
  rewards can be paid.

  This class is divided into sections that pay rewards for a specific
  contract or set of contracts. Any time a new contract is added to
  the system that requires Tasks, this file will be updated and 
  redeployed.
*/
interface _IBankrollable {
    function sendProfits() external returns (uint _profits);
    function profits() external view returns (int _profits);
}
contract TaskManager is
    HasDailyLimit,
    Bankrollable,
    UsingAdmin,
    UsingMonarchyController
{
    uint constant public version = 1;
    uint public totalRewarded;

    // Number of basis points to reward caller.
    // 1 = .01%, 10 = .1%, 100 = 1%. Capped at .1%.
    uint public issueDividendRewardBips;
    // Number of basis points to reward caller.
    // 1 = .01%, 10 = .1%, 100 = 1%. Capped at 1%.
    uint public sendProfitsRewardBips;
    // How much to pay for games to start and end.
    // These values are capped at 1 Ether.
    uint public monarchyStartReward;
    uint public monarchyEndReward;
    
    event Created(uint time);
    event DailyLimitChanged(uint time, address indexed owner, uint newValue);
    // admin events
    event IssueDividendRewardChanged(uint time, address indexed admin, uint newValue);
    event SendProfitsRewardChanged(uint time, address indexed admin, uint newValue);
    event MonarchyRewardsChanged(uint time, address indexed admin, uint startReward, uint endReward);
    // base events
    event TaskError(uint time, address indexed caller, string msg);
    event RewardSuccess(uint time, address indexed caller, uint reward);
    event RewardFailure(uint time, address indexed caller, uint reward, string msg);
    // task events
    event IssueDividendSuccess(uint time, address indexed treasury, uint profitsSent);
    event SendProfitsSuccess(uint time, address indexed bankrollable, uint profitsSent);
    event MonarchyGameStarted(uint time, address indexed addr, uint initialPrize);
    event MonarchyGamesRefreshed(uint time, uint numEnded, uint feesCollected);

    // Construct sets the registry and instantiates inherited classes.
    constructor(address _registry)
        public
        HasDailyLimit(1 ether)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        UsingMonarchyController(_registry)
    {
        emit Created(now);
    }


    ///////////////////////////////////////////////////////////////////
    ////////// OWNER FUNCTIONS ////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    function setDailyLimit(uint _amount)
        public
        fromOwner
    {
        _setDailyLimit(_amount);
        emit DailyLimitChanged(now, msg.sender, _amount);
    }


    ///////////////////////////////////////////////////////////////////
    ////////// ADMIN FUNCTIONS ////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    function setIssueDividendReward(uint _bips)
        public
        fromAdmin
    {
        require(_bips <= 10);
        issueDividendRewardBips = _bips;
        emit IssueDividendRewardChanged(now, msg.sender, _bips);
    }

    function setSendProfitsReward(uint _bips)
        public
        fromAdmin
    {
        require(_bips <= 100);
        sendProfitsRewardBips = _bips;
        emit SendProfitsRewardChanged(now, msg.sender, _bips);
    }

    function setMonarchyRewards(uint _startReward, uint _endReward)
        public
        fromAdmin
    {
        require(_startReward <= 1 ether);
        require(_endReward <= 1 ether);
        monarchyStartReward = _startReward;
        monarchyEndReward = _endReward;
        emit MonarchyRewardsChanged(now, msg.sender, _startReward, _endReward);
    }


    ///////////////////////////////////////////////////////////////////
    ////////// ISSUE DIVIDEND TASK ////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    function doIssueDividend()
        public
        returns (uint _reward, uint _profits)
    {
        // get amount of profits
        ITreasury _tr = getTreasury();
        _profits = _tr.profitsSendable();
        // quit if no profits to send.
        if (_profits == 0) {
            _taskError("No profits to send.");
            return;
        }
        // call .issueDividend(), use return value to compute _reward
        _profits = _tr.issueDividend();
        if (_profits == 0) {
            _taskError("No profits were sent.");
            return;
        } else {
            emit IssueDividendSuccess(now, address(_tr), _profits);
        }
        // send reward
        _reward = (_profits * issueDividendRewardBips) / 10000;
        _sendReward(_reward);
    }

    // Returns reward and profits
    function issueDividendReward()
        public
        view
        returns (uint _reward, uint _profits)
    {
        _profits = getTreasury().profitsSendable();
        _reward = _cappedReward((_profits * issueDividendRewardBips) / 10000);
    }


    ///////////////////////////////////////////////////////////////////
    ////////// SEND PROFITS TASKS /////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    function doSendProfits(address _bankrollable)
        public
        returns (uint _reward, uint _profits)
    {
        // Call .sendProfits(). Look for Treasury balance to change.
        ITreasury _tr = getTreasury();
        uint _oldTrBalance = address(_tr).balance;
        _IBankrollable(_bankrollable).sendProfits();
        uint _newTrBalance = address(_tr).balance;

        // Quit if no profits. Otherwise compute profits.
        if (_newTrBalance <= _oldTrBalance) {
            _taskError("No profits were sent.");
            return;
        } else {
            _profits = _newTrBalance - _oldTrBalance;
            emit SendProfitsSuccess(now, _bankrollable, _profits);
        }
        
        // Cap reward to current balance (or send will fail)
        _reward = (_profits * sendProfitsRewardBips) / 10000;
        _sendReward(_reward);
    }

    // Returns an estimate of profits to send, and reward.
    function sendProfitsReward(address _bankrollable)
        public
        view
        returns (uint _reward, uint _profits)
    {
        int _p = _IBankrollable(_bankrollable).profits();
        if (_p <= 0) return;
        _profits = uint(_p);
        _reward = _cappedReward((_profits * sendProfitsRewardBips) / 10000);
    }


    ///////////////////////////////////////////////////////////////////
    ////////// MONARCHY TASKS /////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    // Try to start monarchy game, reward upon success.
    function startMonarchyGame(uint _index)
        public
    {
        // Don't bother trying if it's not startable
        IMonarchyController _mc = getMonarchyController();
        if (!_mc.getIsStartable(_index)){
            _taskError("Game is not currently startable.");
            return;
        }

        // Try to start the game. This may fail.
        address _game = _mc.startDefinedGame(_index);
        if (_game == address(0)) {
            _taskError("MonarchyConroller.startDefinedGame() failed.");
            return;
        } else {
            emit MonarchyGameStarted(now, _game, _mc.getInitialPrize(_index));   
        }

        // Reward
        _sendReward(monarchyStartReward);
    }

    // Return the _reward and _index of the first startable MonarchyGame
    function startMonarchyGameReward()
        public
        view
        returns (uint _reward, uint _index)
    {
        IMonarchyController _mc = getMonarchyController();
        _index = _mc.getFirstStartableIndex();
        if (_index > 0) _reward = _cappedReward(monarchyStartReward);
    }


    // Invoke .refreshGames() and pay reward on number of games ended.
    function refreshMonarchyGames()
        public
    {
        // do the call
        uint _numGamesEnded;
        uint _feesCollected;
        (_numGamesEnded, _feesCollected) = getMonarchyController().refreshGames();
        emit MonarchyGamesRefreshed(now, _numGamesEnded, _feesCollected);

        if (_numGamesEnded == 0) {
            _taskError("No games ended.");
        } else {
            _sendReward(_numGamesEnded * monarchyEndReward);   
        }
    }
    
    // Return a reward for each MonarchyGame that will end
    function refreshMonarchyGamesReward()
        public
        view
        returns (uint _reward, uint _numEndable)
    {
        IMonarchyController _mc = getMonarchyController();
        _numEndable = _mc.getNumEndableGames();
        _reward = _cappedReward(_numEndable * monarchyEndReward);
    }


    ///////////////////////////////////////////////////////////////////////
    /////////////////// PRIVATE FUNCTIONS /////////////////////////////////
    ///////////////////////////////////////////////////////////////////////

    // Called when task is unable to execute.
    function _taskError(string _msg) private {
        emit TaskError(now, msg.sender, _msg);
    }

    // Sends a capped amount of _reward to the msg.sender, and emits proper event.
    function _sendReward(uint _reward) private {
        // Limit the reward to balance or dailyLimitRemaining
        uint _amount = _cappedReward(_reward);
        if (_reward > 0 && _amount == 0) {
            emit RewardFailure(now, msg.sender, _amount, "Not enough funds, or daily limit reached.");
            return;
        }

        // Attempt to send it (even if _reward was 0)
        if (msg.sender.call.value(_amount)()) {
            _useFromDailyLimit(_amount);
            totalRewarded += _amount;
            emit RewardSuccess(now, msg.sender, _amount);
        } else {
            emit RewardFailure(now, msg.sender, _amount, "Reward rejected by recipient (out of gas, or revert).");
        }
    }

    // This caps the reward amount to the minimum of (reward, balance, dailyLimitRemaining)
    function _cappedReward(uint _reward) private view returns (uint) {
        uint _balance = address(this).balance;
        uint _remaining = getDailyLimitRemaining();
        if (_reward > _balance) _reward = _balance;
        if (_reward > _remaining) _reward = _remaining;
        return _reward;
    }

    // IMPLEMENT BANKROLLABLE FUNCTIONS
    function getCollateral() public view returns (uint) {}
    function getWhitelistOwner() public view returns (address){ return getAdmin(); }
}