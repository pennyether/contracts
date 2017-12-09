pragma solidity ^0.4.0;

import "./roles/UsingPennyAuctionController.sol";
import "./roles/UsingTreasury.sol";

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
	UsingTreasury
{
	/* these are incentives for people to call our functions. */
	// how much is paid to a user that starts a pennyAuction
	uint public pennyAuctionStartBonus = .001 ether;
	// % of collected fees that are paid to user that calls .refreshPennyAuctions()
	// 100 = 1%, 1000 = .1%, etc
	uint public pennyAuctionFeeCollectBonus = 1000;
	// how much is paid when a user ends an auction via .refreshPennyAuctions()
	uint public pennyAuctionEndBonus = .001 ether;
	// most we are willing to refund for gas for any incentivized calls
	uint public gasPriceLimit = 20000000000;

	/* events */
	event Error(uint time, string msg);
	event PennyAuctionStarted(uint time, uint index, address addr);
	event RewardPaid(uint time, address recipient, string msg, uint gasUsed, uint amount);

	function MainController(address _registry)
		UsingPennyAuctionController(_registry)
		UsingTreasury(_registry)
	{}

	function() payable {}

	// Starts a pennyAuction
	// Upon success, caller gets their gas back plus a bonus
	function startPennyAuction(uint _index)
		returns (bool _success, address _auction)
	{
		uint _startGas = msg.gas;
		if (tx.gasprice > gasPriceLimit) {
			Error(now, "gasPrice exceeds gasPriceLimit.");
			return;
		}

		// ensure it is startable
		IPennyAuctionController _pac = getPennyAuctionController();
		if (!_pac.getIsStartable(_index)){
			Error(now, "DefinedAuction is not currently startable.");
			return;
		}
		// get funds required to start it
		uint _initialPrize = _pac.getInitialPrize(_index);
		bool _gotFunds = getTreasury().fundMainController(_initialPrize);
		if (!_gotFunds) {
			Error(now, "Unable to receive funds.");
			return;
		}
		// try to start the auction
		(_success, _auction) = _pac.startDefinedAuction.value(_initialPrize)(_index);
		if (_success) {
			PennyAuctionStarted({time: now, index: _index, addr: address(_auction)});
		} else {
			// this only happens if a definedAuction is invalid.
			// this should not realistically happen, but if it does
			// we can't refund the user or we could go bankrupt.
			getTreasury().refund.value(_initialPrize)();
			Error(now, "PennyAuctionFactory.startDefinedAuction() failed.");
			return;
		}

		// calculate _reward: (~1000000 gas) + bonus
		uint _gasUsed = (_startGas - msg.gas) + 42600;
		uint _reward = (_gasUsed * tx.gasprice);
		if (getTreasury().fundMainController(_reward)) {
			// send reward.  if it fails, it's the user's fault for having a weird fallback fn.
			if (msg.sender.call.value(_reward)()){
				RewardPaid(now, msg.sender, "Started a PennyAuction", _gasUsed, _reward);
			}	
		}

		// return successul either way
		return (_success, _auction);
	}

	// calls .refreshPennyAuctions() (ends auctions, collects fees)
	// user gets their gas back, plus a bonus
	function refreshPennyAuctions()
		returns (uint _numAuctionsEnded, uint _feesCollected)
	{
		uint _startGas = msg.gas;
		if (tx.gasprice > gasPriceLimit) {
			Error(now, "gasPrice exceeds gasPriceLimit.");
			return;
		}

		// do the call
		IPennyAuctionController _pac = getPennyAuctionController();
		(_numAuctionsEnded, _feesCollected) = _pac.refreshAuctions();

		// calculate _reward: gas + whatever bonus
		uint _gasUsed = (_startGas - msg.gas);
		uint _bonus = (_numAuctionsEnded * pennyAuctionEndBonus)
					   + (_feesCollected / pennyAuctionFeeCollectBonus);
		uint _reward = (_gasUsed * tx.gasprice) + _bonus;
		// send reward.  if it fails, it's the user's fault for having a weird fallback fn.
		if (msg.sender.call.value(_reward)()){
			RewardPaid(now, msg.sender, "Started a PennyAuction", _gasUsed, _reward);
		}

		return (_numAuctionsEnded, _feesCollected);
	}

	// Gets the total bonus amount if one were to call .refreshPennyAuctions()
	function getRefreshPennyAuctionsBonus()
		constant returns (uint _amount)
	{
		IPennyAuctionController _pac = getPennyAuctionController();
		uint _fees = _pac.getAvailableFees();
		uint _numEnded = _pac.getNumEndedAuctions();
		return (_fees * pennyAuctionFeeCollectBonus) + (_numEnded * pennyAuctionEndBonus);
	}
}