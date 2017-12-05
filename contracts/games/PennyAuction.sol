pragma solidity ^0.4.0;

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
	address public collector;		// address that fees get sent to

	uint public initialPrize;		// amt initially staked
	uint public bidPrice;			// cost to become the current winner
	uint public bidFeePct;			// amt of bid that gets kept as fees
	uint public bidTimeS;	        // amt of time auction is extended
    uint public timeStarted;		// time auction started

	uint public prize;				// current prize
	address public currentWinner;	// address of last bidder
	uint public currentBlock;		// block of the last bid
	uint public timeEnded;		    // the time at which no further bids can occur

	uint public numBids;			// total number of bids
	uint public fees;				// current fees collectable

	bool public isPaid;				// whether or not the winner has been paid

	// only allow ONE "reRentry" call on the stack at a time
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }

	event Error(uint time, string msg);
	event Started(uint time, uint auctionTimeS);
	event BidOccurred(uint time, address bidder);
	event BidRefunded(uint time, address bidder);
	event Paid(uint time, address redeemer, address recipient, uint amount, uint gasLimit);
	event PaymentFailed(uint time, address redeemer, address recipient, uint amount, uint gasLimit);

	function PennyAuction(
	        address _collector,
		    uint _initialPrize,
		    uint _bidPrice,
		    uint _bidTimeS,
		    uint _bidFeePct,
	        uint _auctionTimeS
		)
		payable
	{
        require(_initialPrize > 0);     	// there is an initial prize
        require(_bidPrice > 0);				// bid price must be positive
        require(_bidTimeS >= 60);	    	// minimum of 1 minute
        require(_bidFeePct <= 100);	    	// bid fee cannot be more than 100%.
        require(_auctionTimeS >= 600);  	// minimum of 5 minutes
        require(msg.value == _initialPrize); // must've sent the prize amount

        // set instance variables
		collector = _collector;
        initialPrize = _initialPrize;
		bidPrice = _bidPrice;
		bidTimeS = _bidTimeS;
		bidFeePct = _bidFeePct;

		// start the auction
		prize = initialPrize;
		timeStarted = now;
		timeEnded = now + _auctionTimeS;
		currentWinner = collector;
		currentBlock = block.number;

		Started(now, _auctionTimeS);
	}

	/**
	Upon new bid, adds fees and increments time and prize.
	- Refunds if bid is too late, already winner, or incorrect bid value.
	- Upon a bid-in-same-block, refends previous bidder.
	- Sending refund to external address may cause another bid, so we
	  mark this as noRentry.
	*/
	function()
		noRentry
		payable
	{
		// check that there is still time to bid
		if (isEnded()) {
			errorAndRefund("Cannot bid: Auction has already ended.");
			return;
		}
		// check sender
		if (msg.sender == currentWinner) {
			errorAndRefund("Cannot bid: You are already the current winner.");
			return;
		}
		// check that bid amount is correct
		if (msg.value != bidPrice) {
			errorAndRefund("Cannot bid: Value sent must match bidPrice.");
			return;
		}

		// calculate the fee amount
		uint _feeIncr = (bidPrice * bidFeePct)/100;
		uint _prizeIncr = bidPrice - _feeIncr;

		if (block.number != currentBlock) {
			// this is a new bid
			numBids++;
			fees += _feeIncr;
			prize += _prizeIncr;
			timeEnded += bidTimeS;
			currentBlock = block.number;
		} else {
			// this bid is in the same block as the previous bid.
			// - try to refund the previous bidder
			// - on refund failure, count this bid as a new bid.
			if (currentWinner.send(bidPrice)) {
				BidRefunded({time: now, bidder: currentWinner});
			} else {
				numBids++;
				fees += _feeIncr;
				prize += _prizeIncr;
			}
		}

		// always update current winner and emit event
		currentWinner = msg.sender;
		BidOccurred({time: now, bidder: msg.sender});
	}

	/**
	Sends prize to the current winner using _gasLimit (0 is unlimited)
	*/
	function payWinner(uint _gasLimit)
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
        	Paid({
				time: now,
	            redeemer: msg.sender,
	            recipient: currentWinner,
	            amount: prize,
	            gasLimit: _gasLimit
	        });
			return (true, prize);
        } else {
        	// log payment failed
        	PaymentFailed({
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
	Sends the fees to the collector
	*/
	function collectFees()
	    noRentry
	    returns (bool _success, uint _feesSent)
    {
		if (fees == 0) {
			Error(now, "No fees to redeem");
			return (false, 0);
		}

		// attempt to send, rollback if unsuccessful
		if (collector.call.value(fees)()) {
			_feesSent = fees;
			fees = 0;
			return (true, _feesSent);
		} else {
			Error(now, "Failed to send to collector");
			return (false, 0);
		}
	}

	// called from payable functions to refund the sender
	// if we cannot refund, throw so that the tx reverts
	function errorAndRefund(string _errMsg) private {
		Error(now, _errMsg);
		if (!msg.sender.call.value(msg.value)()){
		 	throw;
		}
	}

	// Returns true if the auction has ended
	function isEnded() constant returns (bool _bool) {
		return now >= timeEnded;
	}
	
	// returns the time remaining, or 0.
	function getTimeRemaining() constant returns (uint _timeRemaining) {
	    if (isEnded()) return 0;
	    return timeEnded - now;
	}
}