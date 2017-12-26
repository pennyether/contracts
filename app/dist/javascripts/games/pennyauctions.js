Loader.require("pac")
.then(function(pac){
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
		const $ctnr = $(".auctions").empty();

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
		const $e = $(".auction.template")
			.clone()
			.show()
			.removeClass("template")
			.appendTo($ctnr);

		const $name = $e.find(".name .value").text("Loading...");
		const $numBids = $e.find(".numBids .value").text("Loading...");
		const $endBlock = $e.find(".endBlock .value").text("Loading...");
		const $currentWinner = $e.find(".currentWinner .value").text("Loading...");
		const $prize = $e.find(".prize .value").text("Loading...");
		const $bidPrice = $e.find(".bidPrice .value").text("Loading...");
		const $bidAddBlocks = $e.find(".bidAddBlocks .value").text("Loading...");
		const $growing = $e.find(".growing .value").text("Loading...");
		return Promise.all([
			auction.numBids(),
			auction.blockEnded(),
			auction.currentWinner(),
			auction.prize(),
			auction.bidPrice(),
			auction.bidAddBlocks(),
			auction.bidFeePct()
		]).then(arr => {
			const numBids = arr[0];
			const blockEnded = arr[1];
			const currentWinner = arr[2];
			const prize = arr[3];
			const bidPrice = arr[4];
			const bidAddBlocks = arr[5];
			const bidFeePct = arr[6];

			$numBids.text(`${numBids} bids`);
			$endBlock.data("block", blockEnded).data("blocktime", blocktime);
			$currentWinner.empty().append(util.$getAddrLink(arr[2]));
			$prize.text(ethUtil.toEthStr(arr[3]));
			$bidPrice.text(ethUtil.toEthStr(arr[4]));
			$bidAddBlocks.text(arr[5].toString());
			$growing.text((new BigNumber(1)).minus(arr[6].div(100)).mul(100).toString() + "%");
			tippy($e.find(".tipLeft").toArray(), { placement: "top" });
		})
	}

	(function updateTimes(){
		const $elements = $(".auctions .endBlock .value");
		const curBlock = ethUtil.getCurrentBlockHeight();
		$elements.each(function(){
			const $e = $(this);
			const block = $e.data("block");
			const blocktime = $e.data("blocktime");
			const numBlocks = block.minus(curBlock);
			const timeS = util.toTime(numBlocks.mul(blocktime));
			$e.text(`In ${numBlocks} blocks (~${timeS})`);
		})
		setTimeout(updateTimes, 1000);
	}());
});