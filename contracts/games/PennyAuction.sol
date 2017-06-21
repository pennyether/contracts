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

	address public admin;			// can start auction, can send prize, can send fees
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
	uint public fees;				// total fees able to be collect
	
    // modifiers
    // note: they only error, and should not be used on payable functions
	modifier fromAdmin() { 
		if (msg.sender == admin) _;
	    else Error("Only callable by admin");
	}
	modifier fromAdminOrWinner() {
		if (msg.sender == admin || msg.sender == currentWinner) _;
	    else Error("Only callable by admin or winner");
	}
	modifier onlyDuring(State _s) {
		if (state == _s) _;
		else Error("Not callable in current state");
	}

	// only allow one "reRentry" call on the stack at a time
	bool private locked;
	modifier noRentry() { require(!locked); locked = true; _; locked = false; }

	event Error(string msg);
	event Started(uint time);
	event BidOccurred(uint time, address bidder);
	event Closed(uint time, address winner, uint prize, uint numBids);
	event Redeemed(uint time, address redeemer, address recipient, uint amount);
	event RedeemFailed(uint time, address redeemer, address recipient, uint amount);

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
	This does not error, it only throws, so refund is ensured.
	*/
	function open() payable {
    	require(state == State.PENDING);
    	require(msg.sender == admin);
		require(msg.value == initialPrize);

		state = State.OPENED;
		prize = initialPrize;
		currentWinner = collector;
		timeOpened = now;
		timeClosed = now + auctionTimeS;

		Started(now);
	}

	/**
	Checks for proper state, time, currentWinner, and bidPrice.
	If all is good, will set current sender to winner and update time.
	Upon failure, will Error and refund sender.
	*/
	function() payable {
		// note: for all other states, time check is sufficient
		if (state == State.PENDING) {
			errorAndRefund("Cannot bid when auction is pending");
			return;
		}
		// check that there is still time to bid
		if (now >= timeClosed) {
			errorAndRefund("Cannot bid after timeClosed");
			return;
		}
		// check sender
		if (msg.sender == currentWinner) {
			errorAndRefund("You are already the current winner");
			return;
		}
		// check that bid amount is correct
		if (msg.value != bidPrice) {
			errorAndRefund("Value must match bidPrice");
			return;
		}

		// increment prize by the msg value (minus the fee)
		uint _fee = (msg.value * bidFeePct)/100;
		fees += _fee;
		prize += msg.value - _fee;
		numBids++;

		// set the current winner and the time.
		currentWinner = msg.sender;
		timeClosed += bidTimeS;
		
		BidOccurred({time: now, bidder: msg.sender});
	}


	/**
	If the auction is open and the time is past timeClosed, the auction will close.
	To ensure the auction can always be completed, this is callable by anyone.
	*/
	function close()
		onlyDuring(State.OPENED)
		returns (bool _success)
	{
		if (now < timeClosed) {
		    Error("Time not yet expired");
		    return false;
		}
		
		// setting this allows redeem() to be called by the winner.
        state = State.CLOSED;

		Closed({
			time: now,
            winner: currentWinner,
            prize: prize,
            numBids: numBids
        });

        return true;
	}

	/**
	Run by the winner or admin (if they are nice enough to pay gas)
	Sends the prize to the currentWinner and sets auction to REDEEMED.
	*/
	function redeem()
	    noRentry
	    onlyDuring(State.CLOSED)
	    fromAdminOrWinner
	    returns (bool _success, uint _prizeSent)
	{
		state = State.REDEEMED;
		
		// send prize with gasLimit as admin, otherwise without
		bool _didRedeem = false;
		if (msg.sender == admin) {
			_didRedeem = currentWinner.send(prize);
		} else if (msg.sender == currentWinner) {
			_didRedeem = currentWinner.call.value(prize)();
		}

		// rollback on failure
        if (!_didRedeem) {
        	RedeemFailed({
        		time: now,
        		redeemer: msg.sender,
        		recipient: currentWinner,
        		amount: prize
        	});
            state = State.CLOSED;
            return (false, 0);
        }
		
		// log the attempt for good record keeping
		Redeemed({
			time: now,
            redeemer: msg.sender,
            recipient: currentWinner,
            amount: prize
        });
		return (true, prize);
	}
	
	/**
	run by the admin to send current fees to collector
	*/
	function redeemFees()
	    noRentry
	    fromAdmin
	    returns (bool _success, uint _feesSent)
    {
		if (fees == 0) {
			Error("No fees to redeem");
			return (false, 0);
		}
		
		// copy _fees so we can return it or rollback
		_feesSent = fees;
		fees = 0;

		// attempt to send, rollback if unsuccessful
		if (!collector.call.value(_feesSent)()) {
			Error("Failed to send to collector");
			fees = _feesSent;
			return (false, 0);
		} else {
			return (true, _feesSent);
		}
	}

	// called from payable functions to refund the sender
	// if we cannot refund, throw so that the tx reverts
	function errorAndRefund(string _errMsg) private {
		Error(_errMsg);
		if (!msg.sender.call.value(msg.value)()){
		 	throw;
		}
	}

	// Whether or not you can call closeAuction() on the auction
	function isCloseable() constant returns (bool _bool) {
		return (state == State.OPENED && now >= timeClosed);
	}

	// Returns if the auction is closed
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