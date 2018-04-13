pragma solidity ^0.4.19;

import "../common/HasDailyLimit.sol";
import "../common/Bankrollable.sol";
import "../roles/UsingAdmin.sol";
import "../roles/UsingPennyAuctionFactory.sol";

// An interface to PennyAuction instances.
interface IPennyAuction {
    function prize() public constant returns(uint);
    function numBids() public constant returns(uint);
    function fees() public constant returns (uint _fees);
    function currentWinner() public constant returns (address _addr);
    function isEnded() public constant returns (bool _bool);
    function isPaid() public constant returns (bool _bool);
    function sendPrize(uint _gasLimit) public returns (bool _success, uint _prizeSent);
    function sendFees() public returns (uint _feesSent);
}

/*

  PennyAuctionController manages a list of PreDefinedAuctions.
  PreDefinedAuctions' parameters are definable by the Admin.
  These auctions can be started, ended, or refreshed by anyone.

  Starting auctions uses the funds in this contract, unless called via
  .startDefinedAuctionManually(), in which case it uses the funds sent.

  All revenues of any started auctions will come back to this contract.

  Since this contract inherits Bankrollable, it is able to be funded
  via the Registry (or by anyone whitelisted). Profits will go to the
  Treasury, and can be triggered by anyone.

*/
contract PennyAuctionController is
    HasDailyLimit,
	Bankrollable,
    UsingAdmin,
	UsingPennyAuctionFactory
{
    uint constant public version = 1;

	// just some accounting/stats stuff to keep track of
	uint public totalFees;
	uint public totalPrizes;
	uint public totalBids;
	IPennyAuction[] public endedAuctions;

	// An admin-controlled index of available auctions.
    uint public numDefinedAuctions;
    mapping (uint => DefinedAuction) public definedAuctions;
    struct DefinedAuction {
        IPennyAuction auction;  // address of ongoing auction (or 0)
        bool isEnabled;			// if true, can be started
        string summary;			// definable via editDefinedAuction
        uint initialPrize;		// definable via editDefinedAuction
        uint bidPrice;			// definable via editDefinedAuction
        int bidIncr;            // definable via editDefinedAuction
        uint bidAddBlocks;		// definable via editDefinedAuction
        uint initialBlocks;		// definable via editDefinedAuction
    }

    event Created(uint time);
    event DailyLimitChanged(uint time, address indexed owner, uint newValue);
	event Error(uint time, string msg);
	event DefinedAuctionEdited(uint time, uint index);
    event DefinedAuctionInvalid(uint time, uint index);
	event AuctionStarted(uint time, uint indexed index, address indexed addr, uint initialPrize);
	event AuctionEnded(uint time, uint indexed index, address indexed winner, address indexed addr);
	event FeesCollected(uint time, uint amount);


	function PennyAuctionController(address _registry) 
        HasDailyLimit(10 ether)
        Bankrollable(_registry)
        UsingAdmin(_registry)
        UsingPennyAuctionFactory(_registry)
        public
	{
        Created(now);
    }

    /*************************************************************/
    /******** OWNER FUNCTIONS ************************************/
    /*************************************************************/

    function setDailyLimit(uint _amount)
        public
        fromOwner
    {
        _setDailyLimit(_amount);
        DailyLimitChanged(now, msg.sender, _amount);
    }


    /*************************************************************/
    /******** ADMIN FUNCTIONS ************************************/
    /*************************************************************/

	// allows admin to edit or add an available auction
	function editDefinedAuction(
        uint _index,
        string _summary,
        uint _initialPrize,
        uint _bidPrice,
        int _bidIncr,
        uint _bidAddBlocks,
        uint _initialBlocks
    )
        public
        fromAdmin
        returns (bool _success)
    {
    	if (_index > numDefinedAuctions) {
    		Error(now, "Index out of bounds.");
    		return;
    	}

    	if (_index == numDefinedAuctions) numDefinedAuctions++;
        definedAuctions[_index].summary = _summary;
        definedAuctions[_index].initialPrize = _initialPrize;
        definedAuctions[_index].bidPrice = _bidPrice;
        definedAuctions[_index].bidIncr = _bidIncr;
        definedAuctions[_index].bidAddBlocks = _bidAddBlocks;
        definedAuctions[_index].initialBlocks = _initialBlocks;
        DefinedAuctionEdited(now, _index);
        return true;
    }

    function disableDefinedAuction(uint _index)
        public
    	fromAdmin
    	returns (bool _success)
    {
    	if (_index >= numDefinedAuctions) {
    		Error(now, "Index out of bounds.");
    		return;
    	}
    	definedAuctions[_index].isEnabled = false;
    	DefinedAuctionEdited(now, _index);
    	return true;
    }

    function enableDefinedAuction(uint _index)
        public
    	fromAdmin
    	returns (bool _success)
    {
    	if (_index >= numDefinedAuctions) {
    		Error(now, "Index out of bounds.");
    		return;
    	}
    	definedAuctions[_index].isEnabled = true;
    	DefinedAuctionEdited(now, _index);
    	return true;
    }


    /*************************************************************/
    /******* PUBLIC FUNCTIONS ************************************/
    /*************************************************************/

    function () public payable {
         totalFees += msg.value;
    }

	// This is called by anyone when a new PennyAuction should be started.
	// In reality will only be called by TaskManager.
    //
	// Errors if:
	//		- isEnabled is false (or doesnt exist)
	//		- auction is already started
	// 		- not enough funds
    //      - PAF.getCollector() points to another address
	//		- unable to create auction
	function startDefinedAuction(uint _index)
        public
        returns (address _auction)
    {
        DefinedAuction memory dAuction = definedAuctions[_index];
        if (_index >= numDefinedAuctions) {
    		_error("Index out of bounds.");
    		return;
    	}
        if (dAuction.isEnabled == false) {
        	_error("DefinedAuction is not enabled.");
        	return;
        }
        if (dAuction.auction != IPennyAuction(0)) {
        	_error("Auction is already started.");
        	return;
        }
        if (this.balance < dAuction.initialPrize) {
        	_error("Not enough funds to start this auction.");
        	return;
        }
        if (getDailyLimitRemaining() < dAuction.initialPrize) {
            _error("Starting game would exceed daily limit");
            return;
        }

        // Ensure that if this game is started, revenue comes back to this contract.
        IPennyAuctionFactory _paf = getPennyAuctionFactory();
        if (_paf.getCollector() != address(this)){
            _error("PAF.getCollector() points to a different contract.");
            return;
        }

        // try to create auction via factory
        bool _success = _paf.call.value(dAuction.initialPrize)(
            bytes4(keccak256("createAuction(uint256,uint256,int256,uint256,uint256)")),
            dAuction.initialPrize,
            dAuction.bidPrice,
            dAuction.bidIncr,
            dAuction.bidAddBlocks,
            dAuction.initialBlocks
        );
        if (!_success) {
            DefinedAuctionInvalid(now, _index);
            _error("PennyAuctionFactory could not create auction (invalid params?)");
            return;
        }

		// Get the auction, add it to definedAuctions, and return.
        _useFromDailyLimit(dAuction.initialPrize);
        _auction = _paf.lastCreatedAuction();
        definedAuctions[_index].auction = IPennyAuction(_auction);
        AuctionStarted(now, _index, _auction, dAuction.initialPrize);
        return _auction;
	}
        // Emits an error with a given message
        function _error(string _msg)
            private
        {
            Error(now, _msg);
        }

    function startDefinedAuctionManually(uint _index)
        public
        payable
        returns (address _auction)
    {
        // refund if invalid value sent.
        DefinedAuction memory dAuction = definedAuctions[_index];
        if (msg.value != dAuction.initialPrize) {
            _error("Value sent does not match initialPrize.");
            require(msg.sender.call.value(msg.value)());
            return;
        }

        // refund if .startDefinedAuction fails
        _auction = startDefinedAuction(_index);
        if (_auction == address(0)) {
            require(msg.sender.call.value(msg.value)());
        }
    }

    // Looks at all active defined auctions and:
    //	- tells each auction to send fees to Treasury
    //  - if ended: tries to pay winner, moves to endedAuctions
	function refreshAuctions()
        public
        returns (uint _numAuctionsEnded, uint _feesCollected)
    {
    	for (uint _i = 0; _i < numDefinedAuctions; _i++) {
    		var _auction = definedAuctions[_i].auction;
    		if (_auction == IPennyAuction(0)) continue;

    		// try to redeem fees. this can fail if Treasury throws
            // that should realistically never happen.
    		uint _fees = _auction.sendFees();
            _feesCollected += _fees;

			// attempt to pay winner, update stats, and set auction to empty.
			if (_auction.isEnded()) {
                // paying the winner can error if the winner uses too much gas
                // in that case, they can call .sendPrize() themselves later.
				if (!_auction.isPaid()) _auction.sendPrize(2300);
				
                // update stats
				totalPrizes += _auction.prize();
				totalBids += _auction.numBids();

                // clear auction, move to endedAuctions, update return
				definedAuctions[_i].auction = IPennyAuction(0);
				endedAuctions.push(_auction);
                _numAuctionsEnded++;

				AuctionEnded(now, _i, _auction.currentWinner(), address(_auction));
			}
    	}
    	if (_feesCollected > 0) FeesCollected(now, _feesCollected);
		return (_numAuctionsEnded, _feesCollected);
	}


    /*************************************************************/
    /*********** PUBLIC VIEWS ************************************/
    /*************************************************************/
    // IMPLEMENTS: Bankrollable.getCollateral()
    function getCollateral() public view returns (uint) { return 0; }
    function getWhitelistOwner() public view returns (address){ return getAdmin(); }

	// Gets the number of active auctions that are ended, so we know to call refreshAuctions()
	function getNumEndedAuctions()
        public
		view
		returns (uint _numEndedAuctions)
	{
		for (uint _i = 0; _i < numDefinedAuctions; _i++) {
			var _auction = definedAuctions[_i].auction;
    		if (_auction == IPennyAuction(0)) continue;
    		if (_auction.isEnded()) _numEndedAuctions++;
		}
		return _numEndedAuctions;
	}

	// Gets total amount of fees that are redeemable if refreshAuctions() is called.
	function getAvailableFees()
        public
		view
		returns (uint _feesAvailable)
	{
		for (uint _i = 0; _i < numDefinedAuctions; _i++) {
    		if (definedAuctions[_i].auction == IPennyAuction(0)) continue;
    		_feesAvailable += definedAuctions[_i].auction.fees();
		}
		return _feesAvailable;
	}

    /******** Access to definedAuctions **************************/
	function getAuction(uint _index)
        public
		view
		returns (address)
	{
		return address(definedAuctions[_index].auction);
	}

	function getIsEnabled(uint _index)
        public
		view
		returns (bool)
	{
		return definedAuctions[_index].isEnabled;
	}

    function getInitialPrize(uint _index)
        public
        view
        returns (uint)
    {
        return definedAuctions[_index].initialPrize;
    }

    // Returns false if index out of bounds, is disabled, is active, or too expensive to start.
    function getIsStartable(uint _index)
        public
        view
        returns (bool _isStartable)
    {
        DefinedAuction memory dAuction = definedAuctions[_index];
        if (_index >= numDefinedAuctions) return;
        if (dAuction.isEnabled == false) return;
        if (dAuction.auction != IPennyAuction(0)) return;
        if (dAuction.initialPrize > this.balance) return;
        if (dAuction.initialPrize > getDailyLimitRemaining()) return;
        return true;
    }

    // Returns the last N auctions that have ended.
    function recentlyEndedAuctions(uint _num)
        public
        view
        returns (address[] _addresses)
    {
        // set _num to Min(_num, _len), initialize the array
        uint _len = endedAuctions.length;
        if (_num > _len) _num = _len;
        _addresses = new address[](_num);

        // Loop _num times, adding from end of endedAuctions.
        uint _i = 1;
        while (_i <= _num) {
            _addresses[_i - 1] = endedAuctions[_len - _i];
            _i++;
        }
    }

    function numEndedAuctions()
        public
        view
        returns (uint)
    {
        return endedAuctions.length;
    }
    function numActiveAuctions()
        public
        view
        returns (uint _count)
    {
        for (uint _i = 0; _i < numDefinedAuctions; _i++) {
            if (definedAuctions[_i].auction != IPennyAuction(0)) _count++;
        }
    }
}