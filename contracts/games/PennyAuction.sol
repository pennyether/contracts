pragma solidity ^0.4.19;

/**
A PennyAuction to win a growing prize.

How it works:
	- Initial prize is held in contract.
	- Bid price is a fixed amount.
	- On bid:
		- bidder becomes the current winner.
		- a fee is taken, and the rest added to `prize`.
		- auction is extended by `bidAddBlocks` blocks.
	- Auction is over when current block > `blockEnded`
	- When the auction ends, the current winner wins.

For fairness, a bid is refunded if:
	- The incorrect amount is sent.
	- Another bid came in after, but on the same block
	- The bid is too late (auction has already ended)
	- The bidder is already the current winner

Accrued fees can be sent to `collector` at any time by calling .sendFees().

When auction has ended, call .sendPrize() to send prize to the winner.
*/
contract PennyAuction {

	// We put these variables together to lower the gas cost of bidding.
	// On a bid we write to all of them, and they are in the same 256 bit block.
	//
	// Additionally, we store GWei values instead of Wei values.
	// uint64: 2^64 GWei is ~ 18.5 trillion Ether, so no overflow risk.
	//
	// For blocks, we use uint32, which has a max value of 4.3 billion
	// At a 1 second block time, there's a risk of overflow in 120 years.
	uint64 public prize;			// (Gwei) current prize
	uint64 public fees;				// (Gwei) current fees collectable
	uint32 public numBids;			// total number of bids
	uint32 public blockEnded;		// the time at which no further bids can occur	
	uint32 public lastBidBlock;		// block of the last bid
	address public currentWinner;	// address of last bidder

	// These values never change.
	uint8 constant version = 1;
	uint64 public initialPrize;		// (Gwei) amt initially staked
	uint64 public bidPrice;			// (Gwei) cost to become the current winner
	uint8 public bidFeePct;			// amt of bid that gets kept as fees
	uint32 public bidAddBlocks;	    // number of blocks auction is extended
	address public collector;		// address that fees get sent to
	bool public isPaid;				// whether or not the winner has been paid

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
		uint _bidFeePct,
		uint _bidAddBlocks,
		uint _initialBlocks
	)
		public
		payable
	{
		require(msg.value == _initialPrize); 	// must've sent the prize amount
        require(_initialPrize >= 1e12);			// min value of 1 GWei
        require(_initialPrize < 1e12 * 1e18); 	// max value of a billion ether
        require(_initialPrize % 1e12 == 0);		// even amount of GWei
        require(_bidPrice >= 1e12);				// min value of 1 GWei
        require(_bidPrice < 1e12 * 1e18);		// max value of a billion ether
        require(_bidPrice % 1e12 == 0);			// even amount of GWei
        require(_bidFeePct <= 100);	    	 	// bid fee cannot be more than 100%.
        require(_bidAddBlocks >= 1);	     	// minimum of 1 block
        require(_initialBlocks >= 1);  	 	 	// minimum of 1 block

        // set instance variables. these never change.
		collector = _collector;
        initialPrize = uint64(_initialPrize / 1e12);
		bidPrice = uint64(_bidPrice / 1e12);
		bidFeePct = uint8(_bidFeePct);
		bidAddBlocks = uint32(_bidAddBlocks);

		// initialize the auction variables
		prize = initialPrize;
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
			errorAndRefund("Could not bid: Auction has already ended.");
			return;
		}
		// check sender
		if (msg.sender == currentWinner) {
			errorAndRefund("Could not bid: You are already the current winner.");
			return;
		}
		// check that bid amount is correct
		if (msg.value != bidPrice*1e12) {
			errorAndRefund("Could not bid: Value sent must match bidPrice.");
			return;
		}

		// calculate the fee amount in GWei
		uint64 _feeIncr = (bidPrice * bidFeePct)/100;
		uint64 _prizeIncr = bidPrice - _feeIncr;

		if (block.number != lastBidBlock) {
			// this is a new bid
			numBids++;
			fees += _feeIncr;
			prize += _prizeIncr;
			blockEnded += bidAddBlocks;
			lastBidBlock = uint32(block.number);
		} else {
			// this bid is in the same block as the previous bid.
			// - try to refund the previous bidder
			// - on refund failure, count this bid as a new bid.
			if (currentWinner.send(msg.value)) {
				BidRefundSuccess(now, "Another bid occurred on the same block.", currentWinner);
			} else {
				BidRefundFailure(now, ".send() failed.", currentWinner);
				numBids++;
				fees += _feeIncr;
				prize += _prizeIncr;
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

		uint _prize = this.prize();
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
		if (fees == 0) return;
		_feesSent = this.fees();
		fees = 0;
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

	// override the public methods to return Wei values.
	function initialPrize() public constant returns (uint) { return uint(initialPrize)*1e12; }
	function fees() public constant returns (uint) { return uint(fees)*1e12; }
	function bidPrice() public constant returns (uint) { return uint(bidPrice)*1e12; }
	function prize() public constant returns (uint) { return uint(prize)*1e12; }
}