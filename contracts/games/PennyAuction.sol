pragma solidity ^0.4.19;

/**
A PennyAuction to win a prize.

How it works:
    - Initial prize is held in contract.
    - Bid price is a const amount.
    - On bid (sending bidPrice to fallback function):
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

Other notes:
    - Accrued fees can be sent to `collector` at any time by calling .sendFees().
    - Prize can be sent to `winner` once auction has ended via .sendPrize().
*/
contract PennyAuction {
    // We store values as GWei to reduce storage to 64 bits.
    // int64: 2^63 GWei is ~ 9 billion Ether, so no overflow risk.
    //
    // For blocks, we use uint32, which has a max value of 4.3 billion
    // At a 1 second block time, there's a risk of overflow in 120 years.
    //
    // We put these variables together because they are all written to
    // on each bid. This should save some gas when we write.
    struct Vars {
        // [first 256-bit segment]
        address currentWinner;  // address of last bidder
        uint64 prizeGwei;        // (Gwei) the current prize
        uint32 numBids;         // total number of bids

        // [second 256-bit segment]
        uint32 blockEnded;      // the time at which no further bids can occur  
        uint32 lastBidBlock;    // block of the last bid
        bool isPaid;            // whether or not the winner has been paid
    }
    struct Const {
        // [first 256-bit segment]
        address collector;       // address that fees get sent to
        uint64 initialPrizeGwei; // (Gwei > 0) amt initially staked
        // [second 256-bit segment]
        uint64 bidPriceGwei;     // (Gwei > 0) cost to become the current winner
        int64 bidIncrGwei;       // amount added/removed to prize on bid.
        uint32 bidAddBlocks;     // number of blocks auction is extended
    }

    Vars vars;
    Const const;
    uint constant version = 1;

    event SendPrizeError(uint time, string msg);
    event Started(uint time, uint initialBlocks);
    event BidOccurred(uint time, address indexed bidder);
    event BidRefundSuccess(uint time, string msg, address indexed bidder);
    event BidRefundFailure(uint time, string msg, address indexed bidder);
    event SendPrizeSuccess(uint time, address indexed redeemer, address indexed recipient, uint amount, uint gasLimit);
    event SendPrizeFailure(uint time, address indexed redeemer, address indexed recipient, uint amount, uint gasLimit);
    event FeesSent(uint time, address indexed collector, uint amount);

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
        require(_initialPrize >= 1e9);              // min value of 1 GWei
        require(_initialPrize < 1e6 * 1e18);        // max value of a million ether
        require(_initialPrize % 1e9 == 0);          // even amount of GWei
        require(_bidPrice >= 1e6);                  // min value of 1 GWei
        require(_bidPrice < 1e6 * 1e18);            // max value of a million ether
        require(_bidPrice % 1e9 == 0);              // even amount of GWei
        require(_bidIncr <= int(_bidPrice));        // max value of _bidPrice
        require(_bidIncr >= -1*int(_initialPrize)); // min value of -1*initialPrize
        require(_bidIncr % 1e9 == 0);               // even amount of GWei
        require(_bidAddBlocks >= 1);                // minimum of 1 block
        require(_initialBlocks >= 1);               // minimum of 1 block
        require(msg.value == _initialPrize);        // must've sent the prize amount

        // Set instance variables. these never change.
        // These can be safely cast to int64 because they are each < 1e24 (see above),
        // 1e24 divided by 1e9 is 1e15. Max int64 val is ~1e19, so plenty of room.
        // For block numbers, uint32 is good up to ~4e12, a long time from now.
        const.collector = _collector;
        const.initialPrizeGwei = uint64(_initialPrize / 1e9);
        const.bidPriceGwei = uint64(_bidPrice / 1e9);
        const.bidIncrGwei = int64(_bidIncr / 1e9);
        const.bidAddBlocks = uint32(_bidAddBlocks);

        // Initialize the auction variables.
        vars.prizeGwei = const.initialPrizeGwei;
        vars.currentWinner = _collector;
        vars.lastBidBlock = uint32(block.number);
        vars.blockEnded = uint32(block.number + _initialBlocks);

        Started(now, _initialBlocks);
    }


    /*************************************************************/
    /********** BIDDING ******************************************/
    /*************************************************************/
    //
    // Upon new bid, adds fees and increments time and prize.
    //  - Refunds if bid is too late, user is already winner, or incorrect value passed.
    //  - Upon a bid-in-same-block, refends previous bidder.
    //
    // Gas Cost: 32k - 43k
    //   Valid Bid: 36k, 41k, 43k
    //     - 22k: tx overhead
    //     -  2k: event: BidOccurred
    //     -  2k: SLOADs, execution
    //     Clean: 36k
    //       - 10k: update Vars (numBids, prizeGWei, blockEnded, lastBidBlock, currentWinner)
    //     Refund Success: 41k
    //       -  3k: send
    //       -  2k: event: BidRefundSuccess
    //     Refund Failure: 43k
    //       - 10k: send failure
    //       -  2k: event: BidRefundFailure
    //       -  5k: update Vars (currentWinner, prizeGwei, numBids)
    //
    //  Invalid Bid: 32k
    //    - 22k: tx overhead
    //    -  3k: send to msg.sender
    //    -  2k: 1 event: BidRefundSuccess
    //    -  2k: SLOADs, execution
    function()
        public
        payable
    {
        if (isEnded())
            return errorAndRefund("Auction has already ended.");
        if (msg.sender == vars.currentWinner)
            return errorAndRefund("You are already the current winner.");
        if (msg.value != bidPrice())
            return errorAndRefund("Value sent must match bidPrice.");
        int _newPrizeGwei = int(vars.prizeGwei) + const.bidIncrGwei;
        if (_newPrizeGwei < 0)
            return errorAndRefund("Bidding would result in a negative prize.");

        // Attempt refund, if necessary. Use minimum gas.
        address _prevBidder = vars.currentWinner;        
        bool _isClean = (block.number != vars.lastBidBlock);
        bool _isRefundSuccess;
        if (!_isClean) {
            _isRefundSuccess = _prevBidder.send(msg.value);   
        }

        // These blocks can be made nicer, but optimizer will
        //  sometimes do two updates instead of one. Seems it is
        //  best to keep if/else trees flat.
        if (_isClean) {
            vars.currentWinner = msg.sender;
            vars.numBids++;
            vars.prizeGwei = uint64(_newPrizeGwei);
            vars.blockEnded += uint32(const.bidAddBlocks);
            vars.lastBidBlock = uint32(block.number);
        }
        if (!_isClean && _isRefundSuccess){
            vars.currentWinner = msg.sender;
        }
        if (!_isClean && !_isRefundSuccess){
            vars.currentWinner = msg.sender;   
            vars.prizeGwei = uint64(_newPrizeGwei);
            vars.numBids++;
        }

        // Emit the proper events
        if (!_isClean){
            if (_isRefundSuccess)
                BidRefundSuccess(now, "Another bid occurred on the same block.", _prevBidder);
            else
                BidRefundFailure(now, ".send() failed.", _prevBidder);
        }
        BidOccurred({time: now, bidder: msg.sender});
    }
        // called from the bidding function above.
        // refunds sender, or throws to revert entire tx.
        function errorAndRefund(string _msg)
            private
        {
            require(msg.sender.call.value(msg.value)());
            BidRefundSuccess({time: now, msg: _msg, bidder: msg.sender});
        }


    /*************************************************************/
    /********** PUBLIC FUNCTIONS *********************************/
    /*************************************************************/

    // Sends prize to the current winner using _gasLimit (0 is unlimited)
    function sendPrize(uint _gasLimit)
        public
        returns (bool _success, uint _prizeSent)
    {
        // make sure auction has indeed ended
        if (!isEnded()) {
            SendPrizeError(now, "The auction has not ended.");
            return (false, 0);
        }
        // make sure auction wasnt already paid
        // (doesnt really matter as balance would be 0 anyway)
        if (vars.isPaid) {
            SendPrizeError(now, "The prize has already been paid.");
            return (false, 0);
        }

        vars.isPaid = true;
        uint _prize = prize();
        bool _paySuccessful = false;
        if (_gasLimit == 0) {
            _paySuccessful = vars.currentWinner.call.value(_prize)();
        } else {
            _paySuccessful = vars.currentWinner.call.value(_prize).gas(_gasLimit)();
        }

        if (_paySuccessful) {
            SendPrizeSuccess({
                time: now,
                redeemer: msg.sender,
                recipient: vars.currentWinner,
                amount: _prize,
                gasLimit: _gasLimit
            });
            return (true, _prize);
        } else {
            // rollback, and log payment failed
            vars.isPaid = false;
            SendPrizeFailure({
                time: now,
                redeemer: msg.sender,
                recipient: vars.currentWinner,
                amount: _prize,
                gasLimit: _gasLimit
            });
            return (false, 0);          
        }
    }
    
    // Sends accrued fees to the collector. Callable by anyone.
    function sendFees()
        public
        returns (uint _feesSent)
    {
        if (fees() == 0) return;
        _feesSent = fees();
        require(const.collector.call.value(_feesSent)());
        FeesSent(now, const.collector, _feesSent);
    }



    /*************************************************************/
    /********** PUBLIC VIEW **************************************/
    /*************************************************************/

    // Expose all Vars ////////////////////////////////////////
    function currentWinner() public view returns (address) {
        return vars.currentWinner;
    }
    function prize() public view returns (uint) {
        int _initialPrize = int(const.initialPrizeGwei) * 1e9;
        int _bidIncrs = int(const.bidIncrGwei) * vars.numBids * 1e9;
        return uint(_initialPrize + _bidIncrs);
    }
    function numBids() public view returns (uint) {
        return vars.numBids;
    }
    function blockEnded() public view returns (uint) {
        return vars.blockEnded;
    }
    function lastBidBlock() public view returns (uint) {
        return vars.lastBidBlock;
    }
    function isPaid() public view returns (bool) {
        return vars.isPaid;
    }
    ///////////////////////////////////////////////////////////

    // Expose all Consts //////////////////////////////////////
    function collector() public view returns (address) {
        return const.collector;
    }
    function initialPrize() public view returns (uint){
        return uint(const.initialPrizeGwei) * 1e9;
    }
    function bidPrice() public view returns (uint) {
        return uint(const.bidPriceGwei) * 1e9;
    }
    function bidIncr() public view returns (int) {
        return int(const.bidIncrGwei) * 1e9;
    }
    function fees() public view returns (uint) {
        return vars.isPaid ? this.balance : this.balance - prize();
    }
    function bidAddBlocks() public view returns (uint) {
        return const.bidAddBlocks;
    }
    ///////////////////////////////////////////////////////////

    // The following are computed /////////////////////////////
    function isEnded() public view returns (bool) {
        return block.number >= vars.blockEnded;
    }
    function getBlocksRemaining() public view returns (uint) {
        if (isEnded()) return 0;
        return vars.blockEnded - block.number;
    }
    function totalFees() public view returns (uint) {
        int _feePerBidGwei = int(const.bidPriceGwei) - const.bidIncrGwei;
        return uint(_feePerBidGwei * vars.numBids * 1e9);
    }
    ///////////////////////////////////////////////////////////
}