pragma solidity ^0.4.19;

/**
A PennyAuction to win a prize.

How it works:
	- Initial prize is held in contract.
	- Bid price is a fixed amount.
	- On bid (sending bidPrice to contract):
		- bidder becomes the current winner.
		- prize is increased/decreased by bidIncr
		- auction is extended by `bidAddBlocks` blocks.
	- Auction is over when current block >= `blockEnded`
	- When the auction has ended, .sendPrize() pays the winner.

For fairness, a bid is refunded if:
	- The incorrect amount is sent.
	- The bid is too late (auction has already ended)
	- The bidder is already the current winner
	- Another bid came in after on the same block
		- Note: Here, default gas is used for refund. On failure, bid is kept.

Accrued fees can be sent to `collector` at any time by calling .sendFees().
*/
contract PennyAuction {
	// We store values as GWei to reduce storage to 64 bits.
	// int64: 2^63 GWei is ~ 9 billion Ether, so no overflow risk.
	//
	// For blocks, we use uint32, which has a max value of 4.3 billion
	// At a 1 second block time, there's a risk of overflow in 120 years.
	//
	// We put these variables together because they are all written to
	// on each bid. This should save some writing cost.
	int64 public prizeGwei;			// (Gwei) the current prize
	uint32 public numBids;			// total number of bids
	uint32 public blockEnded;		// the time at which no further bids can occur	
	uint32 public lastBidBlock;		// block of the last bid
	address public currentWinner;	// address of last bidder

	// These values never change
	int64 public initialPrizeGwei;	// (Gwei > 0) amt initially staked
	int64 public bidPriceGwei;		// (Gwei > 0) cost to become the current winner
	int64 public bidIncrGwei;		// (Gwei > 0) amount added/removed to prize on bid.
	uint32 public bidAddBlocks;	    // number of blocks auction is extended
	address public collector;		// address that fees get sent to
	bool public isPaid;				// whether or not the winner has been paid

	uint constant version = 1;

	// only allow ONE "reRentry" call on the stack at a time
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }

	event Error(uint time, string msg);
	event Started(uint time, uint initialBlocks);
	event BidOccurred(uint time, address indexed bidder);
	event BidRefundSuccess(uint time, string msg, address indexed bidder);
	event BidRefundFailure(uint time, string msg, address indexed bidder);
	event SendPrizeSuccess(uint time, address indexed redeemer, address indexed recipient, uint amount, uint gasLimit);
	event SendPrizeFailure(uint time, address indexed redeemer, address indexed recipient, uint amount, uint gasLimit);
	event FeesSent(uint time, address collector, uint amount);

	function PennyAuction(
		address _collector,
		uint _initialPrize,
		uint _bidPrice,
		int _bidIncr,
		uint _bidAddBlocks,
		uint _initialBlocks
	)
		public
		payable
	{
        require(_initialPrize >= 1e9);				// min value of 1 GWei
        require(_initialPrize < 1e6 * 1e18);		// max value of a million ether
        require(_initialPrize % 1e9 == 0);			// even amount of GWei
        require(_bidPrice >= 1e6);					// min value of 1 GWei
        require(_bidPrice < 1e6 * 1e18);			// max value of a million ether
        require(_bidPrice % 1e9 == 0);				// even amount of GWei
        require(_bidIncr <= int(_bidPrice));		// max value of _bidPrice
        require(_bidIncr >= -1*int(_initialPrize));	// min value of -1*initialPrize
        require(_bidIncr % 1e9 ==0);				// even amount of GWei
        require(_bidAddBlocks >= 1);				// minimum of 1 block
        require(_initialBlocks >= 1);				// minimum of 1 block
        require(msg.value == _initialPrize);		// must've sent the prize amount

        // Set instance variables. these never change.
        // These can be safely cast to int64 because they are each under 1e24,
        // which divided by 1e9 is 1e15. max int64 val is ~1e19.
        // For block numbers, uint32 is good up to ~4e12, a long time from now.
		collector = _collector;
        initialPrizeGwei = int64(_initialPrize / 1e9);
        bidPriceGwei = int64(_bidPrice / 1e9);
		bidIncrGwei = int64(_bidIncr / 1e9);
		bidAddBlocks = uint32(_bidAddBlocks);

		// Initialize the auction variables.
		prizeGwei = initialPrizeGwei;
		currentWinner = collector;
		lastBidBlock = uint32(block.number);
		blockEnded = uint32(block.number + _initialBlocks);

		Started(now, _initialBlocks);
	}

	/**
	Upon new bid, adds fees and increments time and prize.
	- Refunds if bid is too late, already winner, or incorrect bid value.
	- Upon a bid-in-same-block, refends previous bidder.
	- Sending refund to external address may cause another bid, so we
	  mark this as noRentry.
	*/
	function()
		public
		payable
		noRentry
	{
		// check that there is still time to bid
		if (isEnded()) {
			errorAndRefund("Auction has already ended.");
			return;
		}
		// check sender
		if (msg.sender == currentWinner) {
			errorAndRefund("You are already the current winner.");
			return;
		}
		// check that bid amount is correct
		if (msg.value != bidPrice()) {
			errorAndRefund("Value sent must match bidPrice.");
			return;
		}
		// Check that this bid wouldn't result in a negative prize
		if (prizeGwei + bidIncrGwei < 0) {
			errorAndRefund("Bidding would result in a negative prize.");
			return;
		}

		if (block.number != lastBidBlock) {
			// this is a new bid
			numBids++;
			prizeGwei += bidIncrGwei;
			blockEnded += uint32(bidAddBlocks);
			lastBidBlock = uint32(block.number);
		} else {
			// this bid is in the same block as the previous bid.
			// - try to refund the previous bidder
			// - on refund failure, count this bid as a new bid.
			if (currentWinner.send(msg.value)) {
				BidRefundSuccess(now, "Another bid occurred on the same block.", currentWinner);
			} else {
				BidRefundFailure(now, ".send() failed.", currentWinner);
				prizeGwei += bidIncrGwei;
				numBids++;
			}
		}

		// always update current winner and emit event
		currentWinner = msg.sender;
		BidOccurred({time: now, bidder: msg.sender});
	}

	// called from payable functions to refund the sender
	// if we cannot refund, throw so that the tx reverts
	function errorAndRefund(string _msg)
		private
	{
		require(msg.sender.call.value(msg.value)());
		BidRefundSuccess({time: now, msg: _msg, bidder: msg.sender});
	}

	/**
	Sends prize to the current winner using _gasLimit (0 is unlimited)
	*/
	function sendPrize(uint _gasLimit)
		public
	    noRentry
	    returns (bool _success, uint _prizeSent)
	{
		// make sure auction has indeed ended
		if (!isEnded()) {
		    Error(now, "The auction has not ended.");
		    return (false, 0);
		}
		// make sure auction wasnt already paid
		// (doesnt really matter as balance would be 0 anyway)
		if (isPaid) {
			Error(now, "The prize has already been paid.");
			return (false, 0);
		}

		uint _prize = prize();
		bool _paySuccessful = false;
		if (_gasLimit == 0) {
			_paySuccessful = currentWinner.call.value(_prize)();
		} else {
			_paySuccessful = currentWinner.call.value(_prize).gas(_gasLimit)();
		}

        if (_paySuccessful) {
        	// mark as paid
        	isPaid = true;
        	SendPrizeSuccess({
				time: now,
	            redeemer: msg.sender,
	            recipient: currentWinner,
	            amount: _prize,
	            gasLimit: _gasLimit
	        });
			return (true, _prize);
        } else {
        	// log payment failed
        	SendPrizeFailure({
        		time: now,
        		redeemer: msg.sender,
        		recipient: currentWinner,
        		amount: _prize,
        		gasLimit: _gasLimit
        	});
            return (false, 0);        	
        }
	}
	
	// Sends the fees to the collector, or throws
	function sendFees()
		public
	    returns (uint _feesSent)
    {
		if (fees() == 0) return;
		_feesSent = fees();
		require(collector.call.value(_feesSent)());
		FeesSent(now, collector, _feesSent);
	}

	// Returns true if the auction has ended
	function isEnded()
		public
		constant
		returns (bool _bool)
	{
		return block.number >= blockEnded;
	}
	
	// returns the number of blocks remaining
	function getBlocksRemaining()
		public
		constant
		returns (uint _timeRemaining)
	{
	    if (isEnded()) return 0;
	    return blockEnded - block.number;
	}

	function initialPrize() public constant returns (uint){
		return uint(initialPrizeGwei) * 1e9;
	}
	function prize() public constant returns (uint) {
		return uint(initialPrizeGwei + (bidIncrGwei * numBids)) * 1e9;
	}
	function bidPrice() public constant returns (uint) {
		return uint(bidPriceGwei) * 1e9;
	}
	function bidIncr() public constant returns (int) {
		return int(bidIncrGwei) * 1e9;
	}
	function fees() public constant returns (uint) {
		return isPaid ? this.balance : this.balance - prize();
	}
	function totalFees() public constant returns (uint) {
		return uint((bidPriceGwei - bidIncrGwei) * numBids) * 1e9;
	}
}