pragma solidity ^0.4.0;

/**
An auction for $_initialPrize.

An address may bid exactly $_bidPrice, in which case they
are entitled to the prize if nobody else bids within $_bidTimeS.

For each bid, a fee is taken, and the rest added to the prize.

The winning bidder can obtain their payout once the auction is
closed.  First .close() must be called to officially end the
auction, then .redeem() may be called.

The admin can redeem fees to the collector at any time.

------------------------

The auction will transition through four states, in order:

	PENDING:  	  	The auction has been set up, but not yet started.
					No bids may be accepted.  Only .open() may be 
					called by the admin.

	OPENED:  	  	Funds have been transferred to the auction and it is
					open for bidding.  If no one bids, the auction will
					expire in $auctionTimeS, and the admin can redeem.
					If someone bids, they become the current winner,
					the prize is increased, and the auction time extended.

	[CLOSEABLE]:    Not really a state, but can be read via .isCloseable().
				    When true, the auction is OPENED but time has expired.
				    No more bidding may occur during this phase.
				    It is waiting to have .close() called (by anyone).

	CLOSED:			The auction is officially closed, and the prize can
					be redeemed by the winner.

	REDEEMED:		The winner was sent the prize.


*/
//@createInterface
contract PennyAuction {
    enum State {PENDING, OPENED, CLOSED, REDEEMED}

	address public admin;			// can start auction, can redeem prize, can redeem fees
	address public collector;		// address that fees get sent to

	uint public initialPrize;		// amt initially staked
	uint public bidPrice;			// cost to become the current winner
	uint public bidFeePct;			// amt of bid that gets kept as fees
	uint public bidTimeS;	        // amt of time auction is extended
    uint public auctionTimeS;       // amt of time auction starts with
    uint public timeOpened;		    // time auction was opened

	State public state;			    // current state
	uint public prize;				// current prize
	address public currentWinner;	// current winner
	uint public timeClosed;		    // the time at which no further bids can occur

	uint public numBids;			// total number of bids
	uint public fees;				// total fees collected
	
	// when added as a modifier, all next modifiers will throw instead of error.
	bool private strict;
    modifier strictly() {strict = true; _; strict = false;}
    // modifiers
	modifier fromAdmin() { 
		if (msg.sender == admin) _;
	    else strict ? require(false) : Error("Only callable by admin");
	}
	modifier fromCollector() {
		if (msg.sender == collector) _;
        else strict ? require(false) : Error("Only callable by collector");
	}
	modifier fromAdminOrWinner() {
		if (msg.sender == admin || msg.sender == currentWinner) _;
	    else strict ? require(false) : Error("Only callable by admin or winner");
	}
	modifier fromNotWinner() {
		if (msg.sender != currentWinner) _;
		else strict ? require(false) : Error("Not callable by winner");
	}
	modifier onlyDuring(State _s) {
		if (state == _s) _;
		else strict ? require(false) : Error("Not callable in current state");
	}

	// only allow one "reRentry" call on the stack at a time
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }

	event Error(string msg);
	event Started(uint time);
	event BidOccurred(address bidder, uint time);
	event Closed(address winner, uint time, uint prize, uint numBids);
	event RedeemAttempted(address redeemer, address recipient, uint time, uint amtSent, bool successful);

	function PennyAuction(
		address _admin,
        address _collector,
	    uint _initialPrize,
	    uint _bidPrice,
	    uint _bidTimeS,
	    uint _bidFeePct,
        uint _auctionTimeS
	) {
        require(_initialPrize > 0);     // there is an initial prize
        require(_bidPrice > 0);			// bid price must be positive
        require(_bidTimeS >= 60);	    // minimum of 1 minute
        require(_bidFeePct <= 100);	    // bid fee cannot be more than 100%.
        require(_auctionTimeS >= 600);  // minimum of 5 minutes

		admin = _admin;
		collector = _collector;
        initialPrize = _initialPrize;
		bidPrice = _bidPrice;
		bidTimeS = _bidTimeS;
		bidFeePct = _bidFeePct;
		auctionTimeS = _auctionTimeS;
		state = State.PENDING;
	}

	/**
	Called by the admin to start the auction.  Can only be called once.
	*/
	function open()
	    payable
	    onlyDuring(State.PENDING)
	    fromAdmin
	    returns (bool _success)
    {
		if (msg.value != initialPrize) {
			Error("Value sent must equal initialPrize");
			return false;
		}

		state = State.OPENED;
		prize = initialPrize;
		currentWinner = collector;
		timeOpened = now;
		timeClosed = now + auctionTimeS;

		Started(now);
		return true;
	}

	/**
	If auction is still active, and sender is not already the winner
	set the sender as winner and extend auction time.
	*/
	function()
	    payable
	    strictly
	    onlyDuring(State.OPENED)
	    fromNotWinner
	{
		// make sure bid is correct and that auction is not closed
		require(now < timeClosed);
		require(msg.value == bidPrice);

		// increment prize by the msg value (minus the fee)
		// increment fees so we know how much we can take out
		uint _fee = (msg.value * bidFeePct)/100;
		fees += _fee;
		prize += msg.value - _fee;

		// set the current winner and the time.
		currentWinner = msg.sender;
		timeClosed += bidTimeS;
		numBids++;

		BidOccurred({bidder: msg.sender, time: now});
	}


	/**
	Triggers AuctionCompleted if the auction has just finished.
	Should be called when the now > _timeClosed, via offchain watcher.
	To ensure auction can always be completed, this is callable by anyone.
	*/
	function close()
		onlyDuring(State.OPENED)
		returns (bool _success)
	{
		if (now < timeClosed) {
		    Error("Time not yet expired.");
		    return false;
		}
		
        state = State.CLOSED;

		Closed({
            winner: currentWinner,
            time: now,
            prize: prize,
            numBids: numBids
        });

        return true;
	}

	/**
	Run by the winner (or if the admin wants to pay gas, then the admin)
	Returns amount of prize sent, or 0 on failure.
	*/
	function redeem()
	    noRentry
	    onlyDuring(State.CLOSED)
	    fromAdminOrWinner
	    returns (bool _success, uint _prizeSent)
	{
		state = State.REDEEMED;
		bool _didRedeem = true;

		// send prize with gasLimit as admin, otherwise without
		if (msg.sender == admin) {
			_didRedeem = currentWinner.send(prize);
		} else if (msg.sender == currentWinner) {
			_didRedeem = currentWinner.call.value(prize)();
		}

		// rollback on failure
        if (!_didRedeem) {
            state = State.CLOSED;
            _didRedeem = false;
        }
		
		// log the attempt for good record keeping
		RedeemAttempted({
            redeemer: msg.sender,
            recipient: currentWinner,
            time: now,
            amtSent: prize,
            successful: _didRedeem
        });

        // return the amount sent, or 0 on failure
		return _didRedeem ? (true, prize) : (false, 0);
	}
	
	/** run by the admin to redeem current fees to collector */
	function redeemFees()
	    noRentry
	    fromAdmin
	    returns (bool _success, uint _feesSent)
    {
		if (fees == 0) {
			Error("No fees to redeem");
			return (false, 0);
		}
		
		// copy _fees so we can return it
		_feesSent = fees;
		fees = 0;
		// attempt to send
		if (!collector.call.value(_feesSent)()) {
			Error("Failed call to collector");
			fees = _feesSent;
			return (false, 0);
		} else {
			return (true, _feesSent);
		}
	}


	// Whether or not you can call closeAuction() on the auction
	function isCloseable() constant returns (bool _bool) {
		return (state == State.OPENED && now >= timeClosed);
	}

	// self-explainatory, i hope
	function isClosed() constant returns (bool _bool) {
		return (state == State.CLOSED);
	}

	// This is so anyone watching the auction knows it is no longer opened.
	function isClosedOrRedeemed() constant returns (bool _bool) {
		return (state > State.OPENED);
	}
	
	// returns the time remaining, or 0.
	function getTimeRemaining() constant returns (uint _timeRemaining) {
	    if (now >= timeClosed) return 0;
	    return timeClosed - now;
	}
}