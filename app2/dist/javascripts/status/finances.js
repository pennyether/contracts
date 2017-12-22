Loader.promise.then(function(){
	function bindToElement(promise, element, doAppend) {
		element.empty().text("loading...");
		promise.then(function(res){
			doAppend
				? element.empty().append(res)
				: element.empty().text(res);
		},function(e){
			element.empty().text(`Error: ${e.message}`);
		});
	}

	$("#PopulateAll").click(function(){
		const $log = $("#PopulateLog").empty();
		const addLog = (msg) => $log.append($("<div>").text(msg));

		const regAddress = $("#PopulateAllRegAddress").val();
		if (!regAddress) return alert("Must provide a registry address.");

		reg = Registry.at(regAddress);
		comp = null;
		tr = null;
		addLog("Loading all addresses.");
		Promise.resolve()
			// Comptroller
			.then(()=>reg.addressOf({_name: "COMPTROLLER"}))
			.then((addr)=>{
				if (addr=="0x") throw new Error();
				addLog(`Found comptroller at ${addr}`);
				comp = Comptroller.at(addr);
			}, (e)=>{ addLog(`Didn't find comptroller.`); })
			// Treasury
			.then(()=>reg.addressOf({_name: "TREASURY"}))
			.then((addr)=>{
				if (addr=="0x") throw new Error();
				addLog(`Found treasury at ${addr}`);
				tr = Treasury.at(addr);
			}, (e)=>{ addLog(`Didn't find treasury.`); })
			.then(function(){
				addLog("All loading complete. Refreshing everything now.");
				refreshAll();
			})
	});

	function refreshAll() {
		refreshFinanceBar();
		refreshDetails();
	}

	function refreshFinanceBar() {
		const p = Promise.all([
			ethUtil.getBalance(tr),
			tr.bankroll(),
			tr.getMinBalanceToDistribute(),
			tr.dailyFundLimit()
		]);

		const barPromise = p.then((arr)=>{
			const bar = new FinanceBar();
			bar.setValues(arr[0], arr[1], arr[2]);
			return bar.$e;
		});

		p.then((arr)=>{
			const balance = arr[0];
			const bankroll = arr[1];
			const divThreshold = arr[2];
			const dailyFundLimit = arr[3];

			if (balance.lt(bankroll)) {
				const pct = balance.div(bankroll).mul(100).toFixed(2);
				$("#BurnStatus")
					.text(`⚠️ ${pct}% of tokens can be burnt for a refund.`)
					.addClass("bad")
					.removeClass("good");
			} else {
				const diff = balance.minus(bankroll);
				const days = diff.div(dailyFundLimit).toFixed(2);
				$("#BurnStatus")
					.text(`☑ 100% of tokens can be burnt for a refund, for at least ${days} days.`)
					.addClass("good")
					.removeClass("bad");
			}

			if (balance.gt(divThreshold)) {
				const amt = ethUtil.toEth(balance.minus(divThreshold));
				$("#DivStatus")
					.text(`☑ ${amt} ETH can currently be sent as dividends.`)
					.addClass("good");
			} else {
				const amt = ethUtil.toEth(divThreshold.minus(balance));
				$("#DivStatus")
					.text(`☐ ${amt} ETH away from being able to send a dividend.`)
					.removeClass("good");
			}
		});

		bindToElement(barPromise, $("#FinanceBar"), true);
	}

	function refreshDetails() {

	}

	function FinanceBar() {
		const _$e = $(`
			<div class="FinanceBar">
				<div class="bar" style="position: relative;">
					<div class="divBar" style="height: 100% position: absolute;"></div>
					<div class="fundingBar" style="height: 100%; position: absolute;"></div>
					<div class="bankrollBar" style="height: 100%; position: absolute;"></div>
					<div class="collatBar" style="height: 100%; position: absolute;"></div>
					<div class="bankrollMarker" style="height: 100%; position: absolute;"></div>
					<div class="divThreshMarker" style="height: 100%; position: absolute;"></div>

					<div class="balanceTxt" style="position: absolute; top: -20px;"></div>
					<div class="bankrollTxt" style="position: absolute; bottom: -20px;"></div>
					<div class="divThreshTxt" style="position: absolute; bottom: -20px;"></div>
				</div>
			</div>
		`);
		const _$amtBalance = _$e.find(".amtBalance");
		const _$amtBankroll = _$e.find(".amtBankroll");
		const _$amtDivThresh = _$e.find(".amtDivThresh");
		const _$divBar = _$e.find(".divBar");
		const _$fundingBar = _$e.find(".fundingBar");
		const _$bankrollBar = _$e.find(".bankroll");
		const _$collatBar = _$e.find(".collatBar");

		const _$bankrollMarker = _$e.find(".bankrollMarker");
		const _$divThreshMarker = _$e.find(".divThreshMarker");

		const _$balanceTxt = _$e.find(".balanceTxt");
		const _$bankrollTxt = _$e.find(".bankrollTxt");
		const _$divThreshTxt = _$e.find(".divThreshTxt");

		this.$e = _$e;
		this.setValues = function(balance, bankroll, divThreshold){
			_$amtBalance.text(ethUtil.toEth(balance) + " ETH");
			_$amtBankroll.text(ethUtil.toEth(bankroll) + " ETH");
			_$amtDivThresh.text(ethUtil.toEth(divThreshold) + " ETH");

			// calculate max number, add 10%
			const max = BigNumber.max(balance, bankroll, divThreshold).mul(1.1);
			function toPct(val) {
				const result = val.div(max).mul(100).toFixed(2) + "%";
				console.log("max, val, result", max, val, result);
				return result;
			}

			_$bankrollMarker.width(toPct(bankroll));
			_$divThreshMarker.width(toPct(divThreshold));
			_$balanceTxt.css("left", toPct(balance))
				.text("↓ Balance: " + ethUtil.toEth(balance) + " ETH");
			_$bankrollTxt.css("left", toPct(bankroll))
				.text("↑ Bankroll: " + ethUtil.toEth(bankroll) + " ETH");
			_$divThreshTxt.css("left", toPct(divThreshold))
				.text("↑ Dividend Threshold: " + ethUtil.toEth(divThreshold) + " ETH");
			if (balance.gt(divThreshold)) {
				_$collatBar.width(toPct(bankroll));
				_$fundingBar.hide();
				_$divBar.show().width(toPct(balance));
			} else if (balance.gt(bankroll)){
				_$collatBar.width(toPct(bankroll));
				_$fundingBar.show().width(toPct(balance));
				_$divBar.hide();
			} else {
				_$collatBar.width(toPct(balance));
				_$fundingBar.hide();
				_$divBar.hide();
			}
		}
	}
});