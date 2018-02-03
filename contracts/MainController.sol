pragma solidity ^0.4.19;

import "./roles/UsingPennyAuctionController.sol";
import "./roles/UsingTreasury.sol";
import "./roles/UsingAdmin.sol";

/**
The MainController interfaces with all GameControllers.
	- It is the only contract capable of receiving funds from Treasury
	- It is the starting point for the UI
	- Rewards users for calling utility functions

For now, there is only one type of game controller, but there may be more
added in the future.  As such, it's best if the MainController contains zero state
so that swapping in another MainController is trivial.
*/
contract MainController is 
	UsingPennyAuctionController,
	UsingTreasury,
	UsingAdmin
{
	uint constant public version = 1;
	/* these are incentives for people to call our functions. */
	// how much is paid to a user that starts a pennyAuction
	uint public paStartReward;
	// how much is paid when a user ends an auction via .refreshPennyAuctions()
	uint public paEndReward;
	// % of collected fees that are paid to user that calls .refreshPennyAuctions()
	// 100 = 1%, 1000 = .1%, etc
	uint public paFeeCollectRewardDenom = 1000;

	/* events */
	event Error(uint time, string msg);
	event PennyAuctionRewardsChanged(uint time);
	event PennyAuctionStarted(uint time, uint index, address indexed addr);
	event PennyAuctionsRefreshed(uint time, uint numEnded, uint feesCollected);
	event RewardPaid(uint time, address indexed recipient, string note, uint amount);
	event RewardNotPaid(uint time, address indexed recipient, string note, uint amount);

	function MainController(address _registry)
		UsingPennyAuctionController(_registry)
		UsingTreasury(_registry)
		UsingAdmin(_registry)
		public
	{}

	function() public payable {}


	/*************************************************************/
	/****** ADMIN FUNCTIONS **************************************/
	/*************************************************************/
	function setPennyAuctionRewards(
		uint _paStartReward,
		uint _paEndReward,
		uint _paFeeCollectRewardDenom
	)
		public
		fromAdmin
	{
		require(_paFeeCollectRewardDenom >= 100);
		paStartReward = _paStartReward;
		paEndReward = _paEndReward;
		paFeeCollectRewardDenom = _paFeeCollectRewardDenom;
		PennyAuctionRewardsChanged(now);
	}

	/*************************************************************/
	/******* PUBLIC FUNCTIONS ************************************/
	/*************************************************************/
	// Starts a pennyAuction at some index of a predefined auction.
	// on success, caller gets a reward.
	function startPennyAuction(uint _index)
		public
		returns (bool _success, address _auction)
	{
		// ensure it is startable
		IPennyAuctionController _pac = getPennyAuctionController();
		if (!_pac.getIsStartable(_index)){
			Error(now, "DefinedAuction is not currently startable.");
			return;
		}
		// get funds required to start it and pay reward
		ITreasury _t = getTreasury();
		uint _reward = paStartReward;
		uint _initialPrize = _pac.getInitialPrize(_index);
		if (!_t.fundMainController(_initialPrize + _reward, ".startPennyAuction()")) {
			Error(now, "Unable to receive funds.");
			return;
		}

		// try to start the auction, refund treasury on failure
		(_success, _auction) = _pac.startDefinedAuction.value(_initialPrize)(_index);
		if (!_success) {
			// this only happens if a definedAuction is invalid.
			// refund the treasury, and dont pay a reward
			_t.acceptRefund.value(_initialPrize + _reward)("PennyAuctionController.startDefinedAuction() failed.");
			Error(now, "PennyAuctionController.startDefinedAuction() failed.");
			return;
		}
		PennyAuctionStarted(now, _index, address(_auction));

		// try to send reward, refund treasury on failure
		if (msg.sender.call.value(_reward)()){
			RewardPaid(now, msg.sender, "Called .startPennyAuction()", _reward);
		} else {
			_t.acceptRefund.value(_reward)("Could not pay reward for .startPennyAuction()");
			RewardNotPaid(now, msg.sender, ".startPennyAuction() could not send reward.", _reward);
		}
		return;
	}

	// calls .refreshPennyAuctions() (ends auctions, collects fees)
	// user gets a bonus for each auction ended, as well as fees collected.
	function refreshPennyAuctions()
		public
		returns (uint _numAuctionsEnded, uint _feesCollected)
	{
		// do the call
		(_numAuctionsEnded, _feesCollected) = getPennyAuctionController().refreshAuctions();
		PennyAuctionsRefreshed(now, _numAuctionsEnded, _feesCollected);

		// compute reward
		uint _reward = (_numAuctionsEnded * paEndReward)
			+ (_feesCollected / paFeeCollectRewardDenom);
		if (_reward == 0) {
			Error(now, "No reward to be paid.");
			return;
		}

		// get funds required to pay reward
		ITreasury _t = getTreasury();
		if (!_t.fundMainController(_reward, ".refreshPennyAuctions()")) {
			RewardNotPaid(now, msg.sender, ".refreshPennyAuctions() was unable to receive funds.", _reward);
			return;
		}

		// try to send reward, refund treasury on failure
		// We could fail entirely, but that would eat all of their gas.
		if (msg.sender.call.value(_reward)()){
			RewardPaid(now, msg.sender, "Called .refreshPennyAuctions()", _reward);
		} else {
			_t.acceptRefund.value(_reward)("Could not pay reward for .refreshPennyAuctions()");
			RewardNotPaid(now, msg.sender, ".refreshPennyAuction() could not send reward.", _reward);
		}
		return;
	}


	/*************************************************************/
	/************ CONSTANTS **************************************/
	/*************************************************************/
	// Gets whether or not PennyAuctions can be refreshed, and how much reward
	//  will be paid for doing a refresh.
	function canRefreshPennyAuctions()
		public
		constant 
		returns (bool _canRefresh, uint _reward)
	{
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _fees = _pac.getAvailableFees();
		uint _numEnded = _pac.getNumEndedAuctions();
		_canRefresh = _fees > 0 || _numEnded > 0;
		if (!_canRefresh) { return (false, 0); }

		_reward = (_numEnded * paEndReward) + (_fees / paFeeCollectRewardDenom);
		_reward = getTreasury().canFund(_reward) ? _reward : 0;
		return (_canRefresh, _reward);
	}

	// Finds the first definedAuction that can be started.
	function canStartPennyAuction()
		public
		constant
		returns (bool _canStart, uint _index, uint _reward)
	{
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _numIndexes = _pac.numDefinedAuctions();
		for (_index = 0; _index < _numIndexes; _index++) {
			if (!_pac.getIsStartable(_index)) continue;
			if (!getTreasury().canFund(_pac.getInitialPrize(_index) + paStartReward))
				continue;
			return (true, _index, paStartReward);
		}
		return (false, 0, 0);
	}
}