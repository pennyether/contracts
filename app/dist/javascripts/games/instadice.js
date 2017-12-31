Loader.require("dice")
.then(function(dice){
	ethUtil.onStateChanged(refreshRecentBids);

	const $bet = $("#Bet");
	const $number = $("#Number");
	const $odds = $("#Odds");
	const $payout = $("#Payout");
	const $results = $("#Results");

	//dice.addBankroll([], {value: 1e18});

	const $btn = $("#PlaceBet").click(function(){
		bet = (new BigNumber($bet.val())).mul(1e18);
		number = new BigNumber($number.val());
		trackResult(dice.roll({_number: number}, {value: bet, gas: 138000}));
	});

	function computeResult(blockHash, id) {
        const hash = web3.sha3(blockHash + ethUtil.toBytesStr(id, 4), {encoding: "hex"});
        const bn = new BigNumber(hash);
        return bn.mod(100).plus(1);
    }
    function computePayout(bet, number) {
		return bet.mul(100).div(number).mul(.99)
    }
	(function pollForChanges(){
		var bet = $bet.val();
		var number = $number.val();
		try { bet = (new BigNumber(bet)).mul(1e18) }
		catch (e) { bet = null; }
		try { number = new BigNumber(number); }
		catch (e) { number = null; }

		if (bet == null || bet.equals(0)){
			$odds.text("Invalid bet.");
			$payout.text("Invalid bet.");
			$btn.attr("disabled", "disabled");
		}else if (number == null){
			$odds.text("Invalid number");
			$payout.text("Invalid number.");
			$btn.attr("disabled", "disabled");
		} else {
			$odds.text(`${number} %`);
			const payout = computePayout(bet, number);
			const multiple = payout.div(bet).toFixed(2);
			$payout.text(`${ethUtil.toEthStr(payout)} (${multiple}x)`);
			$btn.removeAttr("disabled");
		}

		setTimeout(pollForChanges, 50);
	}());

	function refreshAll() {
		refreshTrackedBids();
		refreshRecentBids();
	}

	function refreshRecentBids(state) {
		Promise.all([
			dice.getEvents("RollWagered", {user: state.account}, state.latestBlock.number - 256),
    		dice.getEvents("RollRefunded", {user: state.account}, state.latestBlock.number - 256)
		]).then((arr)=>{
			const rollsWagered = arr[0];
			const rollsRefunded = arr[1];
			const rolls = rollsWagered.concat(rollsRefunded);
			rolls.sort((a, b)=>{
				if (a.blockNumber < b.blockNumber) return -1;
				if (a.blockNumber > b.blockNumber) return 1;
				return a.transactionIndex < b.transactionIndex
					? -1
					: 1;
			}).reverse();
			get$Rolls(rolls, state.latestBlock.number);
		});
    }

    function get$Rolls(rolls, curBlockNum) {
    	rolls.forEach((roll)=>{
    		get$Roll(roll, curBlockNum)
    	})
    }

    const _$rolls = {};
    function get$Roll(event, curBlockNum) {
    	const txHash = event.transactionHash;
    	if (_$rolls[txHash]) return _$rolls[txHash];

    	const $e = $(".roll.template").clone().removeClass("template").show();
    	const $status = $e.find(".status");
    	const $pending = $e.find(".status .pending").hide();
    	const $refund = $e.find(".status .refund").hide();
    	const $result = $e.find(".result").hide();

    	const isRefund = event.name == "RollRefunded";
    	const time = event.args.time;
    	const bet = event.args.bet;
    	const number = event.args.number;
    	const id = event.args.id;		// may be undefined for RollRefunded
    	const msg = event.args.msg;
    	const blockNum = event.blockNumber;
    	const blockHash = event.blockHash;
    	const payout = computePayout(bet, number);
    	const multiple = payout.div(bet).toFixed(2);

    	const payoutStr = ethUtil.toEthStr(payout);
    	$e.find(".betValue").text(ethUtil.toEthStr(bet));
    	$e.find(".numberValue").text(`${number} or lower`);
    	$e.find(".payoutValue").text(`${payoutStr} (${multiple}x)`);

		var options = {  
		    weekday: "short",
		    day: "numeric",
		    month: "short",
		    year: "numeric", 
		    hour: "2-digit",
		    minute: "2-digit",
		    second: "2-digit"
		};  
		const rollStr = id ? `Roll #${id},` : ``;
    	const dateStr = (new Date(time.toNumber()*1000)).toLocaleString(window.navigator.language, options);
    	const $txLink = util.$getTxLink(blockNum, txHash);
    	$e.find(".mined").empty()
    		.append(`${rollStr} Block `)
    		.append($txLink)
    		.append(` (${dateStr})`);

    	if (isRefund) {
    		$e.addClass("refunded");
    		$refund.show();
    		$refund.find(".reason").text(msg);
    	} else {
    		$status.hide();
			$result.show();
			const $won = $result.find(".won").hide();
			const $lost = $result.find(".lost").hide();
			const $rollnumber = $result.find(".rollnumber");
			
			const result = computeResult(blockHash, id);
			const didWin = !result.gt(number);
			
			$rollnumber.text(`Roll was ${result}`);
			if (didWin) {
				$e.addClass("won");
				$won.show();
			} else {
				$e.addClass("lost");
				$lost.show();
			}
    	}

    	_$rolls[txHash] = $e;
    	return $e.appendTo(".recentRolls");
    }

    function refreshTrackedBids() {
    	
    }

	function trackResult(p) {
		const $e = $(`
			<div class='result'>
				<div class='status'></div>
				<div class='result'></div>
			</div>
		`).appendTo($results);
		const $status = $e.find(".status").text("Awaiting transaction ID");
		const $result = $e.find(".result").hide();

		p.getTxHash.then((txHash)=>{
			$status.empty().append(util.$getTxLink(txHash));
			$result.show().text("Mining... your results will be available soon!");
		});
		p.then((res)=>{
			$result.empty();
			res.knownEvents.forEach((event)=>{
				if (event.name=="RollWagered") {
					const blockHash = event.blockHash;
					const id = event.args.id;
					const number = event.args.number;
					const bet = event.args.bet;
					const result = computeResult(blockHash, id);
					const payout = result.gt(number)
						? new BigNumber(0)
						: computePayout(bet, number);
					if (payout.gt(0)){
						$result.append(`Roll #${id} was ${result}. You won ${ethUtil.toEthStr(payout)}!<br>`);
					} else {
						$result.append(`Roll #${id} was ${result}. You lost.<br>`);
					}
				}
				if (event.name=="RollRefunded") {
					const reason = event.args.msg;
					$result.append(`Your wager was refunded: ${reason}<br>`);
				}
				if (event.name=="RollResolved") {
					const id = event.args.id;
					const number = event.args.number;
					const bet = event.args.bet;
					const result = event.args.result;
					const payout = event.args.payout;
					$result.append(`Resolved: Roll #${id} rolled ${result} for a payout of ${payout}<br>`);
				}
			});
		},(e)=>{
			$result.empty().append(`The transaction failed: ${e}`);
		});
	}


});