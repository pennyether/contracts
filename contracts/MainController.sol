pragma solidity ^0.4.0;

import "./roles/UsingPennyAuctionController.sol";
import "./roles/UsingTreasury.sol";

/**
The MainController interfaces with all GameControllers.
	- It is the only contract capable of receiving funds from Treasury
	- It is the starting point for the UI

For now, there is only one type of game controller, but there may be more
added in the future.  As such, it's best if the MainController contains zero state
so that swapping in another MainController is trivial.
*/
//@createInterface
contract MainController is 
	UsingPennyAuctionController,
	UsingTreasury
{
	event Error(uint time, string msg);
	event PennyAuctionStarted(uint time, address addr);
	event PennyAuctionNotStarted(uint time, uint index);
	event RefundGasSuccess(uint time, address recipient, uint gasUsed, uint amount);
	event RefundGasFailure(uint time, address recipient, uint gasUsed, uint amount);

	function MainController(address _registry)
		UsingPennyAuctionController(_registry)
		UsingTreasury(_registry)
	{}

	function() payable {}

	// Starts a pennyAuction
	// If successful, refunds the sender the gas it costed
	function startPennyAuction(uint _index) 
		returns (bool _success, address _auction)
	{
		uint _startGas = msg.gas;
		if (tx.gasprice > 40000000000) {
			Error(now, "GasPrice limit is 40GWei.");
			return;
		}

		// ensure it is startable
		IPennyAuctionController pac = getPennyAuctionController();
		var (_isStartable, _initialPrize) = pac.getIsStartable(_index);
		if (!_isStartable){
			Error(now, "DefinedAuction is not currently startable.");
			return;
		}
		// get funds required to start it
		bool _gotFunds = getTreasury().fundMainController(_initialPrize);
		if (!_gotFunds) {
			Error(now, "Unable to receive funds.");
			return;
		}
		// try to start the auction
		(_success, _auction) = pac.startDefinedAuction.value(_initialPrize)(_index);
		if (_success) {
			PennyAuctionStarted({time: now, addr: address(_auction)});
		} else {
			getTreasury().refund.value(_initialPrize)();
			Error(now, "PennyAuctionFactory.startDefinedAuction() failed.");
			return;
		}

		// try to refund the user (~900000 gas) 
		uint _gasUsed = _startGas - msg.gas + 42600;
		uint _refund = _gasUsed * tx.gasprice;
		_gotFunds = getTreasury().fundMainController(_refund);
		if (_gotFunds){
			if (msg.sender.call.value(_refund)()){
				RefundGasSuccess({time: now, recipient: msg.sender, gasUsed: _gasUsed, amount: _refund});
			} else {
				RefundGasFailure({time: now, recipient: msg.sender, gasUsed: _gasUsed, amount: _refund});
			}
		}

		// return successul either way
		return (_success, _auction);
	}
}