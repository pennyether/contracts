Loader.require("tr", "mc")
.then(function(tr, mc){
	$(".paStart .gasPrice").keypress(e=>{
		if(e.which == 13) updatePaStart();
	});
	$(".paStart .refresh").click(updatePaStart);

	$(".paRefresh .gasPrice").keypress(e=>{
		if(e.which == 13) updatePaRefresh();
	});
	$(".paRefresh .refresh").click(updatePaRefresh)
	
	$(".trDiv .gasPrice").keypress(e=>{
		if(e.which == 13) updateTrDiv();
	});
	$(".trDiv .refresh").click(updateTrDiv);

	updateAll();

	function updateAll() {
		updatePaStart();
		updatePaRefresh();
		updateTrDiv();
	}

	function updatePaStart() {
		const $e = $(".paStart");
		const $fields = $e.find(".fields");
		const $notice = $e.find(".notice");
		const $gasPrice = $e.find(".gasPrice");
		const $reward = $e.find(".reward .value").text("Loading...");
		const $cost = $e.find(".cost .value").text("Loading...");
		const $profit = $e.find(".profit .value").text("Loading...");
		const $risk = $e.find(".risk .value").text("Loading...");
		const failGasVal = new BigNumber($e.find(".failGasPrice").val());
		var gasPrice;

		try {
			gasPrice = new BigNumber($gasPrice.val()).mul(1e9);
		} catch(e) {
			gasPrice = new BigNumber(0);
		}

		mc.getStartPennyAuctionReward().then(res=>{
			var data = {
				reward: res[0],
				index: res[1],
				estGas: null
			}
			if (data.reward.gt(0)){
				return mc.startPennyAuction(index).estimateGas()
					.then(estGas=>{
						data.estGas = estGas
						return data
					})
			} else {
				return data;
			}
		}).then(data=>{
			const reward = data.reward;
			const estGas = data.estGas;
			const index = data.index;

			if (!reward.gt(0)){
				$notice.show();
				$fields.hide();
				return;
			} else {
				$notice.hide();
				$fields.show();	
			}
			
			if (gasPrice.gt(0)) {
				const cost = estGas.mul(gasPrice);
				const profit = reward.minus(cost);
				const risk = failGasVal.mul(gasPrice);
				$reward.text(`${ethUtil.toEthStr(reward)}`);
				$cost.text(`${ethUtil.toEthStr(cost)} (${estGas} gas)`);
				$profit.text(`${ethUtil.toEthStr(profit)}`)
					.removeClass("good bad")
					.addClass(profit.gt(0) ? "good" : "bad");
				$risk.text(`${ethUtil.toEthStr(risk)} (${failGasVal} gas)`);
			} else {
				$reward.text("Invalid gasPrice");
				$cost.text("Invalid gasPrice");
				$profit.text("Invalid gasPrice");
				$risk.text("Invalid gasPrice");
			}
		});
	}

	function updatePaRefresh() {
		const $e = $(".paRefresh");
		const $fields = $e.find(".fields");
		const $notice = $e.find(".notice");
		const $gasPrice = $e.find(".gasPrice");
		const $settings = $e.find(".settings .value").text("Loading...");
		const $available = $e.find(".available .value").text("Loading...");
		const $reward = $e.find(".reward .value").text("Loading...");
		const $cost = $e.find(".cost .value").text("Loading...");
		const $profit = $e.find(".profit .value").text("Loading...");
		const $risk = $e.find(".risk .value").text("Loading...");
		var gasPrice;

		try {
			gasPrice = new BigNumber($gasPrice.val()).mul(1e9);
		} catch(e) {
			gasPrice = new BigNumber(0);
		}

		Promise.all([
			mc.paEndReward(),
			mc.paFeeCollectRewardDenom(),
			mc.getRefreshPennyAuctionsReward(),
			mc.refreshPennyAuctions.estimateGas(),
			mc.refreshPennyAuctions.call(),
			mc.getRefreshPennyAuctionsReward.estimateGas()
		]).then(arr=>{
			const endReward = arr[0];
			const feeCollectDenom = arr[1];
			const reward = arr[2];
			const estGas = arr[3];
			const gamesEnded = arr[4][0];
			const feesCollected = arr[4][1];
			const failGasVal = new BigNumber(arr[5]);

			if (!reward.gt(0)){
				$notice.show();
				$fields.hide();
				return;
			} else {
				$notice.hide();
				$fields.show();	
			}
			
			const perEndEth = ethUtil.toEthStr(endReward);
			const feePct = (new BigNumber(1)).div(feeCollectDenom).mul(100) + "%";
			const feesStr = ethUtil.toEthStr(feesCollected);
			$settings.text(`${perEndEth} per auction ended + ${feePct} of fees collected`);
			$available.text(`${gamesEnded} auctions to end, ${feesStr} in fees to collect.`);
			if (gasPrice.gt(0)) {
				const cost = estGas.mul(gasPrice);
				const profit = reward.minus(cost);
				const risk = failGasVal.mul(gasPrice);
				$reward.text(`${ethUtil.toEthStr(reward)}`);
				$cost.text(`${ethUtil.toEthStr(cost)} (${estGas} gas)`);
				$profit.text(`${ethUtil.toEthStr(profit)}`)
					.removeClass("good bad")
					.addClass(profit.gt(0) ? "good" : "bad");
				$risk.text(`${ethUtil.toEthStr(risk)} (${failGasVal} gas)`);
			} else {
				$reward.text("Invalid gasPrice");
				$cost.text("Invalid gasPrice");
				$profit.text("Invalid gasPrice");
				$risk.text("Invalid gasPrice");
			}
		});
	}

	function updateTrDiv() {
		const $e = $(".trDiv");
		const $fields = $e.find(".fields");
		const $notice = $e.find(".notice");
		const $gasPrice = $e.find(".gasPrice");
		const $amount = $e.find(".amount .value").text("Loading...");
		const $reward = $e.find(".reward .value").text("Loading...");
		const $cost = $e.find(".cost .value").text("Loading...");
		const $profit = $e.find(".profit .value").text("Loading...");
		const $risk = $e.find(".risk .value").text("Loading...");
		const failGasVal = new BigNumber($e.find(".failGasPrice").val());
		var gasPrice;

		try {
			gasPrice = new BigNumber($gasPrice.val()).mul(1e9);
		} catch(e) {
			gasPrice = new BigNumber(0);
		}

		Promise.all([
			tr.getAmountToDistribute(),
			tr.distributeRewardDenom(),
			tr.distributeToToken.estimateGas(),
		]).then(arr=>{
			const amount = arr[0];
			const rewDenom = arr[1];
			const estGas = new BigNumber(arr[2]);

			if (!amount.gt(0)) {
				$notice.show();
				$fields.hide();
				return;
			}

			$notice.hide();
			$fields.show();	
			$amount.text(ethUtil.toEthStr(amount));
			if (gasPrice.gt(0)) {
				const reward = amount.div(rewDenom);
				const pct = (new BigNumber(1)).div(rewDenom).mul(100) + "%";
				const cost = estGas.mul(gasPrice);
				const profit = reward.minus(cost);
				const risk = failGasVal.mul(gasPrice);
				$reward.text(`${ethUtil.toEthStr(reward)} (${pct} of profits)`);
				$cost.text(`${ethUtil.toEthStr(cost)} (${estGas} gas)`);
				$profit.text(`${ethUtil.toEthStr(profit)}`)
					.removeClass("good bad")
					.addClass(profit.gt(0) ? "good" : "bad");
				$risk.text(`${ethUtil.toEthStr(risk)} (${failGasVal} gas)`);
			} else {
				$reward.text("Invalid gasPrice");
				$cost.text("Invalid gasPrice");
				$profit.text("Invalid gasPrice");
				$risk.text("Invalid gasPrice");
			}
			
		})
	}
});