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
	event RewardPaid(uint time, address recipient, string msg, uint amount);

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
		// get funds required to start it
		uint _initialPrize = _pac.getInitialPrize(_index);
		bool _gotFunds = getTreasury().fundMainController(_initialPrize, ".startPennyAuction()");
		if (!_gotFunds) {
			Error(now, "Unable to receive funds.");
			return;
		}
		// try to start the auction, refund treasury on failure
		(_success, _auction) = _pac.startDefinedAuction.value(_initialPrize)(_index);
		if (_success) {
			PennyAuctionStarted({time: now, index: _index, addr: address(_auction)});
		} else {
			// this only happens if a definedAuction is invalid.
			// this should not realistically happen, but if it does
			// we can't reward the user or we could go bankrupt.
			getTreasury().refund.value(_initialPrize)("PennyAuctionController.startDefinedAuction() failed.");
			Error(now, "PennyAuctionController.startDefinedAuction() failed.");
			return;
		}

		uint _reward = paStartReward;
		// send reward.  its possible treasury is out of funds, or msg.sender fallback fn fails
		// we ignore both of these cases since they shouldn't realistically happen.
		if (getTreasury().fundMainController(_reward, "Reward user for .startPennyAuction()")) {
			if (msg.sender.call.value(_reward)()){
				RewardPaid(now, msg.sender, "Started a PennyAuction", _reward);
			}	
		}
		return;
	}

	// calls .refreshPennyAuctions() (ends auctions, collects fees)
	// user gets their gas back, plus a bonus
	function refreshPennyAuctions()
		returns (uint _numAuctionsEnded, uint _feesCollected)
	{
		// ensure an auction was ended, or enough feesCollected
		if (getRefreshPennyAuctionsBonus()==0) {
			Error(now, "No reward would be paid.");
			return;
		}

		// do the call
		IPennyAuctionController _pac = getPennyAuctionController();
		(_numAuctionsEnded, _feesCollected) = _pac.refreshAuctions();

		// calculate _reward: gas + whatever bonus
		uint _reward = (_numAuctionsEnded * paEndReward)
					   + (_feesCollected / paFeeCollectRewardDenom);
		// send reward.  its possible treasury is out of funds, or msg.sender fallback fn fails
		// we ignore both of these cases since they shouldn't realistically happen.
		if (getTreasury().fundMainController(_reward, "Reward user for .refreshPennyAuctions()")) {
			if (msg.sender.call.value(_reward)()){
				RewardPaid(now, msg.sender, "Refreshed PennyAuctions", _reward);
			}
		}
		return;
	}

	// Gets the total bonus amount if one were to call .refreshPennyAuctions()
	function getRefreshPennyAuctionsBonus()
		constant returns (uint _amount)
	{
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _fees = _pac.getAvailableFees();
		uint _numEnded = _pac.getNumEndedAuctions();
		return (_numEnded * paEndReward) + (_fees / paFeeCollectRewardDenom);
	}

	// Gets the bonus and index for starting a penny auction
	function getStartPennyAuctionBonus()
		constant returns (uint _amount, uint _index)
	{
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _numIndexes = _pac.numDefinedAuctions();
		for (_index = 0; _index < _numIndexes; _index++) {
			if (!_pac.getIsStartable(_index)) continue;
			return (paStartReward, _index);
		}
		return (0, 0);
	}
}