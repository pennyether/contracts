Loader.require("reg", "comp", "tr", "mc", "pac")
.then(function(reg, comp, tr, mc, pac){
	var reg, comp, tr, mc, pac;

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

	function $getLogs(instance) {
		return niceWeb3.getAllEvents(instance).then((events)=>{
			const $ctnr = $("<div class='logs'></div>");
			events.reverse().forEach((e)=>{
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

	$("#Load").click(refreshAll);

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
			bindToElement(comp.isStarted(), $("#CompSaleStarted"));
			bindToElement(token.totalSupply().then(ethUtil.toTokenStr), $("#CompTokenTotalSupply"));
			bindToElement(token.balanceOf([lockerAddr]).then(ethUtil.toTokenStr), $("#CompLockerBalance"));
			bindToElement($getLogs(comp), $("#CompLogs"), true);
		});
	}

	function refreshTr() {
		if (!tr) return;
		$("#TrAddr").empty().text(tr.address);
		bindToElement(tr.comptroller(), $("#TrComp"));
		bindToElement(tr.token(), $("#TrToken"));
		bindToElement(ethUtil.getBalance(tr).then(ethUtil.toEthStr), $("#TrBalance"));
		bindToElement(tr.bankroll().then(ethUtil.toEthStr), $("#TrBankroll"));
		bindToElement(tr.dailyFundLimit().then(ethUtil.toEthStr), $("#TrDailyLimit"));
		bindToElement(tr.getMinBalanceToDistribute().then(ethUtil.toEthStr), $("#TrDivThreshold"))
		bindToElement($getLogs(tr), $("#TrLogs"), true);
	}

	function refreshMc() {
		if (!mc) return;
		const toPct = (val)=>val.pow(-1).mul(100);
		$("#McAddr").empty().text(mc.address);
		bindToElement(mc.version(), $("#McVersion"));
		bindToElement(mc.paStartReward().then(ethUtil.toEthStr), $("#McPaStartReward"));
		bindToElement(mc.paEndReward().then(ethUtil.toEthStr), $("#McPaEndReward"));
		bindToElement(mc.paFeeCollectRewardDenom().then(toPct), $("#McPaFeeCollectReward"));
		bindToElement($getLogs(mc), $("#McLogs"), true);
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
		bindToElement(pac.totalPrizes().then(ethUtil.toEthStr), $("#PacTotalPrizes"));
		bindToElement(pac.totalFees().then(ethUtil.toEthStr), $("#PacTotalFees"));
		bindToElement($getLogs(pac), $("#PacLogs"), true);
	}
});