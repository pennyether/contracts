Loader.require("reg", "comp", "tr", "mc", "pac")
.then(function(reg, comp, tr, mc, pac){
	var reg, comp, tr, mc, pac;

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
		util.bindToElement(reg.addressOf({_name: "OWNER"}), $("#OwnerAddr"));
	}
	function refreshAdmin() {
		if (!reg) return;
		util.bindToElement(reg.addressOf({_name: "ADMIN"}), $("#AdminAddr"));
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
			util.bindToElement(comp.isSaleStarted(), $("#CompSaleStarted"));
			util.bindToElement(token.totalSupply().then(ethUtil.toTokenStr), $("#CompTokenTotalSupply"));
			util.bindToElement(token.balanceOf([lockerAddr]).then(ethUtil.toTokenStr), $("#CompLockerBalance"));
			util.bindToElement(util.$getLogs(comp), $("#CompLogs"), true);
		});
	}

	function refreshTr() {
		if (!tr) return;
		$("#TrAddr").empty().text(tr.address);
		util.bindToElement(tr.comptroller(), $("#TrComp"));
		util.bindToElement(tr.token(), $("#TrToken"));
		util.bindToElement(ethUtil.getBalance(tr).then(ethUtil.toEthStr), $("#TrBalance"));
		util.bindToElement(tr.bankroll().then(ethUtil.toEthStr), $("#TrBankroll"));
		util.bindToElement(tr.dailyFundLimit().then(ethUtil.toEthStr), $("#TrDailyLimit"));
		util.bindToElement(tr.getMinBalanceToDistribute().then(ethUtil.toEthStr), $("#TrDivThreshold"))
		util.bindToElement(util.$getLogs(tr), $("#TrLogs"), true);
	}

	function refreshMc() {
		if (!mc) return;
		const toPct = (val)=>val.pow(-1).mul(100);
		$("#McAddr").empty().text(mc.address);
		util.bindToElement(mc.version(), $("#McVersion"));
		util.bindToElement(mc.paStartReward().then(ethUtil.toEthStr), $("#McPaStartReward"));
		util.bindToElement(mc.paEndReward().then(ethUtil.toEthStr), $("#McPaEndReward"));
		util.bindToElement(mc.paFeeCollectRewardDenom().then(toPct), $("#McPaFeeCollectReward"));
		util.bindToElement(util.$getLogs(mc), $("#McLogs"), true);
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
		util.bindToElement(pac.version(), $("#PacVersion"));
		util.bindToElement(getNumActiveAuctions(), $("#PacNumActiveAuctions"));
		util.bindToElement(pac.numEndedAuctions(), $("#PacNumEndedAuctions"));
		util.bindToElement(pac.totalPrizes().then(ethUtil.toEthStr), $("#PacTotalPrizes"));
		util.bindToElement(pac.totalFees().then(ethUtil.toEthStr), $("#PacTotalFees"));
		util.bindToElement(pac.totalBids(), $("#PacTotalBids"));
		util.bindToElement(util.$getLogs(pac), $("#PacLogs"), true);
	}
});