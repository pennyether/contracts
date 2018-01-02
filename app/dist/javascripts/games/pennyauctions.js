Loader.require("pac")
.then(function(pac){
	ethUtil.onStateChanged(refreshAuctions);

	refreshAuctions();

	const _auctions = {};

	// gets all auction contracts
	function getAuctionContracts() {
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

	function getOrCreateAuction(cAuction) {
		if (_auctions[cAuction.address]) {
			return _auctions[cAuction.address];
		}
		const auction = new Auction(cAuction);
		auction.$e.appendTo(".auctions");
		_auctions[cAuction.address] = auction;
		return auction;
	}

	function refreshAuctions(){
		Promise.all([
			getAuctionContracts(),
			ethUtil.getAverageBlockTime()
		]).then(arr => {
			const cAuctions = arr[0];
			const blocktime = arr[1];
			// getOrCreateAuction()
			var p = Promise.resolve();
			cAuctions.map(getOrCreateAuction).forEach((a)=>{
				a.setBlocktime(blocktime);
				p = Promise.resolve(p).then(a.refresh);
			})
			return p;
		});
	}

	(function refreshTimes(){
		Object.values(_auctions).forEach(a=>a.updateTimeLeft());
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
		var _blocktime;
		var _bidPrice;
		var _bidIncr;
		var _bidAddBlocks;
		var _estTimeLeft;
		var _estTimeLeftAt;
		var _prevBlocksLeft = null;

		// initialize this auction
		const _initialized = Promise.all([
			_auction.bidPrice(),
			_auction.bidIncr(),
			_auction.bidAddBlocks(),
		]).then(arr=>{
			_bidPrice = arr[0];
			_bidIncr = arr[1];
			_bidAddBlocks = arr[2];
		});

		// initialize dom elements
		const _$prize = _$e.find(".prize .value");
		const _$blocksLeftCtnr = _$e.find(".blocksLeftCtnr");
		const _$blocksLeft = _$e.find(".blocksLeft");
		const _$timeLeft = _$e.find(".timeLeft");
		const _$bidPrice = _$e.find(".bidPrice .value");
		const _$currentWinner = _$e.find(".currentWinner .value");
		const _$btn = _$e.find(".bid button")
			.click(()=>{ _self.bid(); });

		// initialize tips
		tippy(_$e.find("[title]").toArray(), {
			placement: "top",
			trigger: "mouseenter",
			dynamicTitle: true
		});

		this.setBlocktime = function(blocktime) {
			_blocktime = blocktime;
		}

		// updates the _$timeLeft string according to how
		// much time has elapsed since the last estimate was recorded.
		this.updateTimeLeft = function(){
			const timeElapsed = (+new Date()/1000) - _estTimeLeftAt;
			const newTimeLeft = Math.round(_estTimeLeft - timeElapsed);
			if (newTimeLeft < 0) {
				const newTimeLeftStr = util.toTime(-1*newTimeLeft);
				_$timeLeft.text(`${newTimeLeftStr} ago`);
			} else {
				const newTimeLeftStr = util.toTime(newTimeLeft);
				_$timeLeft.text(newTimeLeftStr);
			}

			_$e.removeClass("halfMinute oneMinute twoMinutes fiveMinutes");
			if (newTimeLeft <= 30){
				_$e.addClass("halfMinute");
			} else if (newTimeLeft <= 60){
				_$e.addClass("oneMinute");
			} else if (newTimeLeft <= 120){
				_$e.addClass("twoMinutes");
			} else if (newTimeLeft <= 300){
				_$e.addClass("fiveMinutes");
			}
		}

		this.refresh = function() {
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
				const numBlocksLeft = blockEnded.minus(ethUtil.getCurrentBlockHeight());
				_estTimeLeft = _blocktime.mul(numBlocksLeft).toNumber();
				_estTimeLeftAt = (+new Date()/1000);

				// compute useful things, and update
				const amWinner = currentWinner === ethUtil.getCurrentAccount()
				const addrName = amWinner ? "You" : currentWinner.slice(0,10) + "...";
				const $curWinner = util.$getAddrLink(addrName, currentWinner);
				const isEnded = numBlocksLeft.lt(1);
				if (isEnded) {
					_$btn.attr("disabled", "disabled");
					_$blocksLeft.text("Ended");
				} else {
					if (_prevBlocksLeft != null && numBlocksLeft < _prevBlocksLeft) {
						_$blocksLeftCtnr.removeClass("flash");
						setTimeout(function(){
							_$blocksLeftCtnr.addClass("flash");
						}, 50);
					}
					_prevBlocksLeft = numBlocksLeft;
					_$blocksLeft.text(numBlocksLeft);
				}
				_self.updateTimeLeft();

				// update tips
				const bidIncrEthStr = ethUtil.toEthStr(_bidIncr.abs());
				const bidIncrStr = _bidIncr.equals(0)
					? ""
					: _bidIncr.gt(0)
						? `A bid will add ${bidIncrEthStr} to the prize`
						: `A bid will subtract ${bidIncrEthStr} from the prize`;
				_$e.find(".bid").attr("title",
					`${bidIncrStr}. The auction will be extended by ${_bidAddBlocks} blocks.`);
				
				_$currentWinner.empty().append($curWinner);
				_$prize.text(`${ethUtil.toEth(prize)}`);
				_$bidPrice.text(`${ethUtil.toEth(_bidPrice)}`);
			});
		}

		this.bid = function(){
			_auction.sendTransaction({gas: 59000, value: _bidPrice});
		}

		this.$e = _$e;
	}

	function refreshAuction(auction, blocktime) {
		const $ctnr = $(".auctions");
		var $e = $(".auctions").find(`#${auction.address}`);
		if (!$e.length){
			$e = $(".auction.template")
				.clone()
				.show()
				.removeClass("template")
				.attr("id", auction.address)
				.appendTo($ctnr);
		}
		/*
			<table width="100%" cellpadding="0" cellspacing="0">
				<tr class="top">
					<td>
						<div class="label prize tipLeft" title="The prize that the winner will receive.">Auction Prize</div>
						<div class="field prize">
							<div class="value">.05</div>
							<div class="eth">eth</div>
						</div>
					</td>
					<td colspan=2>
						<div class="label tipLeft" title="The number of blocks remaining until the auction ends. An estimate of the amount of time is provided.">Blocks Remaining</div>
						<div class="field">
							<div class="blocksLeft">5</div>
							<div class="timeLeft">(~3:22)</div>
						</div>
					</td>
				</tr>
				<tr class="middle">
					<td>
						<div class="label tipLeft" title="The amount it costs to become the current winner.">Bid Fee</div>
						<div class="field">
							<div class="bidPrice">.0001</div>
							<div class="eth">eth</div>
						</div>
					</td>
					<td>
						<div class="label tipLeft" title="The winner that will receive the prize if the auction ends.">Current Winner</div>
						<div class="field currentWinner">
							<div class="value">0x38432908</div>
						</div>
					</td>
					<td>
						<div class="bidHistoryIcon">☰</div>
					</td>
				</tr>
				<tr class="bottom">
					<td colspan=3>
						<div class="bid dontTip tipHover" title="A bid will subtract .001 ETH from the prize, and extend the auction by 5 blocks.">
							<button>Bid</button>
						</div>
					</td>
				</tr>
			</table>	
		*/
	}
});