Loader.promise.then(function(){
	function bindToElement(promise, element) {
		element.empty().text("loading...");
		promise.then(function(res){
			element.empty().text(res);
		},function(e){
			element.empty().text(`Error: ${e.message}`);
		});
	}

	$("#PopulateAll").click(function(){
		const $log = $("#PopulateLog").empty();
		const addLog = (msg) => $log.append($("<div>").text(msg));

		const regAddress = $("#PopulateAllRegAddress").val();
		if (!regAddress) return alert("Must provide a registry address.");
		const reg = Registry.at(regAddress);
		$("#RegLoadAddress").val(regAddress)
		$("#RegLoad").click();
		Promise.resolve()
			// comptroller
			.then(()=>reg.addressOf({_name: "COMPTROLLER"}))
			.then((addr)=>{
				addLog(`Found comptroller at ${addr}`);
				$("#CompLoadAddress").val(addr);
				$("#CompLoad").click();
			}, (e)=>{ addLog(`Didn't find comptroller.`); })
			// Treasury
			.then(()=>reg.addressOf({_name: "TREASURY"}))
			.then((addr)=>{
				addLog(`Found treasury at ${addr}`);
				$("#TrLoadAddress").val(addr);
				$("#TrLoad").click();
			}, (e)=>{ addLog(`Didn't find treasury.`); })
			// Main controller
			.then(()=>reg.addressOf({_name: "MAIN_CONTROLLER"}))
			.then((addr)=>{
				addLog(`Found main controller at ${addr}`);
				$("#McLoadAddress").val(addr);
				$("#McLoad").click();
			}, (e)=>{ addLog(`Didn't find main controller.`); })
			// pac
			.then(()=>reg.addressOf({_name: "PENNY_AUCTION_CONTROLLER"}))
			.then((addr)=>{
				addLog(`Found pac at ${addr}`);
				$("#PacLoadAddress").val(addr);
				$("#PacLoad").click();
			}, (e)=>{ addLog(`Didn't find pac.`); })
			// paf
			.then(()=>reg.addressOf({_name: "PENNY_AUCTION_FACTORY"}))
			.then((addr)=>{
				addLog(`Found paf at ${addr}`);
				$("#PafLoadAddress").val(addr);
				$("#PafLoad").click();
			}, (e)=>{ addLog(`Didn't find paf.`); });
	});

	$("#FullDeploy").click(function(){
		const $log = $("#FullDeployLog").empty();
		const addLog = (msg) => $log.append($("<div>").text(msg));
		const adminAddr = $("#FullDeployAdminAddress").val();
		var reg, tr, comp;
		Registry.new().then(function(result){
			addLog(`Registry created @ ${result.instance.address}`);
			addLog(`Creating other instances...`);
			reg = result.instance;
			return Promise.all([
				reg.register({_name: "ADMIN", _addr: adminAddr}),
				reg,
				Treasury.new({_registry: reg.address}),
				MainController.new({_registry: reg.address}),
				PennyAuctionController.new({_registry: reg.address}),
				PennyAuctionFactory.new({_registry: reg.address}),
				Comptroller.new()
			]);
		}).then((deployed)=>{
			addLog("Registering addresses...");
			tr = deployed[2].instance;
			comp = deployed[6].instance;
			return Promise.all([
				reg.register({
					_name: "TREASURY",
					_addr: tr.address
				}),
				reg.register({
					_name: "MAIN_CONTROLLER", 
					_addr: deployed[3].instance.address
				}),
				reg.register({
					_name: "PENNY_AUCTION_CONTROLLER",
					_addr: deployed[4].instance.address
				}),
				reg.register({
					_name: "PENNY_AUCTION_FACTORY",
					_addr: deployed[5].instance.address
				}),
				reg.register({
					_name: "COMPTROLLER",
					_addr: comp.address
				}),
			]);
		}).then((arr)=>{
			addLog("Initializing Treasury and Comptroller...");
			return Promise.all([
				comp.token().then((token)=>tr.initToken({_token: token})),
				tr.initComptroller({_comptroller: comp.address})
			]).then(()=>{
				return comp.initTreasury({_treasury: tr.address});
			});
		}).then((arr)=>{
			addLog("All done!");
			alert("All done!");
			$("#PopulateAllRegAddress").val(reg.address);
			$("#PopulateAll").click();
		})
	});

	/******** REGISTRY ***************************/
	$("#RegCreate").click(function(){
		Registry.new().then(function(result){
			const reg = result.instance;
			$("#RegLoadAddress").val(reg.address);
			$("#RegLoad").click();
		});
	});
	$("#RegLoad").click(function(){
		const address = $("#RegLoadAddress").val();
		const reg = Registry.at(address);
		$("#RegAddress").text(address);
		bindToElement(reg.addressOf({_name: "OWNER"}), $("#RegOwner"));
		bindToElement(reg.addressOf({_name: "ADMIN"}), $("#RegAdmin"));
		bindToElement(reg.addressOf({_name: "TREASURY"}), $("#RegTreasury"));
		bindToElement(reg.addressOf({_name: "MAIN_CONTROLLER"}), $("#RegMc"));
		bindToElement(reg.addressOf({_name: "PENNY_AUCTION_CONTROLLER"}), $("#RegPac"));
		bindToElement(reg.addressOf({_name: "PENNY_AUCTION_FACTORY"}), $("#RegPaf"));
	});
	$("#RegSetAdmin").click(function(){
		const regAddress = $("#RegLoadAddress").val();
		const adminAddress = $("#RegSetAdminAddress").val();
		if (!regAddress) return alert("No registry address set.");
		if (!adminAddress) return alert("Must set an admin address.");

		const reg = Registry.at(regAddress);
		reg.register({_name: "ADMIN", _addr: adminAddress})
			.then((res)=>{
				alert("Admin has been set.");
				$("#RegLoad").click();
			})
			.catch((err)=>{ 
				alert("Unable to set admin. Are you the owner?");
			});
	});
	/******** REGISTRY ***************************/

	/******** COMPTROLLER ************************/
	$("#CompCreate").click(function(){
		Comptroller.new().then(function(result){
			$("#CompLoadAddress").val(result.instance.address);
			$("#CompLoad").click();
		});
	});
	$("#CompLoad").click(function(){
		const address = $("#CompLoadAddress").val();
		const comp = Comptroller.at(address);
		$("#CompAddress").text(address);
		bindToElement(comp.owner(), $("#CompOwner"));
		bindToElement(comp.treasury(), $("#CompTreasury"));
		bindToElement(comp.token(), $("#CompToken"));
		bindToElement(comp.locker(), $("#CompLocker"));
	});
	$("#CompRegister").click(function(){
		const compAddress = $("#CompLoadAddress").val();
		const regAddress = $("#RegLoadAddress").val();
		if (!compAddress) return alert("No address set (use Load input)");
		if (!regAddress) return alert("No address set for registry.");
		Registry.at(regAddress)
		.register({_name: "COMPTROLLER", _addr: compAddress})
		.then(function(){
			alert("Comptroller has been registered.");
		}).catch(function(e){
			alert(`Failed to register: ${e.message}`);
		});
	});

	$("#CompInitTreasury").click(function(){
		const compAddress = $("#CompLoadAddress").val();
		const treasuryAddress = $("#CompInitTreasuryAddress").val();
		if (!compAddress) return aler("No Comptroller address set.");
		if (!treasuryAddress) return alert("No Treasury address set.");
		const comp = Comptroller.at(compAddress);
		comp.initTreasury({_treasury: treasuryAddress})
			.then(function(){
				alert("Treasury has been initialized.");
				$("#CompLoad").click();
			})
			.catch(function(){
				alert("Unable to init treasury. Are you the owner?");
			});
	});
	$("#CompInitSale").click(function(){
		const compAddress = $("#CompLoadAddress").val();
		if (!compAddress) return aler("No Comptroller address set.");
		const comp = Comptroller.at(compAddress);
		comp.initSale()
			.then(function(){
				alert("Sale has started!");
				$("#CompLoad").click();
			})
			.catch(function(){
				alert("Unable to initSale. Are you the owner?");
			});
	})
	/******** COMPTROLLER ************************/

	/******** TREASURY ***************************/
	$("#TrCreate").click(function(){
		const regAddress = $("#TrRegistryAddress").val();
		if (!regAddress) return alert("No address set");
		Treasury.new({_registry: regAddress}).then(function(result){
			$("#TrLoadAddress").val(result.instance.address);
			$("#TrLoad").click();
		});
	});
	$("#TrLoad").click(function(){
		const address = $("#TrLoadAddress").val();
		if (!address) return alert("No address set.");
		const tr = Treasury.at(address);
		$("#TrAddress").text(address);
		bindToElement(tr.getRegistry(), $("#TrRegistry"));
		bindToElement(tr.getOwner(), $("#TrOwner"));
		bindToElement(tr.getAdmin(), $("#TrAdmin"));
		bindToElement(tr.getMainController(), $("#TrMainController"));
		bindToElement(tr.comptroller(), $("#TrComptroller"));
		bindToElement(tr.token(), $("#TrToken"));
	});
	$("#TrRegister").click(function(){
		const trAddress = $("#TrLoadAddress").val();
		if (!trAddress) return alert("No address set (use Load input)");
		const tr = Treasury.at(trAddress);
		tr.getRegistry().then((regAddress)=>{
			const reg = Registry.at(regAddress);
			return reg.register({_name: "TREASURY", _addr: trAddress});
		}).then(function(){
			alert("Treasury has been registered.");
		}).catch(function(e){
			alert(`Failed to register: ${e.message}`);
		});
	});
	$("#TrInitComptroller").click(function(){
		const trAddress = $("#TrLoadAddress").val();
		const compAddress = $("#TrInitCompAddress").val();
		if (!trAddress) return alert("No Treasury address set.");
		if (!compAddress) return alert("No comp address set.");
		const tr = Treasury.at(trAddress);
		tr.initComptroller({_comptroller: compAddress})
			.then(function(){
				alert("initComptroller successful.");
				$("#TrLoad").click();
			})
			.catch(function(){
				alert("Unable to initComptroller. Are you the admin?");
			});
	});
	$("#TrInitToken").click(function(){
		const trAddress = $("#TrLoadAddress").val();
		const tokenAddress = $("#TrInitTokenAddress").val();
		if (!trAddress) return alert("No Treasury address set.");
		if (!tokenAddress) return alert("No token address set.");
		const tr = Treasury.at(trAddress);
		tr.initToken({_token: tokenAddress})
			.then(function(){
				alert("initToken successful.");
				$("#TrLoad").click();
			})
			.catch(function(){
				alert("Unable to initToken. Are you the admin?");
			});
	});
	/******** TREASURY ***************************/

	/******** MAIN CONTROLLER ********************/
	$("#McCreate").click(function(){
		const regAddress = $("#McRegistryAddress").val();
		if (!regAddress) return alert("No registry address set");
		MainController.new({_registry: regAddress}).then(function(result){
			$("#McLoadAddress").val(result.instance.address);
			$("#McLoad").click();
		});
	});
	$("#McLoad").click(function(){
		const address = $("#McLoadAddress").val();
		const mc = MainController.at(address);
		$("#McAddress").text(address);
		bindToElement(mc.version(), $("#McVersion"));
		bindToElement(mc.getTreasury(), $("#McTreasury"));
		bindToElement(mc.getAdmin(), $("#McAdmin"));
		bindToElement(mc.getPennyAuctionController(), $("#McPac"));
	});
	$("#McRegister").click(function(){
		const mcAddress = $("#McLoadAddress").val();
		if (!mcAddress) return alert("No address set (use Load input)");
		const mc = MainController.at(mcAddress);
		mc.getRegistry().then((regAddress)=>{
			const reg = Registry.at(regAddress);
			return reg.register({_name: "MAIN_CONTROLLER", _addr: mcAddress});
		}).then(function(){
			alert("Main Controller has been registered.");
		}).catch(function(e){
			alert(`Failed to register: ${e.message}`);
		});
	});
	/******** MAIN CONTROLLER ********************/

	/******** Penny Auction Controller ********************/
	$("#PacCreate").click(function(){
		const regAddress = $("#PacRegistryAddress").val();
		if (!regAddress) return alert("No registry address set");
		PennyAuctionController.new({_registry: regAddress}).then(function(result){
			$("#PacLoadAddress").val(result.instance.address);
			$("#PacLoad").click();
		});
	});
	$("#PacLoad").click(function(){
		const address = $("#PacLoadAddress").val();
		const pac = PennyAuctionController.at(address);
		$("#PacAddress").text(address);
		bindToElement(pac.version(), $("#PacVersion"));
		bindToElement(pac.getAdmin(), $("#PacAdmin"));
		bindToElement(pac.getPennyAuctionFactory(), $("#PacPaf"));
	});
	$("#PacRegister").click(function(){
		const pacAddress = $("#PacLoadAddress").val();
		if (!pacAddress) return alert("No address set (use Load input)");
		const pac = PennyAuctionController.at(pacAddress);
		pac.getRegistry().then((regAddress)=>{
			const reg = Registry.at(regAddress);
			return reg.register({_name: "PENNY_AUCTION_CONTROLLER", _addr: pacAddress});
		}).then(function(){
			alert("Penny Auction Controller has been registered.");
		}).catch(function(e){
			alert(`Failed to register: ${e.message}`);
		});
	});
	/******** Penny Auction Controller ********************/

	/******** Penny Auction Factory ********************/
	$("#PafCreate").click(function(){
		const regAddress = $("#PafRegistryAddress").val();
		if (!regAddress) return alert("No registry address set");
		PennyAuctionFactory.new({_registry: regAddress}).then(function(result){
			$("#PafLoadAddress").val(result.instance.address);
			$("#PafLoad").click();
		});
	});
	$("#PafLoad").click(function(){
		const address = $("#PafLoadAddress").val();
		const paf = PennyAuctionFactory.at(address);
		$("#PafAddress").text(address);
		bindToElement(paf.version(), $("#PafVersion"));
		bindToElement(paf.getTreasury(), $("#PafTreasury"));
		bindToElement(paf.getPennyAuctionController(), $("#PafPac"));
	});
	$("#PafRegister").click(function(){
		const pafAddress = $("#PafLoadAddress").val();
		if (!pafAddress) return alert("No address set (use Load input)");
		const paf = PennyAuctionFactory.at(pafAddress);
		paf.getRegistry().then((regAddress)=>{
			const reg = Registry.at(regAddress);
			return reg.register({_name: "PENNY_AUCTION_FACTORY", _addr: pafAddress});
		}).then(function(){
			alert("Penny Auction Factory has been registered.");
		}).catch(function(e){
			alert(`Failed to register: ${e.message}`);
		});
	});
	/******** Penny Auction Controller ********************/	


});