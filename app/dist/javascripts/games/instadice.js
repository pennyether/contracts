Loader.require("dice")
.then(function(dice){
	ethUtil.onStateChanged(refreshRecentRolls);

	const avgBlockTime = ethUtil.getAverageBlockTime();

	const $bet = $("#Bet");
	const $number = $("#Number");
	const $odds = $("#Odds");
	const $payout = $("#Payout");
	const $results = $("#Results");

	//dice.addBankroll([], {value: 1e18});

	const $btn = $("#PlaceBet").click(function(){
		bet = (new BigNumber($bet.val())).mul(1e18);
		number = new BigNumber($number.val());
		trackResult(
			dice.roll({_number: number}, {value: bet, gas: 138000}),
			bet,
			number
		);
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


	function getRollFromWageredOrRefunded(event, curId){
		const roll = {}
		roll.id = event.name=="RollWagered" ? event.args.id : null;
		roll.txId = event.transactionHash;
		roll.state = event.name=="RollWagered"
			? curId.equals(roll.id) ? "waiting" : "unresolved"
			: "refunded";
		roll.bet = event.args.bet;
		roll.number = event.args.number;
		roll.result = event.name=="RollWagered"
			? computeResult(event.blockHash, event.args.id)
			: null;
		roll.isWinner = event.name=="RollWagered"
			? !roll.result.gt(roll.number)
			: null;
		roll.refundReason = event.name=="RollWagered"
			? null
			: event.args.msg;
		roll.created = {
			blockNumber: event.blockNumber,
			blockHash: event.blockHash,
			txId: event.transactionHash,
			txIndex: event.transactionIndex,
			time: event.args.time
		};
		return roll;
	}

	function refreshRecentRolls(state) {
		Promise.all([
			dice.curId(),
			dice.getEvents("RollWagered", {user: state.account}, state.latestBlock.number - 256),
    		dice.getEvents("RollRefunded", {user: state.account}, state.latestBlock.number - 256),
    		dice.getEvents("RollResolved", {user: state.account}, state.latestBlock.number - 256),
    		dice.getEvents("PayoutSuccess", {user: state.account}, state.latestBlock.number - 256),
    		dice.getEvents("PayoutFailure", {user: state.account}, state.latestBlock.number - 256)
		]).then((arr)=>{
			const curId = arr[0];
			const rollsWagered = arr[1];
			const rollsRefunded = arr[2];
			const rollsResolved = arr[3];
			const rollsPaid = arr[4];
			const rollsUnpayable = arr[5];

			// collate the events into an object for each roll:
			// - state (refunded, waiting, unresolved, resolved, paid, paymentfailed)
			// - id (transactionId if Refunded)
			// - txId
			// - bet, number
			// - result
			// - isWinner
			// - refundReason
			// - err
			// - created (blockNumber, blockHash, txId, txIndex, time)
			// - resolved (blockNumber, txId, time)
			// - paid (blockNumber, txId, time)
			// - paymentfailure (blockNumber, txId, time)
			const rolls = {};
			rollsWagered.concat(rollsRefunded).forEach((event)=>{
				const roll = getRollFromWageredOrRefunded(event, curId);
				rolls[roll.id || event.transactionHash] = roll;
			});
			rollsResolved.forEach((event)=>{
				const roll = rolls[event.args.id];
				if (!roll) return;
				if (!roll.result.equals(event.args.result))
					console.error("Contract got different result than us!", roll);
				roll.result = event.args.result;
				roll.state = "resolved";
				roll.resolved = {
					blockNumber: event.blockNumber,
					txId: event.transactionHash,
					time: event.args.time
				};
			});
			rollsPaid.forEach((event)=>{
				const roll = rolls[event.args.id];
				if (!roll) return;
				roll.state = "paid";
				roll.paid = {
					blockNumber: event.blockNumber,
					txId: event.transactionHash,
					time: event.args.time
				};
			});
			rollsUnpayable.forEach((event)=>{
				const roll = rolls[event.args.id];
				if (!roll) return;
				roll.state = "paymentfailed";
				roll.paymentfailure = {
					blockNumber: event.blockNumber,
					txId: event.transactionHash,
					time: event.args.time
				}
			});

			const allRolls = Object.values(rolls);
			allRolls.sort((a, b)=>{
				a = a.created;
				b = b.created;
				if (a.blockNumber < b.blockNumber) return -1;
				if (a.blockNumber > b.blockNumber) return 1;
				return a.txIndex < b.txIndex
					? -1
					: 1;
			}).reverse();
			refreshRolls(allRolls, state.latestBlock.number);
		});
    }

    // maps roll.id -> true/false
    const _$currentRolls = {};
    function refreshRolls(rolls, curBlockNum) {
    	$(".recentRolls").empty();
    	rolls.forEach((roll)=>{
    		$getRoll(roll, curBlockNum).appendTo(".recentRolls");
    		if (_$currentRolls[roll.id]) {
    			const $new = $getRoll(roll, curBlockNum);
    			_$currentRolls[roll.id].replaceWith($new);
    			_$currentRolls[roll.id] = $new;
    		}
    	})
    }

    const _msgs = [
    	"Don't give up so easily...",
    	"Better luck next time",
    	"You can shake it off",
    	"Never say 'die'",
    	"Stay strong",
    	"Believe in yourself",
    	"Follow your dreams",
    	"You're just a tiny bit unlucky",
    	"Let's pretend like this never happened.",
    	"By tomorrow, you'll forget all about this.",
    	"You miss 100% of the shots you don't take",
    	"Why not try again?",
    	"At least you still have your health.",
    	"Some things just weren't meant to be.",
    	"It's not the end of the world",
    ];
    function getLoseMsg(num) {
    	return _msgs[num % _msgs.length];
    }

    // - state (prepending, pending, failed, refunded, waiting, unresolved, resolved, paid, paymentfailed)
	// - id (transactionId if Refunded)
	// - bet, number
	// - result
	// - isWinner
	// - refundReason
	// - failReason
	// - created (blockNumber, blockHash, txId, time)
	// - resolved (blockNumber, txId)
	// - paid (blockNumber, txId)
	// - paymentfailure (blockNumber, txId)
    function $getRoll(roll, curBlockNum) {
    	const $e = $(".roll.template")
    		.clone()
    		.removeClass("template")
    		.show();

    	const $status = $e.find(".status");
    	const $prepending = $e.find(".status .prepending").hide();
    	const $pending = $e.find(".status .pending").hide();
    	const $refund = $e.find(".status .refunded").hide();
    	const $failed = $e.find(".status .failed").hide();
    	const $result = $e.find(".result").hide();
    	const $mined = $e.find(".mined").hide();
    	
    	const bet = roll.bet;
    	const number = roll.number;
    	const txId = roll.txId;
    	const payout = computePayout(bet, number);
    	const multiple = payout.div(bet).toFixed(2);
    	const payoutStr = ethUtil.toEthStr(payout);
    	$e.find(".betValue").text(ethUtil.toEthStr(bet));
    	$e.find(".numberValue").text(`${number} or lower`);
    	$e.find(".payoutValue").text(`${payoutStr} (${multiple}x)`);
    	if (roll.state == "prepending") {
    		$prepending.show();
    		return $e.addClass("prepending");
    	}
    	if (roll.state == "pending") {
    		$pending.show();
    		$e.find(".pendingTxLink")
    			.append(util.$getTxLink("See it on Etherscan", roll.txId));
    		return $e.addClass("pending");
    	}

    	if (roll.created) {
	    	const id = roll.id;
	    	const time = roll.created.time;
	    	const blockNum = roll.created.blockNumber;
	    	const blockHash = roll.created.blockHash;
			var options = {  
			    weekday: "short",
			    day: "numeric",
			    month: "short",
			    hour: "2-digit",
			    minute: "2-digit",
			    second: "2-digit"
			};  
			const rollStr = id ? `Roll #${id},` : ``;
	    	const dateStr = (new Date(roll.created.time.toNumber()*1000))
	    		.toLocaleString(window.navigator.language, options);
	    	const $txLink = util.$getTxLink(blockNum, txId);
	    	$e.find(".mined").empty()
	    		.show()
	    		.append(`${rollStr} Block `)
	    		.append($txLink)
	    		.append(` (${dateStr})`);
	    }

    	if (roll.state == "refunded") {
    		const msg = roll.refundReason;
    		$e.addClass("refunded");
    		$refund.show();
    		$refund.find(".reason").text(msg);
    		return $e;
    	}
    	if (roll.state == "failed") {
    		$e.addClass("failed");
    		$failed.show();
    		$failed.find(".reason").text(roll.failReason);
    		return $e;
    	}

		$status.hide();
		$result.show();
		const $won = $result.find(".won").hide();
		const $lost = $result.find(".lost").hide();
		const $rollnumber = $result.find(".rollnumber");
		
		const result = computeResult(roll.created.blockHash, roll.id);
		const didWin = !result.gt(number);
		$rollnumber.text(result);
		if (didWin) {
			$e.addClass("won");
			$won.show();
		} else {
			$e.addClass("lost");
			$lost.show();
		}

		const $waiting = $result.find(".waiting").hide();
		const $unresolved = $result.find(".unresolved").hide();
		const $paid = $result.find(".paid").hide();
		const $paymentFailure = $result.find(".paymentFailure").hide();
		const $lostMsg = $result.find(".lostMsg").hide();
		if (didWin){
			if (roll.state == "waiting") {
				$waiting.show();
			} else if (roll.state == "unresolved") {
				$unresolved.show();
			} else if (roll.state == "paid") {
				$paid.empty()
					.append(util.$getTxLink("Your winnings have been paid.", roll.paid.txId))
					.show();
			} else if (roll.state == "paymentfailure") {
				$paymentFailure.show();
			}
		} else {
			$lostMsg.show().text(getLoseMsg(roll.id));
		}
		avgBlockTime.then((blocktime)=>{
			const blocksLeft = 255 - (curBlockNum - roll.created.blockNumber);
			const timeLeft = util.toTime(blocktime.mul(blocksLeft))
			$result.find(".blocksLeft").text(`${blocksLeft} blocks (~${timeLeft})`);
		});
    	return $e;
    }

	function trackResult(p, bet, number) {
		var roll = {
			state: "prepending",
			id: null,
			bet: bet,
			number: number,
		};
		var $e = $getRoll(roll).prependTo(".currentRolls");

		p.getTxHash.then((txId)=>{
			roll.state = "pending";
			roll.txId = txId;
			const $new = $getRoll(roll);
			$e.replaceWith($new);
			$e = $new;
		});
		p.then((res)=>{
			res.knownEvents.forEach((event)=>{
				if (event.name=="RollWagered" || event.name=="RollRefunded") {
					dice.curId().then((curId)=>{
						var roll = getRollFromWageredOrRefunded(event, curId);
						const $new = $getRoll(roll);
						$e.replaceWith($new);
						_$currentRolls[roll.id] = $new;
					})
				}
			});
		},(e)=>{
			// (blockNumber, blockHash, txId, time)
			roll.state = "failed"
			roll.failReason = e.message;
			if (e.receipt) {
				roll.created = {
					blockHash: e.receipt.blockHash,
					blockNumber: e.receipt.blockNumber,
					txId: e.receipt.transactionHash,
					time: new BigNumber((+new Date())/1000)
				};
			}
			const $new = $getRoll(roll);
			$e.replaceWith($new);
			$e = $new;
		});
	}


});