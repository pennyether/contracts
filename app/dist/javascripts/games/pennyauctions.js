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
		var _prevCurrentWinner = null;

		// initialize dom elements
		const _$status = _$e.find(".status");
		const _$statusCell = _$e.find(".statusCell");
		const _$currentWinnerCell = _$e.find(".currentWinnerCell");
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
			const blockTime = ethUtil.getBlock("latest").then(b=>b.timestamp);
			const curAccount = ethUtil.getCurrentAccount();
			const _$logs = _$moreInfo.find(".logs").unbind().bind("scroll", checkScroll);
			const _$logsTable = _$logs.find("table").empty();

			var prevBidTime = null;
			var lastBlock = ethUtil.getCurrentBlockHeight();
			var isDone = false;
			function checkScroll() {
				if (isDone) return;
    			const isNearBottom = _$logs[0].scrollHeight - _$logs.scrollTop() - _$logs.outerHeight() < 1;
    			if (!isNearBottom) return;

				const fromBlock = lastBlock - 199;
				const toBlock = lastBlock;
				lastBlock = fromBlock - 1;
				const $loading = $("<div class='loading'></div>")
					.text(`Loading logs from block ${toBlock}`)
					.appendTo(_$logs);
				Promise.all([
					blockTime,
					_auction.getEvents("BidOccurred", {}, fromBlock, toBlock),
					_auction.getEvents("Started", {}, fromBlock, toBlock)
				]).then(arr=>{
					// order all events by blocknumber, and break tie with logIndex.
					const blockTime = arr[0];
					const events = arr[1].concat(arr[2]);
					events.sort((a,b)=>{
						return a.blockNumber == b.blockNumber
							? a.logIndex > b.logIndex ? -1 : 1
							: a.blockNumber > b.blockNumber
								? -1 : 1
					});
					events.forEach(e=>{
						const $entry = $(`<tr class='logRow'></tr>`).appendTo(_$logsTable);
						if (e.name=="BidOccurred") {
							const timeBeforeStr = prevBidTime
								? util.toTime(prevBidTime.minus(e.args.time)) + " earlier"
								: util.toTime(blockTime - e.args.time.toNumber()) + " ago";
							if (timeBeforeStr == "0s earlier") return;
							const $txLink = util.$getTxLink('Bid', e.transactionHash);
							const $userLink = util.$getAddrLink(`${e.args.bidder.slice(0, 8)}...`, e.args.bidder);
							$entry.append(`<td>${timeBeforeStr}</td>`)
								.append(
									$('<td width=100%></td>').append($txLink).append(" by: ").append($userLink)
								);
							prevBidTime = e.args.time;
						} else if (e.name=="Started") {
							const dateStr = util.toDateStr(e.args.time);
							$entry.append(`<td>${dateStr}</td><td>Auction Started</td>`);
							isDone = true;
						}
					});
					$loading.remove();
					checkScroll();
				});
			}
			checkScroll();
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
				setTimeout(()=>_$e.addClass(className), 30);
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
				const amWinner = currentWinner === ethUtil.getCurrentAccount();
				const amNowWinner = !_prevAmWinner && amWinner;
				const amNowLoser = _prevAmWinner && !amWinner;
				const isNewWinner = currentWinner != _prevCurrentWinner;
				const isNewPrize = _prevPrize && !_prevPrize.equals(prize);
				const addrName = amWinner ? "You" : currentWinner.slice(0,10) + "...";
				const $curWinner = util.$getAddrLink(addrName, currentWinner);
				const isEnded = blocksLeft.lt(1);
				_prevPrize = prize;
				_prevAmWinner = amWinner;
				_prevBlocksLeft = blocksLeft;
				_prevCurrentWinner = currentWinner;

				// update DOM and classes
				if (amWinner) _$e.addClass("winner");
				if (amNowLoser) {
					_$currentWinnerCell.attr("title", "You are no longer the current winner!");
					const t = tippy(_$currentWinnerCell[0], {
						placement: "top",
						trigger: "manual",
						animation: "fade",
						onHidden: function(){ t.destroy(); }
					}).tooltips[0];
					t.show();
					setTimeout(function(){ t.hide(); }, 3000);
				}
				if (amNowWinner && !isEnded) {
					_$currentWinnerCell.attr("title", "You are the current winner!");
					const t = tippy(_$currentWinnerCell[0], {
						placement: "top",
						trigger: "manual",
						animation: "fade",
						onHidden: function(){ t.destroy(); }
					}).tooltips[0];
					t.show();
					setTimeout(function(){ t.hide(); }, 3000);
				}
				_$currentWinner.empty().append($curWinner);
				_$prize.text(`${ethUtil.toEth(prize)}`);
				if (isEnded) {
					_$e.addClass("ended");
					_$btn.attr("disabled", "disabled").addClass("disabled");
					_$blocksLeft.text("Ended");
				} else {
					_$blocksLeft.text(blocksLeft);
					setTimeout(function(){
						if (amNowLoser){
							_$e.removeClass("now-winner");
							_$e.removeClass("new-winner");
							flashClass("now-loser");
						} else if (amNowWinner) {
							_$e.removeClass("now-loser");
							_$e.removeClass("new-winner");
							flashClass("now-winner");
						} else if (isNewWinner) {
							_$e.removeClass("now-winner");
							_$e.removeClass("now-loser");
							flashClass("new-winner");
						}
						if (isNewBlock) flashClass("new-block");
						if (isNewPrize) flashClass("new-prize");
					}, 100);
				}
			});
		}

		this.bid = function(){
			var p;
			try {
				p = _auction.sendTransaction({gas: 59000, value: _bidPrice});
			} catch (e) {
				_$status.text(`Error: ${e.message}`);	
			}
			var bidTxId;

			_$statusCell
				.removeClass("prepending pending refunded error current-winner")
				.addClass("prepending");
			_$status.text("Waiting for signature...");

			// update status to prepending
			var loadingBar;
			p.getTxHash.then(function(txId){
				bidTxId = txId;
				const $txLink = util.$getTxLink("Your Bid is being mined.", bidTxId);
				_$statusCell.removeClass("prepending").addClass("pending");
				loadingBar = util.$getLoadingBar(_blocktime*1000, .75);
				loadingBar.$e.attr("title", "This is an estimate of time remaining, based on the average blocktime.");
				tippy(loadingBar.$e[0], {
					trigger: "mouseenter",
					placement: "top",
					animation: "fade"
				});
				_$status.empty().append($txLink).append(loadingBar.$e);
			});

			p.then(function(res){
				return loadingBar.finish(500).then(()=>res);
			}).then(function(res){
				_$statusCell.removeClass("pending");
				// see if they got refunded, or if bid occurred
				const block = res.receipt.blockNumber;
				const bidOccurred = res.events.find(e=>e.name=="BidOccurred");
				const bidRefunded = res.events.find(e=>e.name=="BidRefundSuccess");
				if (!bidRefunded && !bidOccurred){
					_$statusCell.addClass("error");
					_$status.append(`<br>WARNING: Your transaction did not produce any logs. Please try refreshing the page.`);
					return;
				}
				if (bidRefunded) {
					_$statusCell.addClass("refunded");
					const $txLink = util.$getTxLink("Your Bid was refunded.", bidTxId);
					_$status.empty().append($txLink).append(`<br>${bidRefunded.args.msg}`);
					return;
				}
				// Their bid was accepted and not immediately refunded.
				const $txLink = util.$getTxLink("Your bid succeeded!", bidTxId);
				_$status.empty().append($txLink);
				// Get all events related to the user for this block, and update
				//  status based on the most recent event.
				Promise.all([
					_auction.getEvents("BidOccurred", {bidder: ethUtil.getCurrentAccount()}, block, block),
					_auction.getEvents("BidRefundSuccess", {bidder: ethUtil.getCurrentAccount()}, block, block),
					_auction.getEvents("BidRefundFailure", {bidder: ethUtil.getCurrentAccount()}, block, block)
				]).then(events=>{
					events = events[0].concat(events[1]).concat(events[2]);
					events.sort((a,b)=>a.logIndex > b.logIndex ? -1 : 1);
					const finalEvent = events[0];
					if (finalEvent.name=="BidOccurred") {
						_$statusCell.addClass("current-winner");
						_$status.append(`<br>Your bid made you the current winner.`);
						// sometimes providers take a little bit to catch up.
						setTimeout(_self.refresh, 1000);
						setTimeout(_self.refresh, 5000);
						return;
					}
					if (finalEvent.name=="BidRefundSuccess") {
						_$statusCell.addClass("refunded");
						const $refundLink = util.$getTxLink("Your Bid was refunded.", bidTxId);
						_$status.empty()
							.append($refundLink)
							.append(`<br>Your bid was refunded: ${e[0].args.msg}`);
						return;
					}
					if (finalEvent.name=="BidRefundFailure") {
						_$statusCell.addClass("error");
						const $refundLink = util.$getTxLink("Your Bid was not refunded.", bidTxId);
						_$status.empty()
							.append($refundLink)
							.append(`<br>Your bid could not be refunded: ${e[0].args.msg}`);
						return;
					}
				});
			}, function(e){
				_$statusCell.removeClass("prepending pending").addClass("error");
				if (bidTxId) {
					const $txLink = util.$getTxLink("Your Bid failed.");
					_$status.empty().append($txLink).append(`<br>${e.message}`);
				} else {
					_$status.text(`Error: ${e.message}`);	
				}
			});
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
				animation: "fade",
				placement: "right",
				html: _$moreInfo.show()[0],
				trigger: "click",
				onShow: function(){
					_self.refreshMoreInfo();
				}
			});
		});
	}
});