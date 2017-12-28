Loader.require("pac")
.then(function(pac){
	ethUtil.onStateChanged(refreshAuctions);

	refreshAuctions();

	function getAuctions() {
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

	function refreshAuctions(){
		Promise.all([
			getAuctions(),
			ethUtil.getAverageBlockTime()
		]).then(arr => {
			const auctions = arr[0];
			const blocktime = arr[1];
			// refresh auctions one by one
			var p = Promise.resolve();
			auctions.forEach((auction)=>{
				p = Promise.resolve(p).then(()=>{
					refreshAuction(auction, blocktime);
				});
			});
			return p;
		});
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

		const $name = $e.find(".name .value");
		const $numBids = $e.find(".numBids .value");
		const $endBlock = $e.find(".endBlock .value");
		const $currentWinner = $e.find(".currentWinner .value");
		const $prize = $e.find(".prize .value");
		const $bidPrice = $e.find(".bidPrice .value");
		const $bidAddBlocks = $e.find(".bidAddBlocks .value");
		const $growing = $e.find(".growing .value");
		const $btn = $e.find(".bid button").attr("disabled","disabled");
		return Promise.all([
			auction.numBids(),
			auction.blockEnded(),
			auction.currentWinner(),
			auction.prize(),
			auction.bidPrice(),
			auction.bidAddBlocks(),
			auction.bidIncr()
		]).then(arr => {
			const numBids = arr[0];
			const blockEnded = arr[1];
			const currentWinner = arr[2];
			const prize = arr[3];
			const bidPrice = arr[4];
			const bidAddBlocks = arr[5];
			const bidIncr = arr[6];
			const amWinner = currentWinner === ethUtil.getCurrentAccount()

			const $curWinner = util.$getAddrLink(amWinner ? "You!" : currentWinner, currentWinner);
			const curWinnerClass = amWinner ? "you" : "";

			const numBlocks = blockEnded.minus(ethUtil.getCurrentBlockHeight());
			if (numBlocks.lt(1)) {
				const blocksAgo = numBlocks.mul(-1).plus(1);
				const timeAgo = util.toTime(blocktime.mul(blocksAgo));
				$endBlock.text(`Auction ended ${blocksAgo} blocks ago. (~${timeAgo})`).addClass("ended");
				$e.find(".bid").hide();
			} else {
				const timeS = numBlocks.mul(blocktime);
				if (timeS.lt(30)){
					$endBlock.addClass("halfMinute")
				} else if (timeS.lt(60)){
					$endBlock.addClass("oneMinute");
				} else if (timeS.lt(60*2)){
					$endBlock.addClass("twoMinutes");
				} else if (timeS.lt(60*2)){
					$endBlock.addClass("fiveMinutes");
				}
				$endBlock.text(`In ${numBlocks} blocks (~${util.toTime(timeS)})`);
			}
			
			$numBids.text(`${numBids} bids`);
			$currentWinner.empty().append($curWinner).addClass(curWinnerClass);
			$prize.text(`${ethUtil.toEthStr(prize)}`);
			$bidPrice.text(`${ethUtil.toEthStr(bidPrice)}`);
			$bidAddBlocks.text(`${bidAddBlocks} blocks`);
			$growing.text(`${ethUtil.toEthStr(bidIncr)}`);
			$btn.removeAttr("disabled").unbind("click").click(function(){
				auction.sendTransaction({gas: 59000, value: bidPrice});
			});
			tippy($e.find(".tipLeft").toArray(), { placement: "top" });
		})
	}
});