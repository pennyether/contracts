pragma solidity ^0.4.19;

/**
An unstoppable auction for $_initialPrize.

An address may bid exactly $_bidPrice, in which case they
are entitled to the prize if nobody else bids within $_bidTimeS.

For each bid, a fee is taken, and the rest added to the prize.

A bid is refunded if:
	- The incorrect amount is sent.
	- Another bid came in after, but on the same block
	- The bid is too late (auction has already ended)
	- The bidder is already the current winner

Fees can be sent to the collector at any time, by anyone.  We thought
of having fees be sent during each bid, but this would increase
the gas cost of bidding, and also make the contract susceptible to
a gas attack where if an attacker gained control of the collector
they could make the collector consume so much gas as to dissuade
people from bidding.

Once the blocktime has passed $timeEnded, nobody can bid, and
the auction can be paid to the winner.

*/
//@createInterface
contract PennyAuction {
	uint constant version = 1;
	
	address public collector;		// address that fees get sent to

	uint public initialPrize;		// amt initially staked
	uint public bidPrice;			// cost to become the current winner
	uint public bidFeePct;			// amt of bid that gets kept as fees
	uint public bidAddBlocks;	    // number of blocks auction is extended

	uint public prize;				// current prize
	address public currentWinner;	// address of last bidder
	uint public lastBidBlock;		// block of the last bid
	uint public blockEnded;		    // the time at which no further bids can occur

	uint public numBids;			// total number of bids
	uint public fees;				// current fees collectable

	bool public isPaid;				// whether or not the winner has been paid

	// only allow ONE "reRentry" call on the stack at a time
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }

	event Error(uint time, string msg);
	event Started(uint time, uint initialBlocks);
	event BidOccurred(uint time, address bidder);
	event BidRefundSuccess(uint time, string msg, address bidder);
	event BidRefundFailure(uint time, string msg, address bidder);
	event PaymentSuccess(uint time, address redeemer, address recipient, uint amount, uint gasLimit);
	event PaymentFailure(uint time, address redeemer, address recipient, uint amount, uint gasLimit);
	event FeeCollectionSuccess(uint time, uint amount);
	event FeeCollectionFailure(uint time);

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
        require(_initialPrize > 0);     	 // there is an initial prize
        require(_bidPrice > 0);				 // bid price must be positive
        require(_bidAddBlocks >= 1);	     // minimum of 1 block
        require(_bidFeePct <= 100);	    	 // bid fee cannot be more than 100%.
        require(_initialBlocks >= 1);  	 	 // minimum of 1 block
        require(msg.value == _initialPrize); // must've sent the prize amount

        // set instance variables
		collector = _collector;
        initialPrize = _initialPrize;
		bidPrice = _bidPrice;
		bidFeePct = _bidFeePct;
		bidAddBlocks = _bidAddBlocks;

		// start the auction
		prize = initialPrize;
		currentWinner = collector;
		lastBidBlock = block.number;
		blockEnded = block.number + _initialBlocks;

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
		if (msg.value != bidPrice) {
			errorAndRefund("Could not bid: Value sent must match bidPrice.");
			return;
		}

		// calculate the fee amount
		uint _feeIncr = (bidPrice * bidFeePct)/100;
		uint _prizeIncr = bidPrice - _feeIncr;

		if (block.number != lastBidBlock) {
			// this is a new bid
			numBids++;
			fees += _feeIncr;
			prize += _prizeIncr;
			blockEnded += bidAddBlocks;
			lastBidBlock = block.number;
		} else {
			// this bid is in the same block as the previous bid.
			// - try to refund the previous bidder
			// - on refund failure, count this bid as a new bid.
			if (currentWinner.send(bidPrice)) {
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
	function payWinner(uint _gasLimit)
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

		bool _paySuccessful = false;
		if (_gasLimit == 0) {
			_paySuccessful = currentWinner.call.value(prize)();
		} else {
			_paySuccessful = currentWinner.call.value(prize).gas(_gasLimit)();
		}

        if (_paySuccessful) {
        	// mark as paid
        	isPaid = true;
        	PaymentSuccess({
				time: now,
	            redeemer: msg.sender,
	            recipient: currentWinner,
	            amount: prize,
	            gasLimit: _gasLimit
	        });
			return (true, prize);
        } else {
        	// log payment failed
        	PaymentFailure({
        		time: now,
        		redeemer: msg.sender,
        		recipient: currentWinner,
        		amount: prize,
        		gasLimit: _gasLimit
        	});
            return (false, 0);        	
        }
	}
	
	/**
	Sends the fees to the collector, or throws
	*/
	function collectFees()
		public
	    noRentry
	    returns (bool _success, uint _feesSent)
    {
		if (fees == 0) return(true, 0);

		// attempt to send, rollback if unsuccessful
		if (collector.call.value(fees)()) {
			_feesSent = fees;
			fees = 0;
			FeeCollectionSuccess(now, _feesSent);
			return (true, _feesSent);
		} else {
			FeeCollectionFailure(now);
			return (false, 0);
		}
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
}