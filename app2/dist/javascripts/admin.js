Loader.promise.then(function(){
	var isLoaded;
	var tr;
	var mc;
	var pac;

	function bindToInput(promise, element) {
		element.empty().text("loading...");
		promise.then(function(res){
			element.val(res);
		},function(e){
			element.val(`Error: ${e.message}`);
		});
	}
	function bindToElement(promise, element) {
		element.empty().text("loading...");
		promise.then(function(res){
			element.empty().text(res);
		},function(e){
			element.empty().text(`Error: ${e.message}`);
		});
	}

	$("#Populate").click(function(){
		const $log = $("#PopulateLog").empty();
		const addLog = (msg) => $log.append($("<div>").text(msg));

		const regAddress = $("#PopulateRegAddress").val();
		if (!regAddress) return alert("Must set a registry address");
		const reg = Registry.at(regAddress);
		Promise.resolve()
			// Treasury
			.then(()=>reg.addressOf({_name: "TREASURY"}))
			.then((addr)=>{
				addLog(`Found treasury at ${addr}`);
				tr = Treasury.at(addr);
			}, (e)=>{ addLog(`Didn't find treasury!`); })
			// Main controller
			.then(()=>reg.addressOf({_name: "MAIN_CONTROLLER"}))
			.then((addr)=>{
				addLog(`Found main controller at ${addr}`);
				mc = MainController.at(addr);
			}, (e)=>{ addLog(`Didn't find main controller!`); })
			// pac
			.then(()=>reg.addressOf({_name: "PENNY_AUCTION_CONTROLLER"}))
			.then((addr)=>{
				addLog(`Found pac at ${addr}`);
				pac = PennyAuctionController.at(addr);
			}, (e)=>{ addLog(`Didn't find pac!`); })
			.then(()=>{
				isLoaded = (!!tr && !!mc && !!pac);
				addLog(`isLoaded: ${isLoaded}`);
				if (isLoaded) {
					updateTr();
					updateMc();
					updatePac();
				}
			});
	});

	function updateTr() {
		if (!tr) return alert("tr not loaded.");
		$("#TrToday").text( ((+new Date())/(1000*60*60*24)).toFixed(2) );
		bindToElement(tr.getAdmin(), $("#TrAdmin"));
		bindToElement(tr.dayDailyFundLimitChanged(), $("#TrDailyFundLimitLastChanged"));
		bindToInput(tr.dailyFundLimit().then(ethUtil.toEth), $("#TrDailyFundLimit"));
	}

	$("#TrChangeDailyFundLimit").click(function(){
		if (!tr) return alert("tr not loaded.");
		const newLimit = ethUtil.toWei($("#TrDailyFundLimit").val());
		tr.setDailyFundLimit({_newValue: newLimit})
			.then(function(){
				alert("Value updated.");
				updateTr();
			}).catch(function(){
				alert("Unsuccessful - are you the admin?");
			});
	});


	function updateMc() {
		if (!mc) return alert("mc not loaded.");
		bindToElement(mc.getAdmin(), $("#McAdmin"));
		bindToInput(mc.paStartReward().then(ethUtil.toEth), $("#McPaStartReward"));
		bindToInput(mc.paEndReward().then(ethUtil.toEth), $("#McPaEndReward"));
		bindToInput(mc.paFeeCollectRewardDenom(), $("#McPaRewardDenom"));
	}
	$("#McChangePaRewards").click(function(){
		if (!mc) return alert("mc not loaded.");
		const paStartReward = ethUtil.toWei($("#McPaStartReward").val());
		const paEndReward = ethUtil.toWei($("#McPaEndReward").val());
		const paRewardDenom = $("#McPaRewardDenom").val();
		mc.setPennyAuctionRewards({
			_paStartReward: paStartReward,
			_paEndReward: paEndReward,
			_paFeeCollectRewardDenom: paRewardDenom
		}).then(function(){
			alert("Values updated.");
			updateMc();
		}).catch(function(){
			alert("Unsuccessful - are you the admin?");
		});
	})


	function updatePac() {
		if (!pac) return alert("pac not loaded.");
		bindToElement(pac.getAdmin(), $("#PacAdmin"));
		pac.numDefinedAuctions().then(function(num){
			$("#PacNumDefinedAuctions").text(num);

			const $ctnr = $("#PacDefinedAuctions").empty();
			const $template = $(".pacDefinedAuctionTemplate");
			for (var i=0; i<=num; i++){
				let index = i;
				const $defined = $template
					.clone()
					.removeClass("pacDefinedAuctionTemplate")
					.addClass("pacDefinedAuction")
					.appendTo($ctnr)
					.show();

				$defined.find(".index").text(index);
				pac.definedAuctions({"": index}).then((res)=>{
					$defined.find(".values").show();
					$defined.find(".auction").text(res[0]);
					$defined.find(".enabled").text(res[1] ? "ENABLED" : "DISABLED");
					$defined.find(".summary").val(res[2]);
					$defined.find(".initialPrize").val(ethUtil.toEth(res[3]));
					$defined.find(".bidPrice").val(ethUtil.toEth(res[4]));
					$defined.find(".bidFeePct").val(res[5])
					$defined.find(".bidAddBlocks").val(res[6]);
					$defined.find(".initialBlocks").val(res[7]);
					$defined.find(".change").click(function(){
						editDefinedAuction(index);
					})
					$defined.find(".enable").click(function(){
						enableDefinedAuction(index);
					});
					$defined.find(".disable").click(function(){
						disableDefinedAuction(index);
					});
				});
			};
		});
	}
	function editDefinedAuction(index){
		if (!pac) return alert("Pac not loaded.");

		const $e = $("#PacDefinedAuctions").find(".pacDefinedAuction").eq(index);
		if ($e.find(".index").text()!=index)
			throw new Error("Got the wrong one!");
		var obj = {
			_index: index,
			_summary: $e.find(".summary").val(),
			_initialPrize: ethUtil.toWei($e.find(".initialPrize").val()),
			_bidPrice: ethUtil.toWei($e.find(".bidPrice").val()),
			_bidFeePct: $e.find(".bidFeePct").val(),
			_bidAddBlocks: $e.find(".bidAddBlocks").val(),
			_initialBlocks: $e.find(".initialBlocks").val()
		};
		pac.editDefinedAuction(obj).then(function(){
			alert(`Defined auction ${index} updated!`);
			updatePac();
		}).catch(e=>{
			alert(`Failed to edit auction ${index}!`);
		});
	}
	function enableDefinedAuction(index){
		if (!pac) return alert("Pac not loaded");
		pac.enableDefinedAuction({_index: index}).then(()=>{
			alert(`Defined auction ${index} is now enabled.`);
			updatePac();
		}).catch(e=>{
			alert(`Failed to enable auction ${index}.`);
		})
	}
	function disableDefinedAuction(index){
		if (!pac) return alert("Pac not loaded");
		debugger;
		pac.disableDefinedAuction({_index: index}).then(()=>{
			alert(`Defined auction ${index} is now enabled.`);
			updatePac();
		}).catch(e=>{
			alert(`Failed to enable auction ${index}.`);
		})
	}
});