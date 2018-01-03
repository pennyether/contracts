Loader.require("pac")
.then(function(pac){
	ethUtil.onStateChanged(refreshAllAuctions);

	const _activeAuctions = {};
	const _endedAuctions = {};
	const _$activeAuctions = $(".activeAuctions");
	const _$endedAuctions = $(".endedAuctions");

	// returns all Auction objects
	function getAllAuctions() {
		return Object
			.values(_activeAuctions)
			.concat(Object.values(_endedAuctions));
	}

	// get active auction contracts.
	function getActiveAuctionContracts() {
		return pac.numDefinedAuctions().then(num=>{
			const auctions = [];
			for (var i=0; i<num; i++){
				auctions.push(pac.getAuction([i]));
			}
			return Promise.all(auctions);
		}).then(addrs=>{
			return addrs
				.filter(addr => addr != ethUtil.NO_ADDRESS)
				.map(addr => PennyAuction.at(addr));
		});
	}

	// get up to 10 last ended auction contracts
	function getEndedAuctionContracts() {
		return pac.numEndedAuctions().then(len=>{
			const max = Math.min(len, 10);
			const auctions = [];
			for (var i=1; i<=max; i++){
				auctions.push(pac.endedAuctions([len-i]));
			}
			return Promise.all(auctions);
		}).then(addrs=>{
			return addrs
				.filter(addr => addr != ethUtil.NO_ADDRESS)
				.map(addr => PennyAuction.at(addr));
		});	
	}

	// add each cAuction to aMap, delete any aMap auction not present.
	function getOrCreateAuctions(aMap, cAuctions, $e) {
		// remove any auctions in array that are not in cAuctions
		Object.keys(aMap).forEach(addr => {
			if (!cAuctions.some(c=>c.address)){
				aMap[addr].$e.remove();
				delete aMap[addr];
			}
		});
		// for each cAuction, getOrCreate it.
		return cAuctions.map((c)=>{
			if (aMap[c.address]) return aMap[c.address];
			const auction = new Auction(c);
			auction.$e.appendTo($e);
			aMap[c.address] = auction;
			return auction;
		});
	}

	function refreshAllAuctions(){
		Promise.all([
			getActiveAuctionContracts(),
			getEndedAuctionContracts(),
			ethUtil.getAverageBlockTime()
		]).then(arr => {
			const activeAuctionCs = arr[0];
			const endedAuctionCs = arr[1];
			const blocktime = arr[2];
			getOrCreateAuctions(_activeAuctions, activeAuctionCs, _$activeAuctions);
			getOrCreateAuctions(_endedAuctions, endedAuctionCs, _$endedAuctions);
			getAllAuctions().forEach((a)=>{
				a.setBlocktime(blocktime);
				a.refresh();
			});
		});
	}

	(function refreshTimes(){
		getAllAuctions().forEach(a=>a.updateTimeLeft(2));
		setTimeout(refreshTimes, 1000);
	}());

	function Auction(auction) {
		const _self = this;
		const _$e = $(".auction.template")
			.clone()
			.show()
			.removeClass("template")
			.attr("id", auction.address)
		const _auction = auction;
		var _initialized;
		var _blocktime;
		var _bidPrice;
		var _bidIncr;
		var _bidAddBlocks;
		var _estTimeLeft;
		var _estTimeLeftAt;
		var _prevBlocksLeft = null;
		var _prevAmWinner = null;
		var _prevPrize = null;

		// initialize dom elements
		const _$prize = _$e.find(".prize .value");
		const _$blocksLeftCtnr = _$e.find(".blocksLeftCtnr");
		const _$blocksLeft = _$e.find(".blocksLeft");
		const _$timeLeft = _$e.find(".timeLeft");
		const _$bidPrice = _$e.find(".bidPrice .value");
		const _$currentWinner = _$e.find(".currentWinner .value");
		const _$btn = _$e.find(".bid button")
			.click(()=>{ _self.bid(); });
		const _$moreInfo = _$e.find(".moreInfo").show();

		this.refreshMoreInfo = function(){
			const _$logs = _$moreInfo.find(".logs").text("loading...");
			util.$getLogs(_auction).then($e=>{
				_$logs.empty().append($e);
			});
		}

		this.setBlocktime = function(blocktime) {
			_blocktime = blocktime;
		}

		// updates the _$timeLeft string according to how
		// much time has elapsed since the last estimate was recorded.
		this.updateTimeLeft = function(){
			const timeElapsed = (+new Date()/1000) - _estTimeLeftAt;
			const newTimeLeft = Math.round(_estTimeLeft - timeElapsed);
			if (newTimeLeft < 0) {
				const newTimeLeftStr = util.toTime(-1*newTimeLeft, 2);
				_$timeLeft.text(`${newTimeLeftStr} ago`);
			} else {
				const newTimeLeftStr = util.toTime(newTimeLeft, 3);
				_$timeLeft.text(newTimeLeftStr);
			}

			_$e.removeClass("half-minute one-minute two-minutes five-minutes");
			if (_prevBlocksLeft <= 0) return;

			if (newTimeLeft <= 30){
				_$e.addClass("half-minute");
			} else if (newTimeLeft <= 60){
				_$e.addClass("one-minute");
			} else if (newTimeLeft <= 120){
				_$e.addClass("two-minutes");
			} else if (newTimeLeft <= 300){
				_$e.addClass("five-minutes");
			}
		}

		this.refresh = function() {
			function flashClass(className) {
				_$e.removeClass(className);
				setTimeout(()=>_$e.addClass(className), 50);
			}

			return Promise.all([
				_initialized,
				_auction.prize(),
				_auction.currentWinner(),
				_auction.blockEnded()
			]).then(arr => {
				const prize = arr[1];
				const currentWinner = arr[2];
				const blockEnded = arr[3];

				// update most recent estimate of time left
				const blocksLeft = blockEnded.minus(ethUtil.getCurrentBlockHeight());
				_estTimeLeft = _blocktime.mul(blocksLeft).toNumber();
				_estTimeLeftAt = (+new Date()/1000);
				_self.updateTimeLeft();

				// compute useful things, and update
				_$e.removeClass("winner");
				const isNewBlock = _prevBlocksLeft && blocksLeft < _prevBlocksLeft;
				const amWinner = currentWinner === ethUtil.getCurrentAccount()
				const isNewWinner = !_prevAmWinner && amWinner;
				const isNewLoser = _prevAmWinner && !amWinner;
				const isNewPrize = _prevPrize && !_prevPrize.equals(prize);
				const addrName = amWinner ? "You" : currentWinner.slice(0,10) + "...";
				const $curWinner = util.$getAddrLink(addrName, currentWinner);
				const isEnded = blocksLeft.lt(1);
				_prevPrize = prize;
				_prevAmWinner = amWinner;
				_prevBlocksLeft = blocksLeft;

				// update DOM and classes
				if (amWinner) _$e.addClass("winner");
				_$currentWinner.empty().append($curWinner);
				_$prize.text(`${ethUtil.toEth(prize)}`);
				if (isEnded) {
					_$e.addClass("ended");
					_$btn.attr("disabled", "disabled").addClass("disabled");
					_$blocksLeft.text("Ended");
				} else {
					_$blocksLeft.text(blocksLeft);
					if (isNewLoser) flashClass("new-loser");
					if (isNewBlock) flashClass("new-block");
					if (isNewWinner) flashClass("new-winner");
				}
				if (isNewPrize) flashClass("new-prize");
			});
		}

		this.bid = function(){
			_auction.sendTransaction({gas: 59000, value: _bidPrice});
		}

		this.$e = _$e;

		// initialize this auction
		_initialized = Promise.all([
			_auction.bidPrice(),
			_auction.bidIncr(),
			_auction.bidAddBlocks(),
		]).then(arr=>{
			_bidPrice = arr[0];
			_bidIncr = arr[1];
			_bidAddBlocks = arr[2];

			// update DOM
			_$bidPrice.text(`${ethUtil.toEth(_bidPrice)}`);

			// update tips
			const bidIncrEthStr = ethUtil.toEthStr(_bidIncr.abs());
			const bidIncrStr = _bidIncr.equals(0)
				? ""
				: _bidIncr.gt(0)
					? `A bid will add ${bidIncrEthStr} to the prize`
					: `A bid will subtract ${bidIncrEthStr} from the prize`;
			_$e.find(".bid").attr("title",
				`${bidIncrStr}. The auction will be extended by ${_bidAddBlocks} blocks.`);

			// initialize tips
			tippy(_$e.find("[title]").toArray(), {
				placement: "top",
				trigger: "mouseenter",
				dynamicTitle: true
			});
			tippy(_$e.find(".infoIcon")[0], {
				html: _$moreInfo.show()[0],
				trigger: "click",
				onShow: function(){
					_self.refreshMoreInfo();
				}
			});
		});
	}
});