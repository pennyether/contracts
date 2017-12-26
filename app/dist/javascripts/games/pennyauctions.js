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

		getAuctions().then(auctions=>{
			// refresh auctions one by one
			var p = Promise.resolve();
			auctions.forEach((auction)=>{
				p = Promise.resolve(p).then(()=>{
					refreshAuction(auction);
				});
			});
			return p;
		});
	}

	function refreshAuction(auction) {
		const $ctnr = $(".auctions");
		const $e = $(".auctionTemplate")
			.clone()
			.show()
			.removeClass("auctionTemplate")
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
			$numBids.text(arr[0].toString());
			$endBlock.text(arr[1].toString());
			$currentWinner.empty().append(util.$getAddrLink(arr[2]));
			$prize.text(ethUtil.toEthStr(arr[3]));
			$bidPrice.text(ethUtil.toEthStr(arr[4]));
			$bidAddBlocks.text(arr[5].toString());
			$growing.text((new BigNumber(1)).minus(arr[6].div(100)).mul(100).toString() + "%");
		})
	}
});