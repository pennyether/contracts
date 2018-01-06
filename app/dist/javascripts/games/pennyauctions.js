Loader.require("pac")
.then(function(pac){
	ethUtil.onStateChanged(refreshAllAuctions);

	const _activeAuctions = {};
	const _endedAuctions = {};
	const _$activeAuctions = $(".activeAuctions .auctions");
	const _$liveAlerts = $(".activeAuctions .liveAlerts");
	const _$endedAuctions = $(".endedAuctions .auctions");

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
		const _lsKey = `${_auction.address}-alerts`;
		var _initialized;
		var _blocktime;
		var _bidPrice;
		var _bidIncr;
		var _bidAddBlocks;
		var _estTimeLeft;
		var _estTimeLeftAt;
		var _curBlocksLeft = null;
		var _curAmWinner = null;
		var _curPrize = null;
		var _curCurrentWinner = null;
		var _alerts = {};

		// initialize dom elements
		const _$status = _$e.find(".status");
		const _$statusCell = _$e.find(".statusCell");
		const _$currentWinnerCell = _$e.find(".currentWinnerCell");
		const _$bottomCell = _$e.find(".bottomCell");
		const _$prize = _$e.find(".prize .value");
		const _$blocksLeftCtnr = _$e.find(".blocksLeftCtnr");
		const _$blocksLeft = _$e.find(".blocksLeft");
		const _$timeLeft = _$e.find(".timeLeft");
		const _$bidPrice = _$e.find(".bidPrice .value");
		const _$currentWinner = _$e.find(".currentWinner .value");
		const _$btn = _$e.find(".bid button")
			.click(()=>{ _self.bid(); });

		
		const _$alertsTip = _$e.find(".alertsTip");
		const _$alertsIcon = _$e.find(".alertsIcon");
		function _initAlertsTip(){
			loadAlerts();

			// attach tippy
			tippy(_$alertsIcon[0], {
				theme: "light",
				animation: "fade",
				placement: "right",
				html: _$alertsTip.show()[0],
				onShow: function(){
					_self.refreshAlertsTip();
				}
			});

			// hook up "Enabled Notification" button
			const $alertBtn = _$alertsTip.find("button").click(function(){
				Notification.requestPermission(_self.refreshAlertsTip);
			});
			// hook up all the checkboxes
			_$alertsTip.find("input").change(function(){
				const $sel = $(this).parent().find("select");
				const name = $(this).data("alert-name");
				if (this.checked){
					_alerts[name] = $sel.length ? $sel.val() : true;
				} else {
					delete _alerts[name];
				}
				storeAlerts();
				alertsChanged();
			});
			_$alertsTip.find("select").change(function(){
				$(this).parent().find("input").change();
			});

			// load _alerts from localStorage, set state of checkboxes
			function loadAlerts() {
				try {
					_alerts = JSON.parse(localStorage.getItem(_lsKey)) || {};
				} catch (e) {}

				_$alertsTip.find("input").toArray().forEach(e=>{
					const name = $(e).data("alert-name"); 
					const value = _alerts[name];
					if (value) {
						$(e).parent().find("select").val(value);
						e.checked = true;
					}
				});
				alertsChanged();
			}
			function storeAlerts() {
				try {
					localStorage.setItem(_lsKey, JSON.stringify(_alerts));
					console.log("stored", _lsKey);
				} catch (e) {}
			}
			function alertsChanged(){
				if (Object.keys(_alerts).length > 0){
					_$alertsIcon.addClass("on");
				} else {
					_$alertsIcon.removeClass("on");
				}
			}
		}

		function _triggerAlerts(blocksLeft, isEnded, amNowLoser){
			if (_alerts["whenBlocksLeft"] && blocksLeft.lt(_alerts["whenBlocksLeft"])) {
				
			}
			if (_alerts["whenEnded"] && isEnded) {

			}
			if (_alerts["WhenNowLoser"] && amNowLoser) {

			}
		}

		// shows alertsTip in state depending on window.Notification.permission
		this.refreshAlertsTip = function(){
			_$alertsTip.removeClass("disabled");
			if (!window.Notification) {
				_$alertsTip.addClass("disabled");
				_$alertsTip.find(".request").text("Your browser does not support notifications.");
				return;
			}
			if (Notification.permission !== "granted") {
				_$alertsTip.addClass("disabled");
				return;
			}
		}

		const _$moreTip = _$e.find(".moreTip");
		this.refreshMoreTip = function(){
			const curAccount = ethUtil.getCurrentAccount();
			const _$logs = _$moreTip.find(".logs").unbind().bind("scroll", checkScroll);
			const _$logsTable = _$logs.find("table").empty();

			var prevBidTime = null;
			var lastBlock = ethUtil.getCurrentBlockHeight();
			var isDone = false;
			function checkScroll() {
				if (isDone) return;
    			const isNearBottom = _$logs[0].scrollHeight - _$logs.scrollTop() - _$logs.outerHeight() < 1;
    			if (!isNearBottom) return;

				const fromBlock = lastBlock - 499;
				const toBlock = lastBlock;
				lastBlock = fromBlock - 1;
				const $loading = $("<div class='loading'></div>")
					.text(`Loading logs from block ${toBlock}`)
					.appendTo(_$logs);
				Promise.all([
					_auction.getEvents("BidOccurred", {}, fromBlock, toBlock),
					_auction.getEvents("Started", {}, fromBlock, toBlock)
				]).then(arr=>{
					// order all events by blocknumber, and break tie with logIndex.
					const events = arr[0].concat(arr[1]);
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
								: util.toTime(ethUtil.getCurrentBlockTime().minus(e.args.time.toNumber())) + " ago";
							if (timeBeforeStr == "0s earlier") return;
							const $txLink = util.$getTxLink('Bid', e.transactionHash);
							const bidderStr = e.args.bidder == ethUtil.getCurrentAccount()
								? "You"
								: e.args.bidder.slice(0, 10) + "...";
							const $userLink = util.$getAddrLink(bidderStr, e.args.bidder);
							$entry.append(`<td>${timeBeforeStr}</td>`)
								.append(
									$('<td width=100%></td>').append($txLink).append(" by: ").append($userLink)
								);
							prevBidTime = e.args.time;
						} else if (e.name=="Started") {
							const dateStr = util.toDateStr(e.args.time);
							$entry.append(`<td>${dateStr}</td><td><b>Auction Started</b></td>`);
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
			if (_curBlocksLeft <= 0) return;

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
				const isNewBlock = _curBlocksLeft && blocksLeft < _curBlocksLeft;
				const amWinner = currentWinner === ethUtil.getCurrentAccount();
				const amNowWinner = !_curAmWinner && amWinner;
				const amNowLoser = _curAmWinner && !amWinner;
				const isNewWinner = currentWinner != _curCurrentWinner;
				const isNewPrize = _curPrize && !_curPrize.equals(prize);
				const addrName = amWinner ? "You" : currentWinner.slice(0,10) + "...";
				const $curWinner = util.$getAddrLink(addrName, currentWinner);
				const isEnded = blocksLeft.lt(1);
				_curPrize = prize;
				_curAmWinner = amWinner;
				_curBlocksLeft = blocksLeft;
				_curCurrentWinner = currentWinner;

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
				_triggerAlerts(blocksLeft, isEnded, amNowLoser);
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

		_initAlertsTip();

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

			// update tip. todo: move this to setBlocktime
			const blocksLeftTip = `The number of blocks remaining until the auction ends. \
			Time is estimated using the current average blocktime of ${_blocktime.round()} seconds.`;
			_$e.find(".blocksLeftCell .label").attr("title", blocksLeftTip);

			// initialize tips
			tippy(_$e.find("[title]").toArray(), {
				placement: "top",
				trigger: "mouseenter",
				dynamicTitle: true
			});

			// moreTip
			tippy(_$e.find(".infoIcon")[0], {
				animation: "fade",
				placement: "right",
				html: _$moreTip.show()[0],
				trigger: "click",
				onShow: function(){
					_self.refreshMoreTip();
				}
			});

			// bidTip is more substantial
			const $bidTip = _$e.find(".bidTip");
			const $bidPrice = $bidTip.find(".bidPrice");
			const $prize = $bidTip.find(".prize");
			const $blocktime = $bidTip.find(".blocktime");
			const $prizeIncr = $bidTip.find(".prizeIncr");
			const $addBlocks = $bidTip.find(".addBlocks");
			const $refundSpan = $bidTip.find(".refundSpan");

			const bidIncrEthStr = ethUtil.toEthStr(_bidIncr.abs());
			const bidIncrStr = _bidIncr.equals(0)
				? ""
				: _bidIncr.gt(0)
					? `The prize will go up by ${bidIncrEthStr}`
					: `The prize will go down by ${bidIncrEthStr}`;
			const addBlocksStr = `The auction will be extended by ${_bidAddBlocks} blocks`;

			$prizeIncr.text(bidIncrStr);
			$addBlocks.text(addBlocksStr);
			tippy(_$btn[0], {
				// arrow: false,
				theme: "light",
				animation: "fade",
				placement: "top",
				html: $bidTip.show()[0],
				trigger: "mouseenter",
				onShow: function(){
					$bidPrice.text(ethUtil.toEthStr(_bidPrice));
					$prize.text(ethUtil.toEthStr(_curPrize));
					$blocktime.text(`${Math.round(_blocktime)} seconds`);
				}
			});
		});
	}
});