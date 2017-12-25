Loader.require("pac")
.then(function(pac){
	refreshAll();

	function refreshAll(){
		refreshPac();
	};

	function refreshPac() {
		function getNumActiveAuctions() {
			return pac.numDefinedAuctions().then((num)=>{
				const pArray = [];
				for (var i=0; i<num; i++){
					pArray.push(pac.getAuction([i]));
				}
				return Promise.all(pArray)
					.then((arr) => arr.filter(x=>x!=ethUtil.NO_ADDRESS).length);
			});
		}

		util.bindToElement(pac.version(), $("#PacVersion"));
		util.bindToElement(getNumActiveAuctions(), $("#PacNumActiveAuctions"));
		util.bindToElement(pac.numEndedAuctions(), $("#PacNumEndedAuctions"));
		util.bindToElement(pac.totalPrizes().then(ethUtil.toEthStr), $("#PacTotalPrizes"));
		util.bindToElement(pac.totalFees().then(ethUtil.toEthStr), $("#PacTotalFees"));
		util.bindToElement(pac.totalBids(), $("#PacTotalBids"));
		util.bindToElement(util.$getLogs(pac), $("#PacLogs"), true);

		$("#PacAddr").empty().text(pac.address);
		Promise.all([
			pac.numDefinedAuctions(),
			ethUtil.getAverageBlockTime()
		]).then(function(arr){
			const num = arr[0];
			const blockTimeS = arr[1];

			const $template = $("#PennyAuctions .definedAuctionTemplate").remove();
			const $ctnr = $("#PennyAuctions .definedAuctions").empty().append($template);
			for (var i=0; i<num; i++){
				let index = i;
				let $defined = $template
					.clone()
					.removeClass("definedAuctionTemplate")
					.appendTo($ctnr)
					.show();

				pac.definedAuctions([index]).then((res)=>{
					const addr = res[0];
					const $addr = util.$getAddrLink(res[1]);
					const enabled = res[1] ? "Enabled" : "Disabled";
					const name = res[2];
					const initialPrize = ethUtil.toEthStr(res[3]);
					const bidPrice = ethUtil.toEthStr(res[4]);
					const bidFeePct = res[5] + "%";
					const bidFeeEth = ethUtil.toEthStr(res[5].div(100).mul(res[4]));
					const bidAddBlocks = res[6] + " Blocks";
					const bidAddBlocksS = res[6].mul(blockTimeS).round() + " seconds";
					const initialBlocks = res[7] + " Blocks";
					const initialBlocksS = res[7].mul(blockTimeS).round() + " seconds";

					$defined.find(".name").text(name);
					$defined.find(".isEnabled .value").text(enabled);
					$defined.find(".auction .value").empty().append($addr);
					$defined.find(".initialPrize .value").text(initialPrize);
					$defined.find(".bidPrice .value").text(bidPrice);
					$defined.find(".bidFeePct .value ").text(`${bidFeePct} (${bidFeeEth})`);
					$defined.find(".bidAddBlocks .value").text(`${bidAddBlocks} (~${bidAddBlocksS})`);
					$defined.find(".initialBlocks .value").text(`${initialBlocks} (~${initialBlocksS})`);
				});
				tippy($defined.find("[title]").toArray(), { placement: "top" });
			};
		});
	}
});