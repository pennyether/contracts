Loader.require("pac", "dice")
.then(function(pac, dice){
	refreshAll();

	function refreshAll(){
		refreshPac();
		refreshDice();
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
					const enabled = res[1] ? "Enabled" : "Disabled";
					const name = res[2];
					const $addr = util.$getAddrLink(res[0]);
					const initialPrize = ethUtil.toEthStr(res[3]);
					const bidPrice = ethUtil.toEthStr(res[4]);
					const bidIncr = ethUtil.toEthStr(res[5]);
					const bidAddBlocks = res[6] + " Blocks";
					const bidAddBlocksTime = util.toTime(res[6].mul(blockTimeS).round());
					const initialBlocks = res[7] + " Blocks";
					const initialBlocksTime = util.toTime(res[7].mul(blockTimeS).round());

					$defined.find(".name").text(name);
					$defined.find(".isEnabled .value").text(enabled);
					$defined.find(".auction .value").empty().append($addr);
					$defined.find(".initialPrize .value").text(initialPrize);
					$defined.find(".bidPrice .value").text(bidPrice);
					$defined.find(".bidIncr .value ").text(bidIncr);
					$defined.find(".bidAddBlocks .value").text(`${bidAddBlocks} (~${bidAddBlocksTime})`);
					$defined.find(".initialBlocks .value").text(`${initialBlocks} (~${initialBlocksTime})`);
				});
				tippy($defined.find(".tipLeft").toArray(), { placement: "top" });
			};
		});
	}

	function refreshDice() {
		util.bindToElement(dice.version(), $("#DiceVersion"));
		util.bindToElement(ethUtil.getBalance(dice.address).then(ethUtil.toEthStr), $("#DiceBalance"));
		util.bindToElement(dice.minBankroll().then(ethUtil.toEthStr), $("#DiceMinBankroll"));
		util.bindToElement(dice.bankroll().then(ethUtil.toEthStr), $("#DiceBankroll"));
		util.bindToElement(dice.curId(), $("#DiceTotalRolls"));
		
		Promise.all([
			dice.totalWagered(),
			dice.totalWon()
		]).then(arr=>{
			const totalWagered = arr[0];
			const totalWon = arr[1];
			const totalProfit = totalWagered.minus(totalWon);
			$("#DiceTotalWagered").text(ethUtil.toEthStr(totalWagered));
			$("#DiceTotalWon").text(ethUtil.toEthStr(totalWon));
			$("#DiceTotalProfit").text(ethUtil.toEthStr(totalProfit));
		})

		const feePctPromise = dice.feeBips().then((num)=>{
			return num.div(100).toFixed(3) + "%";
		})
		util.bindToElement(feePctPromise, $("#DiceHouseFee"));
		util.bindToElement(dice.minBet().then(ethUtil.toEthStr), $("#DiceMinBet"));
		util.bindToElement(dice.maxBet().then(ethUtil.toEthStr), $("#DiceMaxBet"));
		util.bindToElement(dice.minNumber(), $("#DiceMinNumber"));
		util.bindToElement(dice.maxNumber(), $("#DiceMaxNumber"));
	}
});