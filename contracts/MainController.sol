pragma solidity ^0.4.0;

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
//@createInterface
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
	uint public paFeeCollectRewardDenom;
	// minimum amount of fees to collect
	uint public paMinFeeCollect = .01 ether;

	/* events */
	event Error(uint time, string msg);
	event RewardGasPriceLimitChanged(uint time);
	event PennyAuctionRewardsChanged(uint time);
	event PennyAuctionStarted(uint time, uint index, address addr);
	event RewardPaid(uint time, address recipient, string note, uint amount);
	event RewardNotPaid(uint time, address recipient, string note, uint amount);

	function MainController(address _registry)
		UsingPennyAuctionController(_registry)
		UsingTreasury(_registry)
		UsingAdmin(_registry)
	{}

	function() payable {}

	function setPennyAuctionRewards(
		uint _paStartReward,
		uint _paEndReward,
		uint _paFeeCollectRewardDenom
	)
		fromAdmin
	{
		require(_paFeeCollectRewardDenom >= 100);
		paStartReward = _paStartReward;
		paEndReward = _paEndReward;
		paFeeCollectRewardDenom = _paFeeCollectRewardDenom;
		PennyAuctionRewardsChanged(now);
	}

	// Starts a pennyAuction
	// Upon success, caller gets their gas back plus a bonus
	function startPennyAuction(uint _index)
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
			RewardNotPaid(now, msg.sender, "Started a PennyAuction", _reward);
		}
		return;
	}

	// calls .refreshPennyAuctions() (ends auctions, collects fees)
	// user gets their gas back, plus a bonus
	function refreshPennyAuctions()
		returns (uint _numAuctionsEnded, uint _feesCollected)
	{
		// do the call
		(_numAuctionsEnded, _feesCollected) = getPennyAuctionController().refreshAuctions();

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
			RewardNotPaid(now, msg.sender, ".refreshPennyAuctions() couldnt send reward.", _reward);
		}
		return;
	}

	// Gets the total reward amount if one were to call pac.refreshPennyAuctions()
	// Note: this is an estimate -- it's possible that a call to <auction>.collectFees()
	//		 can fail to send fees to its collector, in which case those fees wont be
	//		 actually counted and rewarded upon.
	function getRefreshPennyAuctionsReward()
		constant returns (uint _amount)
	{
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _fees = _pac.getAvailableFees();
		uint _numEnded = _pac.getNumEndedAuctions();
		uint _reward = (_numEnded * paEndReward) + (_fees / paFeeCollectRewardDenom);
		return getTreasury().canFund(_reward) ? _reward : 0;
	}

	// Finds a definedAuction() that can be started, and returns the reward and index.
	// If reward is > 0, you can call .startPennyAuction(_index) to receive it.
	function getStartPennyAuctionReward()
		constant returns (uint _amount, uint _index)
	{
		if (!getTreasury().canFund(paStartReward)) return (0,0);
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _numIndexes = _pac.numDefinedAuctions();
		for (_index = 0; _index < _numIndexes; _index++) {
			if (!_pac.getIsStartable(_index)) continue;
			return (paStartReward, _index);
		}
		return (0, 0);
	}
}