Loader.require("reg", "comp", "tr")
.then(function(reg, comp, tr){

	// $("#BuyTokens").click(function(){
	// 	if (!comp) return alert('Comp must be defined.');
	// 	const val = new BigNumber($("#NumTokens").val());
	// 	const value = val.div(1000).mul(1e18);
	// 	comp.buyTokens([], {value: value}).then((res)=>{
	// 		console.log('token guy success:', res)
	// 		alert("Done");
	// 	}, (e)=>{
	// 		console.log('token buy error:', e);
	// 		alert("Error buying tokens.");
	// 	});
	// })

	$("#Load").click(refreshAll);

	function refreshAll() {
		refreshSettings();
		refreshHealth();
		refreshBalance();
		refreshStats();
	}

	function refreshSettings() {
		Promise.all([
			tr.token(),
			tr.comptroller(),
			tr.bankroll(),
			tr.dailyFundLimit(),
			tr.distributeRewardDenom()
		]).then((arr)=>{
			const tokenAddr = arr[0];
			const compAddr = arr[1];
			const bankroll = arr[2];
			const dailyFundLimit = arr[3];
			const distReward = (new BigNumber(1)).div(arr[4]).mul(100).toFixed(2);
			$("#TokenAddr .value").text(tokenAddr);
			$("#ComptrollerAddr .value").text(compAddr);
			$("#SettingsBankroll .value").text(ethUtil.toEthStr(bankroll));
			$("#DailyFundLimit .value").text(ethUtil.toEthStr(dailyFundLimit));
			$("#DistributionReward .value").text(distReward + "%");
		});
	}

	function refreshHealth() {
		// get various required things.
		const p = Promise.all([
			ethUtil.getBalance(tr),
			tr.bankroll(),
			tr.getMinBalanceToDistribute(),
			tr.dailyFundLimit()
		]);

		// refresh the finance bar
		util.bindToElement(p.then((arr)=>{
			const bar = new FinanceBar();
			bar.setValues(arr[0], arr[1], arr[2]);
			return bar.$e;
		}), $("#FinanceBar"), true);

		// refresh the BurnStatus and DividendStatus
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
				const diff = BigNumber.min(balance, divThreshold).minus(bankroll);
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
					.text(`☐ ${amt} ETH more needed to distribute a dividend.`)
					.removeClass("good");
			}
		});
	}

	function refreshBalance() {
		$("#Bankroll").text("loading...");
		$("#TotalRevenue").text("loading...");
		$("#TotalDistributed").text("loading...");
		$("#TotalFunded").text("loading...");
		$("#TotalRewarded").text("loading...");
		$("#TotalIn").text("loading...");
		$("#TotalOut").text("loading...");
		$("#ExpectedBalance").text("loading...");
		$("#IsBalanced").text("loading...");
		Promise.all([
			tr.bankroll(),
			tr.totalRevenue(),
			tr.totalDistributed(),
			tr.totalFunded(),
			tr.totalRewarded(),
			ethUtil.getBalance(tr)
		]).then((arr)=>{
			const bankroll = arr[0];
			const totalRevenue = arr[1];
			const totalDistributed = arr[2].mul(-1);
			const totalFunded = arr[3].mul(-1);
			const totalRewarded = arr[4].mul(-1);
			const balance = arr[5];
			const totalIn = bankroll.plus(totalRevenue);
			const totalOut = totalDistributed.plus(totalFunded).plus(totalRewarded);
			const expectedBalance = totalIn.minus(totalOut);
			$("#Bankroll").text(ethUtil.toEthStr(bankroll));
			$("#TotalRevenue").text(ethUtil.toEthStr(totalRevenue));
			$("#TotalDistributed").text(ethUtil.toEthStr(totalDistributed));
			$("#TotalFunded").text(ethUtil.toEthStr(totalFunded));
			$("#TotalRewarded").text(ethUtil.toEthStr(totalRewarded));
			$("#TotalIn").text(ethUtil.toEthStr(totalIn));
			$("#TotalOut").text(ethUtil.toEthStr(totalOut))
			$("#ExpectedBalance").text(ethUtil.toEthStr(expectedBalance));

			if (expectedBalance.equals(balance)) {
				$("#IsBalanced")
					.text(`☑ Treasury is balanced -- all funds accounted for.`)
					.addClass("good").removeClass("bad");
			} else {
				$("#IsBalanced")
					.text(`⚠️ Actual balance is ${ethUtil.toEth(balance) + "ETH"}`)
					.addClass("bad").removeClass("good");
			}
		})
	}

	function refreshStats() {
		function log(msg) { $("#Stats .log").text(msg); }

		const SECS_PER_DAY = 60*60*24;
		var now;
		var blockNums = {};
		ethUtil.getBlock("latest")
			.then((block)=>{
				now = block.timestamp;
				log("Finding block from 30 days ago.");
				return ethUtil.getBlockNumberAtTimestamp(now - 30*SECS_PER_DAY)
			})
			.then((blockNum)=>{
				blockNums[30] = blockNum;
				log("Finding block from 90 days ago.");
				return ethUtil.getBlockNumberAtTimestamp(now - 90*SECS_PER_DAY);
			})
			.then((blockNum)=>{
				blockNums[90] = blockNum;
				log("Finding block from 180 days ago.");
				return ethUtil.getBlockNumberAtTimestamp(now - 180*SECS_PER_DAY);
			})
			.then((blockNum)=>{
				blockNums[180] = blockNum;
				log("Populating results...");
			})
			.then(()=>{
				blockNums["Total"] = "latest";
				const storageIndexes = {
					totalRevenue: 9,
					totalDistributed: 12,
					totalFunded: 10,
					totalRewarded: 11
				};
				const values = {
					totalRevenue: {},
					totalDistributed: {},
					totalFunded: {},
					totalRewarded: {}
				};

				function setValue(fnName, numDaysAgo) {
					const storageIndex = storageIndexes[fnName];
					const blockNum = blockNums[numDaysAgo];
					if (!storageIndex)
						throw new Error(`No storageIndex found for fnName: ${fnName}`);
					if (!blockNum)
						throw new Error(`No blockNum found for numDaysAgo: ${numDaysAgo}`);

					return _niceWeb3.ethUtil.getStorageAt(tr.address, storageIndex, blockNum)
						.then((val)=>{
							val = web3.toBigNumber(val);
							values[fnName][numDaysAgo] = web3.toBigNumber(val);
						});
				}
				function setAllValuesFromDaysAgo(numDaysAgo) {
					// request values for all fnNames at once.
					return Promise.all(
						Object.keys(values).map(fnName => setValue(fnName, numDaysAgo))
					);
				}
				function setAllValues(){
					// for each daysAgo, setAllValuesFromDaysAgo. chain this.
					log("Retrieving all values...");
					var p = Promise.resolve();
					Object.keys(blockNums).forEach((numDaysAgo)=>{
						p = p.then(()=>{
							log(`Loading all values from ${numDaysAgo}...`);
							return setAllValuesFromDaysAgo(numDaysAgo)
						});
					});
					return p;
				}

				setAllValues().then(()=>{
					// set each value to Total - <whatever>
					Object.keys(values).forEach((fnName)=>{
						Object.keys(values[fnName]).forEach((numDaysAgo)=>{
							if (numDaysAgo == "Total") return;
							values[fnName][numDaysAgo] = values[fnName]["Total"]
								.minus(values[fnName][numDaysAgo]);
						});
					});
				}).then(()=>{
					// Populate values on page
					log("");
					Object.keys(values).forEach((fnName)=>{
						Object.keys(values[fnName]).forEach((numDaysAgo)=>{
							// convert "totalWhatever" to "Wha"
							const val = values[fnName][numDaysAgo];
							const name = fnName.slice(5,8);
							const id = `#${name}${numDaysAgo}`;
							$(id).text(ethUtil.toEthStr(val));
							if (numDaysAgo!=="Total"){
								const rr = val.mul(365).div(numDaysAgo);
								$(`${id}RR`).text("~" + ethUtil.toEthStr(rr,0) + " / yr");
							}
						});
					});
				})
			})
	}

	function FinanceBar() {
		const _$e = $(`
			<div class="FinanceBar">
				<div class="bar" style="position: relative;">
					<div class="divBar" style="height: 100%; position: absolute;"></div>
					<div class="fundingBar" style="height: 100%; position: absolute;"></div>
					<div class="bankrollBar" style="height: 100%; position: absolute;"></div>
					<div class="collatBar" style="height: 100%; position: absolute;"></div>

					<div class="bankrollMarker" style="height: 100%; position: absolute;"></div>
					<div class="divThreshMarker" style="height: 100%; position: absolute;"></div>
					<div class="balanceMarker" style="height: 100%; position: absolute;"></div>

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

		const _$balanceMarker = _$e.find(".balanceMarker");
		const _$bankrollMarker = _$e.find(".bankrollMarker");
		const _$divThreshMarker = _$e.find(".divThreshMarker");

		const _$balanceTxt = _$e.find(".balanceTxt")
			.attr("title", "The amount of ETH Treasury is holding.")
			.addClass("tipped");
		const _$bankrollTxt = _$e.find(".bankrollTxt")
			.attr("title", "The amount of ETH token holders have staked. If balance is above this, all token holder's ETH is safe.")
			.addClass("tipped");
		const _$divThreshTxt = _$e.find(".divThreshTxt")
			.attr("title", "Any balance above this amount can be distributed as dividends.")
			.addClass("tipped");
		tippy([_$balanceTxt[0], _$bankrollTxt[0], _$divThreshTxt[0]]);

		this.$e = _$e;
		this.setValues = function(balance, bankroll, divThreshold){
			_$amtBalance.text(ethUtil.toEthStr(balance));
			_$amtBankroll.text(ethUtil.toEthStr(bankroll));
			_$amtDivThresh.text(ethUtil.toEthStr(divThreshold));

			// calculate max number, add 10%
			const max = BigNumber.max(balance, bankroll, divThreshold).mul(1.1);
			function toPct(val) {
				return val.div(max).mul(100).toFixed(2) + "%";
			}

			_$balanceMarker.width(toPct(balance));
			_$bankrollMarker.width(toPct(bankroll));
			_$divThreshMarker.width(toPct(divThreshold));
			_$balanceTxt.css("left", toPct(balance))
				.text("↓ Balance: " + ethUtil.toEthStr(balance));
			_$bankrollTxt.css("left", toPct(bankroll))
				.text("↑ Bankroll: " + ethUtil.toEthStr(bankroll));
			_$divThreshTxt.css("left", toPct(divThreshold))
				.text("↑ Dividend Threshold: " + ethUtil.toEthStr(divThreshold));

			if (balance.gt(divThreshold)) {
				_$collatBar.width(toPct(bankroll));
				_$fundingBar.show().width(toPct(divThreshold));
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