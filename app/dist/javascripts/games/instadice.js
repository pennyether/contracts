Loader.require("dice")
.then(function(dice){
	//dice.addBankroll([], {value: 1e18});

	ethUtil.onStateChanged((state)=>{
		refreshAllRolls(state);
		refreshStats();
	});


	/******************************************************/
	/*** BET PLACING UI ***********************************/
	/******************************************************/
	const $loader = $(".better .loader");
	const $wagerText = $(".better .wager .input");
	const $wagerRange = $(".better .wager .range");
	const $numberText = $(".better .number .input");
	const $numberRange = $(".better .number .range");
	const $valid = $(".better .valid");
	const $invalid = $(".better .invalid");
	const $msg = $(".better .invalid .msg");
	const $payout = $(".better .payout");
	const $multiple = $(".better .multiple");
	const $odds = $(".better .odds");

	// link the ranges to texts, and vice versa
	$(".better .input").focus(function(){
		$(this).select();
	});
	$wagerText.on("input", function(){
		const n = Number($(this).val());
		if (Number.isNaN(n)) return;
		$wagerRange.val(n*100);
		refreshPayout();
	});
	$wagerRange.on("input", function(){
		const n = Number($(this).val());
		if (Number.isNaN(n)) return;
		$wagerText.val(n/100);
		refreshPayout();
	});
	$numberText.on("input", function(){
		const n = Number($(this).val());
		if (Number.isNaN(n)) return;
		$numberRange.val(n);
		refreshPayout();
	});
	$numberRange.on("input", function(){
		const n = Number($(this).val());
		if (Number.isNaN(n)) return;
		$numberText.val(n);
		refreshPayout();
	});

	var _minBet;
	var _maxBet;
	var _minNumber;
	var _maxNumber;
	var _bankroll;
	function refreshBetUiSettings() {
		$loader.show();
		Promise.all([
			dice.minBet(),
			dice.maxBet(),
			dice.minNumber(),
			dice.maxNumber(),
			dice.bankroll()
		]).then(arr=>{
			_minBet = arr[0];
			_maxBet = arr[1];
			_minNumber = arr[2];
			_maxNumber = arr[3];
			_bankroll = arr[4];
			$wagerText
				.attr("min", _minBet.div(1e18).toNumber())
				.attr("max", _maxBet.div(1e18).toNumber());
			$wagerRange
				.attr("min", _minBet.div(1e16).toNumber())
				.attr("max", _maxBet.div(1e16).toNumber());
			$numberText
				.attr("min", _minNumber.toNumber())
				.attr("max", _maxNumber.toNumber());
			$numberRange
				.attr("min", _minNumber.toNumber())
				.attr("max", _maxNumber.toNumber());

			$loader.hide();
			refreshPayout();
		});
		// refresh every 10 minutes in case min/max has changed
		setTimeout(refreshBetUiSettings, 300000);
	}
	refreshBetUiSettings();

	function refreshPayout() {
		if (_minBet == null) { return; }
		$valid.hide();
		$invalid.hide();

		var bet = $wagerText.val();
		var number = $numberText.val();
		try { bet = (new BigNumber(bet)).mul(1e18) }
		catch (e) { bet = null; }
		try { number = new BigNumber(number); }
		catch (e) { number = null; }

		if (bet == null) {
			$invalid.show();
			$msg.text("Wager must be a number");
			return;
		}

		const betStr = ethUtil.toEthStr(bet);
		const minBetStr = ethUtil.toEthStr(_minBet);
		const maxBetStr = ethUtil.toEthStr(_maxBet);
		if (bet.lt(_minBet)) {
			$invalid.show();
			$msg.text(`Wager of ${betStr} is below the minimum of ${minBetStr}`);
			return;
		}
		if (bet.gt(_maxBet)) {
			$invalid.show();
			$msg.text(`Wager of ${betStr} is above the maximum of ${maxBetStr}`);
			return;	
		}

		if (number == null) {
			$invalid.show();
			$msg.text("Roll Number must be a number.")
			return;
		}
		if (number.lt(_minNumber)) {
			$invalid.show();
			$msg.text(`Roll Number of ${number} is below the minimum of ${minNumber}`);
			return;
		}
		if (number.gt(_maxNumber)) {
			$invalid.show();
			$msg.text(`Roll Number of ${number} is above the maximum of ${maxNumber}`);
			return;	
		}
		
		const payout = computePayout(bet, number);
		if (payout.gt(_bankroll)) {
			$invalid.show();
			$msg.empty().append(
				`Currently the maximum payout allowed is ${ethUtil.toEthStr(_bankroll)}.
				<br><br>
				Try lowering your bet or increasing your odds.`
			);
			return;
		}
		const multiple = payout.div(bet).toFixed(2);
		$valid.show();
		$payout.text(ethUtil.toEthStr(payout));
		$multiple.text(`${multiple}x return`);
		$odds.text(`${number}% win odds`);
	}
	refreshPayout();

	function computeResult(blockHash, id) {
        const hash = web3.sha3(blockHash + ethUtil.toBytesStr(id, 4), {encoding: "hex"});
        const bn = new BigNumber(hash);
        return bn.mod(100).plus(1);
    }
    function computePayout(bet, number) {
		return bet.mul(100).div(number).mul(.99)
    }

	$("#RollButton").click(function(){
		var bet = $wagerText.val();
		var number = $numberText.val();
		try { bet = (new BigNumber(bet)).mul(1e18) }
		catch (e) { bet = null; }
		try { number = new BigNumber(number); }
		catch (e) { number = null; }

		if (bet == null || number == null) {
			alert("Invalid bet or number.");
			return;
		}

		$(this).blur();
		trackResult(
			dice.roll({_number: number}, {value: bet, gas: 147000}),
			bet,
			number
		);
		doScrolling("#BetterCtnr", 400);
    })

	// When they place a bet, show it and add it to _$currentRolls
	var _$currentRolls = {};
	const _$currentRollsCtnr = $(".currentRolls .rolls");
	const _$emptyCurrentRolls = $(".currentRolls .empty");
	const _$clearCurrentRolls = $(".currentRolls .clear").click(function(){
		_$currentRolls = {};
		_$emptyCurrentRolls.show();
		_$clearCurrentRolls.hide();
		_$currentRollsCtnr.empty();
	});
	function trackResult(p, bet, number) {
		_$emptyCurrentRolls.hide();
		_$clearCurrentRolls.show();

		var roll = {
			state: "prepending",
			id: null,
			bet: bet,
			number: number,
		};
		var $e = $getRoll(roll).prependTo(_$currentRollsCtnr);

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


	/******************************************************/
	/*** COLLATING ROLLS FROM EVENTS **********************/
	/******************************************************/
	function getRollFromWageredOrRefunded(event, curId){
		const roll = {}
		roll.id = event.name=="RollWagered" ? event.args.id : null;
		roll.txId = event.transactionHash;
		roll.state = event.name=="RollRefunded"
			? "refunded"
			: roll.id.gt(curId)
				? "syncing"
				: curId.equals(roll.id) ? "waiting" : "unresolved"
		roll.bet = event.args.bet;
		roll.number = event.args.number;
		roll.payout = computePayout(roll.bet, roll.number);
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

	// Collate the events into an object for each roll:
	// - state (prepending, pending, refunded, waiting, unresolved, resolved, paid, paymentfailed)
	// - id, bet, number, result, isWinner
	// - refundReason, failReason
	// - created (blockNumber, blockHash, txId, txIndex, time)
	// - resolved (blockNumber, txId, time)
	// - paid (blockNumber, txId, time)
	// - paymentfailure (blockNumber, txId, time)
	function refreshAllRolls(state) {
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
			refreshCurrentRolls(allRolls, state.latestBlock.number);
			refreshRecentRolls(allRolls, state.latestBlock.number);
		});
    }

    // for any roll that is in _$currentRolls, refresh it.
    function refreshCurrentRolls(rolls, curBlockNum) {
    	rolls.forEach((roll)=>{
    		if (_$currentRolls[roll.id]) {
    			const $new = $getRoll(roll, curBlockNum);
    			_$currentRolls[roll.id].replaceWith($new);
    			_$currentRolls[roll.id] = $new;
    		}
    	})
    }

    const _$recentRollsCtnr = $(".recentRolls .rolls");
    const _$lockedRolls = {};
    function refreshRecentRolls(rolls, curBlockNum) {
    	Object.values(_$lockedRolls).forEach($e=>$e.detach());
    	_$recentRollsCtnr.empty();
    	rolls.forEach((roll)=>{
    		const $roll = _$lockedRolls[roll.txId]
    			? _$lockedRolls[roll.txId]
    			: $getRoll(roll, curBlockNum);
    		$roll.appendTo(_$recentRollsCtnr);
    	});
    }


	/******************************************************/
	/*** DISPLAY A ROLL  **********************************/
	/******************************************************/
	const avgBlockTime = ethUtil.getAverageBlockTime();
	const _msgs = [
    	"Don't give up so easily...",
    	"Don't give up so easily...",
    	"Don't give up so easily...",
    	"Don't give up so easily...",
    	"Don't give up so easily...",
    	"Better luck next time",
    	"Better luck next time",
    	"Better luck next time",
    	"Better luck next time",
    	"Better luck next time",
    	"You can shake it off",
    	"Stay strong",
    	"Believe in yourself",
    	"Follow your dreams",
    	"You'll win next time... maybe.",
    	"You're just a tiny bit unlucky",
    	"Let's pretend like this never happened.",
    	"By tomorrow, you'll forget all about this.",
    	"You miss 100% of the shots you don't take",
    	"Why not try again?",
    	"At least you still have your health.",
    	"Some things just weren't meant to be.",
    	"It's not the end of the world",
    	"Just do it!!!",
    	"Are you gonna do something about it?",
    	"It's not such a big deal.",
    ];
    function getLoseMsg(num) {
    	return _msgs[num % _msgs.length];
    }

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
    	$e.addClass(roll.state);
    	
    	const bet = roll.bet;
    	const number = roll.number;
    	const txId = roll.txId;
    	const multiple = roll.payout.div(bet).toFixed(2);
    	const payoutStr = ethUtil.toEthStr(roll.payout);
    	$e.find(".betValue").text(ethUtil.toEthStr(bet));
    	$e.find(".numberValue").text(`${number} or lower`);
    	$e.find(".payoutValue").text(`${payoutStr} (${multiple}x)`);
    	if (roll.state == "prepending") {
    		$prepending.show();
    		return $e;
    	}
    	if (roll.state == "pending") {
    		$pending.show();
    		$e.find(".pendingTxLink")
    			.append(util.$getTxLink("See it on Etherscan", roll.txId));
    		return $e;
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
    		$refund.show();
    		$refund.find(".reason").text(msg);
    		return $e;
    	}
    	if (roll.state == "failed") {
    		$failed.show();
    		$failed.find(".reason").text(roll.failReason);
    		return $e;
    	}

		$status.hide();
		$result.show();
		const $won = $result.find(".won").hide();
		const $lost = $result.find(".lost").hide();
		const $rollnumber = $result.find(".rollnumber");
		const $button = $result.find(".claim");
		const $claimStatus = $result.find(".claimStatus");
		
		const result = computeResult(roll.created.blockHash, roll.id);
		const didWin = !result.gt(number);
		$rollnumber.text(result);
		if (didWin) {
			$won.show();
			$button.click(()=>{
				var claimTxId;
				// lock this roll so it doesn't get updated.
				_$lockedRolls[roll.txId] = $e;
				$e.addClass("claiming");
				const p = dice.payoutRoll([roll.id], {gas: 55000});
				// disable button, show stuff.
				$button.attr("disabled","disabled");
				$claimStatus.show();
				$claimStatus.text("Waiting for txId...");
				// update text
				p.getTxHash.then(function(txId){
					claimTxId = txId;
					$claimStatus.empty()
						.append(util.$getTxLink("Your claim is being mined.", txId))
				});
				// on success unlock, on failure, let them retry.
				p.then(function(){
					delete _$lockedRolls[roll.txId];
					$claimStatus.text("Transaction complete. Please wait a moment.");
				}, function(e){
					$e.removeClass("claiming");
					$button.removeAttr("disabled");
					$claimStatus.empty()
						.append(`There was an error claiming: `)
						.append(util.$getTxLink(e.message, claimTxId))
						.append("<br>You should retry with more gas, or contact support");
				});
			})
		} else {
			$lost.show();
		}

		const $waiting = $result.find(".waiting").hide();
		const $syncing = $result.find(".syncing").hide();
		const $unresolved = $result.find(".unresolved").hide();
		const $paid = $result.find(".paid").hide();
		const $paymentFailure = $result.find(".paymentFailure").hide();
		const $lostMsg = $result.find(".lostMsg").hide();
		if (didWin){
			if (roll.state == "waiting") {
				$waiting.show();
			} else if (roll.state == "syncing") {
				$syncing.show();
			} else if (roll.state == "unresolved") {
				$unresolved.show();
			} else if (roll.state == "paid") {
				$paid.empty()
					.append(util.$getTxLink(`✓ Your winnings of ${payoutStr} have been paid.`, roll.paid.txId))
					.show();
			} else if (roll.state == "paymentfailure") {
				$paymentFailure.show();
			}
		} else {
			const rand = (new BigNumber(roll.created.txId)).mod(1000).toNumber();
			$lostMsg.show().text(getLoseMsg(rand));
		}
		avgBlockTime.then((blocktime)=>{
			const blocksLeft = 255 - (curBlockNum - roll.created.blockNumber);
			const timeLeft = util.toTime(blocktime.mul(blocksLeft))
			$result.find(".blocksLeft").text(`${blocksLeft} blocks (~${timeLeft})`);
		});
    	return $e;
    }

	/******************************************************/
	/*** LIVE STATS ***************************************/
	/******************************************************/
	// t: 0 to 1, returns 0 to 1
    function easeInOut(t) {
    	return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1
    }
    function easeNumber(from, to, duration, cb) {
    	var cancel = false;
    	const diff = to - from;
    	const steps = 50;
    	for (var i=1; i<=steps; i++){
    		let n = i/steps;
			setTimeout(function(){
				if (cancel) return;
    			cb(from + easeInOut(n) * diff);
    		}, duration * n);
		}
		return ()=>{ cancel = true; }
    }

    const _prevEases = []
    function refreshStats() {
    	const $rolls = $("#Summary .rolls .value");
    	const $wagered = $("#Summary .wagered .value");
    	const $won = $("#Summary .won .value");
    	Promise.all([
    		dice.curId(),
    		dice.totalWagered(),
    		dice.totalWon()
    	]).then(arr=>{
    		const curRolls = Number($rolls.text());
    		const curWagered = Number($wagered.text());
    		const curWon = Number($won.text());
    		const newRolls = arr[0].toNumber();
    		const newWagered = arr[1].div(1e18).toNumber();
    		const newWon = arr[2].div(1e18).toNumber();
    		_prevEases.forEach(e => { if (e) e(); });
    		_prevEases[0] = easeNumber(curRolls, newRolls, 3000, (n)=>{
    			$rolls.text(Math.round(n));
    		})
    		_prevEases[1] = easeNumber(curWagered, newWagered, 3000, (n)=>{
    			$wagered.text(n.toFixed(2));
    		});
    		_prevEases[2] = easeNumber(curWon, newWon, 3000, (n)=>{
    			$won.text(n.toFixed(2));
    		})
    	});
    }
    refreshStats();

});