Loader.require("pac")
.then(function(pac){
	$("#Title").addClass("loaded");
	ethUtil.onStateChanged((state)=>{
		if (!state.isConnected) return;
		refreshAllAuctions();
	});

	const _GAS_PRICE_SLIDER = util.getGasPriceSlider();
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
	// todo: if optimization is needed, we can update 
	// this only when numEndedAuctions has changed.
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
		var _curBlockEnded = null;
		var _alerts = {};

		// initialize dom elements
		const _$status = _$e.find(".status");
		const _$txStatus = _$e.find(".txStatus");
		const _$clearTxStatus = _$e.find(".clearTxStatus").click(()=>_self.clearTxStatus());
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
			.click(function(){
				this._tippy.hide(0);
				_self.bid();
			});

		
		const _$alertsTip = _$e.find(".alertsTip");
		const _$alertsIcon = _$e.find(".alertsIcon");
		function _initAlertsTip(){
			_loadAlerts();

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
				_storeAlerts();
			});
			_$alertsTip.find("select").change(function(){
				$(this).parent().find("input").change();
			});
		}

		// load _alerts from localStorage, set state of checkboxes and icon
		function _loadAlerts() {
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
			Object.keys(_alerts).length > 0
				? _$alertsIcon.addClass("on")
				: _$alertsIcon.removeClass("on");
		}
		// store alerts, update icon
		function _storeAlerts() {
			try {
				localStorage.setItem(_lsKey, JSON.stringify(_alerts));
			} catch (e) {}
			Object.keys(_alerts).length > 0
				? _$alertsIcon.addClass("on")
				: _$alertsIcon.removeClass("on");
		}
		// remove alerts, remove icon
		function _clearAlerts() {
			localStorage.removeItem(_lsKey);
			_alerts = {};
			_$alertsIcon.remove();
		}

		function _triggerAlerts(blocksLeft, amNowLoser, newWinner){
			if (Object.keys(_alerts).length==0) return;
			const timeStr = util.getLocalTime();
			const newWinnerStr = _curCurrentWinner == ethUtil.getCurrentAccount()
				? "You"
				: _curCurrentWinner.slice(0, 10) + "...";
			const title = `Auction @ ${_auction.address.slice(0,10)}...`;

			// alert one or none of: Not Winner, New Winner
			if (_alerts["whenNowLoser"] && amNowLoser) {
				new Notification(title, {
					tag: `${_auction.address}-bidAfter`,
					renotify: true,
					body: `${timeStr} - You were bid after by ${newWinnerStr}`,
					requireInteraction: true
				});
			} else {
				if (_alerts["whenNewWinner"] && newWinner) {
					new Notification(title, {
						tag: `${_auction.address}-newWinner`,
						renotify: true,
						body: `${timeStr} - Bid placed by ${newWinnerStr}`,
						requireInteraction: true
					})
				}	
			}
			// alert one or none of: Ended, N blocks Left
			const isEnded = blocksLeft < 1;
			if (_alerts["whenEnded"] && isEnded) {
				new Notification(title, {
					tag: `${_auction.address}-blocksLeft`,
					renotify: true,
					body: `${timeStr} - Auction ended.`,
					requireInteraction: true
				});
			} else {
				if (_alerts["whenBlocksLeft"]){
					if (blocksLeft < _alerts["whenBlocksLeft"]) {
						const body = blocksLeft <= 0
							? `${timeStr} - Auction ended.`
							: `${timeStr} - Only ${blocksLeft} blocks left.`
						new Notification(title, {
							tag: `${_auction.address}-blocksLeft`,
							renotify: true,
							body: body,
							requireInteraction: true
						});	
					}
				}
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
			const $lv = util.$getLogViewer({
				$head: "Bid History",
				events: [{
					instance: _auction,
					name: "BidOccurred",
				},{
					instance: _auction,
					name: "Started"
				}],
				order: "newest",
				startBlock: Math.min(_curBlockEnded, ethUtil.getCurrentBlockHeight()),
				stopFn: (event)=>event.name=="Started",
				dateFn: (event, prevEvent, nextEvent) => {
					if (!prevEvent){
						return util.toDateStr(event.args.time);
					} else {
						const timeDiff = event.args.time.minus(prevEvent.args.time);
						return `${util.toTime(timeDiff)} later`;
					}
				},
				valueFn: (event)=>{
					if (event.name=="BidOccurred"){
						const $txLink = util.$getTxLink("Bid", event.transactionHash);
						const $bidderLink = util.$getShortAddrLink(event.args.bidder);
						return $("<div></div>").append($txLink).append(" by: ").append($bidderLink);
					} else if (event.name=="Started"){
						return "<b>Auction Started</b>";
					}
				}
			});
			_$moreTip.empty().append($lv);
		}

		this.clearTxStatus = function(){
			_$clearTxStatus.hide();
			_$txStatus.empty().hide();
			_$status.show();
			_$statusCell.removeClass().addClass("statusCell");
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
				const blockEnded = arr[3].toNumber();

				// update most recent estimate of time left
				const blocksLeft = blockEnded - ethUtil.getCurrentBlockHeight();
				_estTimeLeft = _blocktime.mul(blocksLeft).toNumber();
				_estTimeLeftAt = (+new Date()/1000);
				_self.updateTimeLeft();

				// compute useful things, and update
				_$e.removeClass("winner");
				const isNewBlock = _curBlocksLeft && blocksLeft < _curBlocksLeft;
				const amWinner = currentWinner === ethUtil.getCurrentAccount();
				const amNowWinner = !_curAmWinner && amWinner;
				const amNowLoser = _curAmWinner && !amWinner;
				const isNewWinner = _curCurrentWinner && currentWinner != _curCurrentWinner;
				const isNewPrize = _curPrize && !_curPrize.equals(prize);
				const addrName = amWinner ? "You" : currentWinner.slice(0,6) + "..." + currentWinner.slice(-4);
				const $curWinner = util.$getAddrLink(addrName, currentWinner);
				const isEnded = blocksLeft < 1;
				_curPrize = prize;
				_curAmWinner = amWinner;
				_curBlocksLeft = blocksLeft;
				_curCurrentWinner = currentWinner;
				_curBlockEnded = blockEnded;

				// update DOM and classes
				if (amWinner) _$e.addClass("winner");
				_$currentWinner.empty().append($curWinner);
				_$prize.text(`${ethUtil.toEth(prize)}`);
				if (isEnded) {
					_$e.addClass("ended");
					_$btn.attr("disabled", "disabled").addClass("disabled");
					_$blocksLeft.text("Ended");
					_$status.empty()
						.append("The auction has ended.<br>")
						.append($curWinner.clone())
						.append(" won!");
				} else {
					_$blocksLeft.text(blocksLeft);
					if (amNowLoser){
						_$status.empty()
							.append("You are no longer the current winner. ")
							.append($curWinner.clone())
							.append(" bid after you.");
						_$e.removeClass("now-winner");
						_$e.removeClass("new-winner");
						flashClass("now-loser");

						_$currentWinnerCell.attr("title", "You are no longer the current winner!");
						const t = tippy(_$currentWinnerCell[0], {
							placement: "top",
							trigger: "manual",
							animation: "fade",
							onHidden: function(){ t.destroy(); }
						}).tooltips[0];
						t.show();
						setTimeout(function(){ t.hide(); }, 3000);
					} else if (amNowWinner) {
						_$status.text("You are the current winner!");
						_$e.removeClass("now-loser");
						_$e.removeClass("new-winner");
						flashClass("now-winner");

						_$currentWinnerCell.attr("title", "You are the current winner!");
						const t = tippy(_$currentWinnerCell[0], {
							placement: "top",
							trigger: "manual",
							animation: "fade",
							onHidden: function(){ t.destroy(); }
						}).tooltips[0];
						t.show();
						setTimeout(function(){ t.hide(); }, 3000);
					} else if (isNewWinner) {
						_$status.empty()
							.append($curWinner.clone())
							.append(" is now the current winner.");
						_$e.removeClass("now-winner");
						_$e.removeClass("now-loser");
						flashClass("new-winner");
					} else {
						if (amWinner) {
							_$status.text("You are the current winner!");
						} else {
							_$status.empty()
								.append($curWinner.clone())
								.append(" is the current winner.");
						}
					}
					if (isNewBlock) flashClass("new-block");
					if (isNewPrize) flashClass("new-prize");
				}
				_triggerAlerts(blocksLeft, amNowLoser, isNewWinner);
				if (isEnded) _clearAlerts();
			});
		}

		this.bid = function(){
			_$txStatus.show();
			_$status.hide();

			var p;
			try {
				const gasPrice = _GAS_PRICE_SLIDER.getValue();
				p = _auction.sendTransaction({gas: 59000, value: _bidPrice, gasPrice: gasPrice});
			} catch (e) {
				ethStatus.open();
				_$clearTxStatus.show();
				_$statusCell.addClass("error");
				_$txStatus.text(`Error: ${e.message}`);
				return;
			}
			var bidTxId;

			_$statusCell
				.removeClass("prepending pending refunded error current-winner")
				.addClass("prepending");
			_$txStatus.text("Waiting for signature...");

			// update status to prepending
			var loadingBar;
			p.getTxHash.then(function(txId){
				bidTxId = txId;
				const $txLink = util.$getTxLink("Your Bid is being mined.", bidTxId);
				_$statusCell.removeClass("prepending").addClass("pending");
				loadingBar = util.$getLoadingBar(_blocktime*1000*2, .75);
				loadingBar.$e.attr("title", "This is an estimate of time remaining, based on the average blocktime.");
				tippy(loadingBar.$e[0], {
					trigger: "mouseenter",
					placement: "top",
					animation: "fade"
				});
				_$txStatus.empty().append($txLink).append(loadingBar.$e);
			});

			p.then(function(res){
				return loadingBar.finish(500).then(()=>res);
			}).then(function(res){
				_$clearTxStatus.show();
				_$statusCell.removeClass("pending");
				// see if they got refunded, or if bid occurred
				const block = res.receipt.blockNumber;
				const bidOccurred = res.events.find(e=>e.name=="BidOccurred");
				const bidRefunded = res.events.find(e=>e.name=="BidRefundSuccess");
				if (!bidRefunded && !bidOccurred){
					_$statusCell.addClass("error");
					_$txStatus.append(`<br>WARNING: Your transaction did not produce any logs. Please try refreshing the page.`);
					return;
				}
				if (bidRefunded) {
					_$statusCell.addClass("refunded");
					const $txLink = util.$getTxLink("Your Bid was refunded.", bidTxId);
					_$txStatus.empty().append($txLink).append(`<br>${bidRefunded.args.msg}`);
					return;
				}
				// Their bid was accepted and not immediately refunded.
				const $txLink = util.$getTxLink("Your bid succeeded!", bidTxId);
				_$txStatus.empty().append($txLink);
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
					if (!finalEvent) {
						// weird case where we cant get events.
						// a refresh should settle all of this.
						_$txStatus.empty().append(`<br>Please wait a moment.`);
						setTimeout(_self.refresh, 1000);
						setTimeout(_self.refresh, 5000);
						return
					}
					if (finalEvent.name=="BidOccurred") {
						_$statusCell.addClass("current-winner");
						_$txStatus.append(`<br>Your bid made you the current winner.`);
						// sometimes providers take a little bit to catch up.
						setTimeout(_self.refresh, 1000);
						setTimeout(_self.refresh, 5000);
						return;
					}
					if (finalEvent.name=="BidRefundSuccess") {
						_$statusCell.addClass("refunded");
						const $refundLink = util.$getTxLink("Your Bid was refunded.", bidTxId);
						_$txStatus.empty()
							.append($refundLink)
							.append(`<br>Your bid was refunded: ${e[0].args.msg}`);
						return;
					}
					if (finalEvent.name=="BidRefundFailure") {
						_$statusCell.addClass("error");
						const $refundLink = util.$getTxLink("Your Bid was not refunded.", bidTxId);
						_$txStatus.empty()
							.append($refundLink)
							.append(`<br>Your bid could not be refunded: ${e[0].args.msg}`);
						return;
					}
				});
			}, function(e){
				_$clearTxStatus.show();
				_$statusCell.removeClass("prepending pending").addClass("error");
				if (bidTxId) {
					const $txLink = util.$getTxLink("Your Bid failed.");
					_$txStatus.empty().append($txLink).append(`<br>${e.message}`);
				} else {
					_$txStatus.text(`Error: ${e.message}`);	
				}
			});
		}

		this.$e = _$e;

		_initAlertsTip();
		_$e.find(".viewLink a")
			.attr("href", `/games/viewpennyauction.html#${_auction.address}`);

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
				},
				onHidden: function() {
					_$moreTip.empty();
				}
			});

			// bidTip is more substantial
			const $bidTip = _$e.find(".bidTip");
			const $bidPrice = $bidTip.find(".bidPrice");
			const $prize = $bidTip.find(".prize");
			const $prizeIncr = $bidTip.find(".prizeIncr");
			const $addBlocks = $bidTip.find(".addBlocks");
			const $gasPrice = $bidTip.find(".gasPrice")

			const bidIncrEthStr = ethUtil.toEthStr(_bidIncr.abs());
			const bidIncrStr = _bidIncr.equals(0)
				? ""
				: _bidIncr.gt(0)
					? `The prize will go up by ${bidIncrEthStr}`
					: `The prize will go down by ${bidIncrEthStr}`;
			const addBlocksStr = `${_bidAddBlocks} blocks`;
			const addBlocksTime = util.toTime(_blocktime.mul(_bidAddBlocks));

			$prizeIncr.text(bidIncrStr);
			$addBlocks.text(addBlocksStr).attr("title", `~${addBlocksTime}`);
			tippy(_$btn[0], {
				// arrow: false,
				theme: "light",
				animation: "fade",
				placement: "top",
				html: $bidTip.show()[0],
				trigger: "mouseenter",
				onShow: function(){
					_GAS_PRICE_SLIDER.refresh();
					$gasPrice.append(_GAS_PRICE_SLIDER.$e);
					$bidPrice.text(ethUtil.toEthStr(_bidPrice));
					$prize.text(ethUtil.toEthStr(_curPrize));
				}
			});
		});
	}
});