Loader.promise.then(function(){
	var reg, comp, tr, mc, pac;

	function bindToElement(promise, element, asText) {
		if (asText === undefined) toText = true;

		element.empty().text("loading...");
		promise.then(function(res){
			asText
				? element.empty().text(res)
				: element.empty().append(res);
		},function(e){
			element.empty().text(`Error: ${e.message}`);
		});
	}

	function $getLogs(instance) {
		return niceWeb3.getAllEvents(instance).then((events)=>{
			const $ctnr = $("<div class='logs'></div>");
			events.forEach((e)=>{
				const argsStr = Object.keys(e.argStrs)
					.map((name)=>`${name}: ${e.argStrs[name]}`)
					.join(", ");
				$("<div></div>")
					.text(`${e.name} - ${argsStr}`)
					.appendTo($ctnr);
			})
			return $ctnr;
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
		mc = null;
		pac = null;
		addLog("Loading all addresses.");
		Promise.resolve()
			// Comptroller
			.then(()=>reg.addressOf({_name: "COMPTROLLER"}))
			.then((addr)=>{
				addLog(`Found comptroller at ${addr}`);
				comp = Comptroller.at(addr);
			}, (e)=>{ addLog(`Didn't find comptroller.`); })
			// Treasury
			.then(()=>reg.addressOf({_name: "TREASURY"}))
			.then((addr)=>{
				addLog(`Found treasury at ${addr}`);
				tr = Treasury.at(addr);
			}, (e)=>{ addLog(`Didn't find treasury.`); })
			// Main controller
			.then(()=>reg.addressOf({_name: "MAIN_CONTROLLER"}))
			.then((addr)=>{
				addLog(`Found main controller at ${addr}`);
				mc = MainController.at(addr);
			}, (e)=>{ addLog(`Didn't find main controller.`); })
			// pac
			.then(()=>reg.addressOf({_name: "PENNY_AUCTION_CONTROLLER"}))
			.then((addr)=>{
				addLog(`Found pac at ${addr}`);
				pac = PennyAuctionController.at(addr);
			}, (e)=>{ addLog(`Didn't find pac.`); })
		.then(function(){
			addLog("All loading complete. Refreshing everything now.");
			refreshAll();
		})
	});

	function refreshAll() {
		refreshOwner();
		refreshAdmin();
		refreshComp();
		refreshTr();
		refreshPac();
		refreshMc();
	}

	function refreshOwner() {
		if (!reg) return;
		bindToElement(reg.addressOf({_name: "OWNER"}), $("#OwnerAddr"));
	}
	function refreshAdmin() {
		if (!reg) return;
		bindToElement(reg.addressOf({_name: "ADMIN"}), $("#AdminAddr"));
	}

	function refreshComp() {
		if (!comp) return;
		$("#CompAddr").empty().text(comp.address);
		Promise.all([
			comp.token(),
			comp.locker()
		]).then(arr=>{
			const tokenAddr = arr[0];
			const lockerAddr = arr[1];
			$("#CompTokenAddr").empty().text(tokenAddr);
			$("#CompLockerAddr").empty().text(lockerAddr);
			const token = DividendToken.at(tokenAddr);
			bindToElement(token.totalSupply(), $("#CompTokenTotalSupply"));
			bindToElement(token.balanceOf([lockerAddr]).then(ethUtil.toEth), $("#CompLockerBalance"));
			bindToElement($getLogs(comp), $("#CompLogs"));
		});
	}

	function refreshTr() {
		if (!tr) return;
		$("#TrAddr").empty().text(tr.address);
		bindToElement(ethUtil.getBalance(tr).then(ethUtil.toEth), $("#TrBalance"));
		bindToElement(tr.bankroll().then(ethUtil.toEth), $("#TrBankroll"));
		bindToElement(tr.dailyFundLimit().then(ethUtil.toEth), $("#TrDailyLimit"));
		bindToElement($getLogs(tr), $("#TrLogs"));
	}

	function refreshMc() {
		if (!mc) return;
		const toPct = (val)=>val.pow(-1).mul(100);
		$("#McAddr").empty().text(mc.address);
		bindToElement(mc.version(), $("#McVersion"));
		bindToElement(mc.paStartReward().then(ethUtil.toEth), $("#McPaStartReward"));
		bindToElement(mc.paEndReward().then(ethUtil.toEth), $("#McPaEndReward"));
		bindToElement(mc.paFeeCollectRewardDenom().then(toPct), $("#McPaFeeCollectReward"));
		bindToElement($getLogs(mc), $("#McLogs"), false);
	}

	function refreshPac() {
		if (!pac) return;

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

		$("#PacAddr").empty().text(pac.address);
		bindToElement(pac.version(), $("#PacVersion"));
		bindToElement(getNumActiveAuctions(), $("#PacNumActiveAuctions"));
		bindToElement(pac.numEndedAuctions(), $("#PacNumEndedAuctions"));
		bindToElement(pac.totalPrizes().then(ethUtil.toEth), $("#PacTotalPrizes"));
		bindToElement(pac.totalFees().then(ethUtil.toEth), $("#PacTotalFees"));
		bindToElement($getLogs(pac), $("#PacLogs"));
	}
});