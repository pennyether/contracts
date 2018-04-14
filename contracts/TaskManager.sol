pragma solidity ^0.4.19;

import "./common/HasDailyLimit.sol";
import "./common/Bankrollable.sol";
import "./roles/UsingAdmin.sol";
import "./roles/UsingPennyAuctionController.sol";

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
    function sendProfits() public returns (uint _profits);
    function profits() public view returns (int _profits);
}
contract TaskManager is
    HasDailyLimit,
    Bankrollable,
    UsingAdmin,
    UsingPennyAuctionController
{
    uint constant public version = 1;
    uint public totalRewarded;

    // Number of basis points to reward caller.
    // 1 = .01%, 10 = .1%, 100 = 1%. Capped at .1%.
    uint public issueDividendRewardBips;
    // Number of basis points to reward caller.
    // 1 = .01%, 10 = .1%, 100 = 1%. Capped at 1%.
    uint public sendProfitsRewardBips;
    // How much to pay for auctions to start and end.
    // These values are capped at 1 Ether.
    uint public paStartReward;
    uint public paEndReward;
    
    event Created(uint time);
    event DailyLimitChanged(uint time, address indexed owner, uint newValue);
    // admin events
    event IssueDividendRewardChanged(uint time, address indexed admin, uint newValue);
    event SendProfitsRewardChanged(uint time, address indexed admin, uint newValue);
    event PennyAuctionRewardsChanged(uint time, address indexed admin, uint paStartReward, uint paEndReward);
    // base events
    event TaskError(uint time, address indexed caller, string msg);
    event RewardSuccess(uint time, address indexed caller, uint reward);
    event RewardFailure(uint time, address indexed caller, uint reward, string msg);
    // task events
    event IssueDividendSuccess(uint time, address indexed treasury, uint profitsSent);
    event SendProfitsSuccess(uint time, address indexed bankrollable, uint profitsSent);
    event PennyAuctionStarted(uint time, address indexed auctionAddr, uint initialPrize);
    event PennyAuctionsRefreshed(uint time, uint numEnded, uint feesCollected);

    // Construct sets the registry and instantiates inherited classes.
    function TaskManager(address _registry)
        public
        HasDailyLimit(1 ether)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        UsingPennyAuctionController(_registry)
    {
        Created(now);
    }


    ///////////////////////////////////////////////////////////////////
    ////////// OWNER FUNCTIONS ////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    function setDailyLimit(uint _amount)
        public
        fromOwner
    {
        _setDailyLimit(_amount);
        DailyLimitChanged(now, msg.sender, _amount);
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
        IssueDividendRewardChanged(now, msg.sender, _bips);
    }

    function setSendProfitsReward(uint _bips)
        public
        fromAdmin
    {
        require(_bips <= 100);
        sendProfitsRewardBips = _bips;
        SendProfitsRewardChanged(now, msg.sender, _bips);
    }

    function setPaRewards(uint _paStartReward, uint _paEndReward)
        public
        fromAdmin
    {
        require(_paStartReward <= 1 ether);
        require(_paEndReward <= 1 ether);
        paStartReward = _paStartReward;
        paEndReward = _paEndReward;
        PennyAuctionRewardsChanged(now, msg.sender, paStartReward, paEndReward);
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
        _profits = _tr.profits();
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
            IssueDividendSuccess(now, address(_tr), _profits);
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
        _profits = getTreasury().profits();
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
            SendProfitsSuccess(now, _bankrollable, _profits);
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
    ////////// PENNY AUCTION TASKS ////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    // Try to start penny auction, reward upon success.
    function startPennyAuction(uint _index)
        public
    {
        // Don't bother trying if it's not startable
        IPennyAuctionController _pac = getPennyAuctionController();
        if (!_pac.getIsStartable(_index)){
            _taskError("Auction is not currently startable.");
            return;
        }

        // Try to start the auction. This may fail.
        address _auction = _pac.startDefinedAuction(_index);
        if (_auction == address(0)) {
            _taskError("PennyAuctionController.startDefinedAuction() failed.");
            return;
        } else {
            PennyAuctionStarted(now, _auction, _pac.getInitialPrize(_index));   
        }

        // Reward
        _sendReward(paStartReward);
    }

    // Return the _reward and _index of the first startable Penny Auction
    function startPennyAuctionReward()
        public
        view
        returns (uint _reward, uint _index)
    {
        IPennyAuctionController _pac = getPennyAuctionController();
        _index = _pac.getFirstStartableIndex();
        if (_index > 0) _reward = _cappedReward(paStartReward);
    }


    // Invoke .refreshAuctions() and pay reward on number of auctions ended.
    function refreshPennyAuctions()
        public
    {
        // do the call
        uint _numAuctionsEnded;
        uint _feesCollected;
        (_numAuctionsEnded, _feesCollected) = getPennyAuctionController().refreshAuctions();
        PennyAuctionsRefreshed(now, _numAuctionsEnded, _feesCollected);

        if (_numAuctionsEnded == 0) {
            _taskError("No auctions ended.");
        } else {
            _sendReward(_numAuctionsEnded * paEndReward);   
        }
    }
    
    // Return a reward for each Penny Auction that will end
    function refreshPennyAuctionsReward()
        public
        view
        returns (uint _reward, uint _numEndable)
    {
        IPennyAuctionController _pac = getPennyAuctionController();
        _numEndable = _pac.getNumEndableAuctions();
        _reward = _cappedReward(_numEndable * paEndReward);
    }


    ///////////////////////////////////////////////////////////////////////
    /////////////////// PRIVATE FUNCTIONS /////////////////////////////////
    ///////////////////////////////////////////////////////////////////////

    // Called when task is unable to execute.
    function _taskError(string _msg) private {
        TaskError(now, msg.sender, _msg);
    }

    // Sends a capped amount of _reward to the msg.sender, and emits proper event.
    function _sendReward(uint _reward) private {
        // Limit the reward to balance or dailyLimitRemaining
        uint _amount = _cappedReward(_reward);
        if (_reward > 0 && _amount == 0) {
            RewardFailure(now, msg.sender, _amount, "Not enough funds, or daily limit reached.");
            return;
        }

        // Attempt to send it (even if _reward was 0)
        if (msg.sender.call.value(_amount)()) {
            _useFromDailyLimit(_amount);
            totalRewarded += _amount;
            RewardSuccess(now, msg.sender, _amount);
        } else {
            RewardFailure(now, msg.sender, _amount, "Reward rejected by recipient (out of gas, or revert).");
        }
    }

    // This caps the reward amount to the minimum of (reward, balance, dailyLimitRemaining)
    function _cappedReward(uint _reward) private view returns (uint) {
        uint _balance = this.balance;
        uint _remaining = getDailyLimitRemaining();
        if (_reward > _balance) _reward = _balance;
        if (_reward > _remaining) _reward = _remaining;
        return _reward;
    }

    // IMPLEMENT BANKROLLABLE FUNCTIONS
    function getCollateral() public view returns (uint) {}
    function getWhitelistOwner() public view returns (address){ return getAdmin(); }
}