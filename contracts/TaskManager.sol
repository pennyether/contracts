pragma solidity ^0.4.19;

import "./common/Bankrollable.sol";
import "./roles/UsingAdmin.sol";
import "./roles/UsingPennyAuctionController.sol";

/*
  This is a simple class that pays anybody to execute methods on
  other contracts. The reward amounts are configurable by the Admin,
  with some hard limits to prevent the Admin from pilfering.

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
	function profits() public view returns (uint _profits);
}
contract TaskManager is
	Bankrollable,
	UsingAdmin,
	UsingPennyAuctionController
{

	// Construct sets the registry and instantiates inherited classes.
	function TaskManager(address _registry)
		Bankrollable(_registry)
		UsingAdmin(_registry)
		UsingPennyAuctionController(_registry)
	{}

	function _error(string _msg) private {
		TaskError(now, msg.sender, _msg);
	}

	function _sendReward(uint _reward) private {
		_reward = _cappedReward(_reward);
		if (msg.sender.call.value(_reward)()) {
			RewardSuccess(now, msg.sender, _reward);
		} else {
			RewardFailure(now, msg.sender, _reward, "Reward rejected by sender (OoG or revert).");
		}
	}

	function _cappedReward(uint _reward) returns (uint) {
		uint _balance = this.balance;
		return _reward > _balance ? _balance : _reward;
	}

	event TaskError(uint time, address indexed caller, string msg);
	event RewardSuccess(uint time, address indexed caller, uint reward);
	event RewardFailure(uint time, address indexed caller, uint reward, string msg);



	///////////////////////////////////////////////////////////////////
	////////// SENDING PROFITS OF BANKROLLABLES ///////////////////////
	///////////////////////////////////////////////////////////////////

	// Number of basis points to reward caller.
	// 1 = .01%, 10 = .1%, 100 = 1%. Capped at 1%.
	uint public sendProfitRewardBips;

	event SendProfitsRewardChanged(uint time, address indexed admin, uint newValue);
	event SendProfitsSuccess(uint time, address indexed bankrollable, uint profitsSent);

	function setSendProfitReward(uint _bips)
		public
		fromAdmin
	{
		require(_bips <= 100);
		sendProfitRewardBips = _bips;
		SendProfitsRewardChanged(now, msg.sender, _bips);
	}


	function sendProfits(address _bankrollable)
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
			_error("No profits were sent.");
			return;
		} else {
			_profits = _newTrBalance - _oldTrBalance;
			SendProfitsSuccess(now, _bankrollable, _profits);
		}
		
		// Cap reward to current balance (or send will fail)
		_reward = (_profits * sendProfitRewardBips) / 10000;
		_sendReward(_reward);
	}
		// Returns an estimate of profits to send, and reward.
		function sendProfitReward(address _bankrollable)
			public
			view
			returns (uint _reward, uint _profits)
		{
			_profits = _IBankrollable(_bankrollable).profits();
			_reward = _cappedReward((_profits * sendProfitRewardBips) / 10000);
		}



	///////////////////////////////////////////////////////////////////
	////////// MANAGING PENNY AUCTIONS ////////////////////////////////
	///////////////////////////////////////////////////////////////////

	// How much to pay for auctions to start and end.
	// These values are capped at 1 Ether.
	uint public paStartReward;
	uint public paEndReward;

	event PennyAuctionStarted(uint time, address indexed auctionAddr, uint initialPrize);
	event PennyAuctionsRefreshed(uint time, uint numEnded, uint feesCollected);

	function setPaRewards(uint _paStartReward, uint _paEndReward)
		public
		fromAdmin
	{
		require(_paStartReward <= 1 ether);
		require(_paEndReward <= 1 ether);
		paStartReward = _paStartReward;
		paEndReward = _paEndReward;
	}


	// Try to start penny auction, reward upon success.
	function startPennyAuction(uint _index)
		public
	{
		// Don't bother trying if it's not startable
		IPennyAuctionController _pac = getPennyAuctionController();
		if (!_pac.getIsStartable(_index)){
			_error("Auction is not currently startable.");
			return;
		}

		// Try to start the auction. This may fail.
		address _auction = _pac.startDefinedAuction(_index);
		if (_auction == address(0)) {
			_error("PennyAuctionController.startDefinedAuction() failed.");
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
			uint _numIndexes = _pac.numDefinedAuctions();
			for (_index = 0; _index < _numIndexes; _index++) {
				if (!_pac.getIsStartable(_index)) continue;
				return (_cappedReward(paStartReward), _index);
			}
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
			_error("No auctions ended.");
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
			_numEndable = _pac.getNumEndedAuctions();
			_reward = _cappedReward(_numEndable * paEndReward);
		}
}