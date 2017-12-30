Loader.promise.then(function(reg){
	function init(){
		$("#PopulateAllRegAddress").val(reg.address);
		$("#PopulateAll").click();
		$("#TrRegistryAddress").val(reg.address);
		$("#McRegistryAddress").val(reg.address);
		$("#PacRegistryAddress").val(reg.address);
		$("#PafRegistryAddress").val(reg.address);
		$("#DiceRegistryAddress").val(reg.address);
	}

	ethUtil.onStateChanged(state=>{
		$("#Deploy .custodianAddr input").val(state.account);	
	});

	// Registers an address to <reg> from <wallet>
	function registerAddress(reg, wallet, name, addr) {
		if (!reg) throw new Error("No registry object.");
		const data = reg.register.getData({
			_name: name,
			_addr: addr
		});
		return wallet.doCall({
			_to: reg.address,
			_data: data
		}, {
			value: 0,
			gas: 200000
		}).then(()=>{
			return reg.addressOf([name]).then((_addr)=>{
				if (_addr.toLowerCase() != addr.toLowerCase()) 
					throw new Error(`${name} was not set to ${addr}. It is ${_addr}`);
			}, (e)=>{
				throw new Error(`${name} was never set.`);
			});
		});
	}

	/*
	Full deploy requires one input:
		- Cold owner address
		- Admin address

	By the end, it will have created:
		- Custodial Wallet:
			- Owner: defined at input
			- Custodian: current user
		- Registry
			- Owner (permanent): custodial wallet
		- Comptroller
			- Owner (permanent): current user
			- Treasury (permanent): Treasury
			- Owner can only call initSale().
		- TokenLocker:
			- Owner (permanent): CustodialWallet 
		- Treasury:
			- Comptroller (permanent): Comptroller
			- Token (permanent): Token
			- Registered.
		- MainController
			- Registered.
		- PennyAuctionController
			- Registered.
		- PennyAuctionFactory
			- Registered.
		- InstaDice
			- Registered.
	*/
	$("#DeployButton").click(function(){
		const $log = $("#DeployLog").empty();
		const addLog = (msg) => $log.append($("<div>").text(msg));
		
		const adminAddr = $("#Deploy .adminAddr input").val();
		const custodianAddr = $("#Deploy .custodianAddr input").val();
		const supervisorAddr = $("#Deploy .supervisorAddr input").val();
		const ownerAddr = $("#Deploy .ownerAddr input").val();
		if (!adminAddr) return alert("Must provide admin address.");
		if (!custodianAddr) return alert("Must provide custodian address.");
		if (!supervisorAddr) return alert("Must provide supervisor address.");
		if (!ownerAddr) return alert("Must provide owner address.");

		function initTrToken() {
			if (!tr || !comp) throw new Error("No treasury instance.");
			return comp.token().then((token)=>{
				const data = tr.initToken.getData({_token: token})
				return wallet.doCall({
					_to: tr.address,
					_data: data
				}, {
					value: 0,
					gas: 200000
				}).then(()=>{
					return tr.token().then((res)=>{
						if (res.toLowerCase() != token.toLowerCase())
							throw new Error(`token was set to ${res} instead of ${token}`);
						addLog(`tr.token was set to ${token}`);
					}, (e)=>{
						throw new Error(`tr.token was not set!`);
					});
				});
			});
		}

		function initTrComptroller() {
			if (!tr || !comp) throw new Error("No treasury instance.");
			const compAddr = comp.address;
			const data = tr.initComptroller.getData({_comptroller: compAddr});
			return wallet.doCall({
				_to: tr.address,
				_data: data
			},{
				value: 0,
				gas: 200000
			}).then(()=>{
				return tr.comptroller().then((res)=>{
					if (res.toLowerCase() != compAddr.toLowerCase())
						throw new Error(`tr.comptroller was set to ${res} instead of ${compAddr}`);
					addLog(`tr.comptroller set to ${compAddr}`);
				}, (e)=>{
					throw new Error(`tr.comptroller was not set!`);
				});
			})
		}

		function initCompTreasury() {
			if (!tr || !comp) throw new Error("No treasury instance.");
			const trAddr = tr.address;
			const data = comp.initTreasury.getData({_treasury: trAddr});
			return wallet.doCall({
				_to: comp.address,
				_data: data
			},{
				value: 0,
				gas: 300000
			}).then(()=>{
				return comp.treasury().then((res)=>{
					if (res.toLowerCase() != trAddr.toLowerCase())
						throw new Error(`comp.treasury was set to ${res} instead of ${trAddr}`);
					addLog(`comp.treasury set to ${trAddr}.`);
				}, (e)=>{
					throw new Error(`comp.treasury was not set!`);
				});
			});
		}

		function initCompTokenLocker() {
			if (!tr || !wallet) throw new Error("bleh");
			const walletAddr = wallet.address;
			const data = comp.initTokenLocker.getData({_tokenLockerOwner: walletAddr});
			return wallet.doCall({
				_to: comp.address,
				_data: data
			},{
				value: 0,
				gas: 300000
			}).then(()=>{
				return comp.locker().then((res)=>{
					if (res == ethUtil.NO_ADDRESS)
						throw new Error(`comp.locker was not set!`);
					addLog(`comp.locker set to ${res}.`);
				}, (e)=>{
					throw new Error(`comp.treasury was not set!`);
				});
			});	
		}

		var wallet, reg, tr, comp;
		addLog(`Creating custodial wallet...`);
		CustodialWallet.new({
			_custodian: custodianAddr,
			_supervisor: supervisorAddr,
			_owner: ownerAddr
		}).then((result)=>{
			wallet = result.instance;
			addLog(`Wallet created @ ${wallet.address}`);
			addLog(`Creating Registry...`);
			return Promise.all([
				wallet.owner(),
				wallet.supervisor(),
				wallet.custodian()
			]).then(arr=>{
				console.log("Wallet details:", {
					owner: arr[0],
					supervisor: arr[1],
					custodian: arr[2]
				});
				return Registry.new({_owner: wallet.address});
			});
		}).then((result)=>{
			reg = result.instance;
			addLog(`Registry created @ ${reg.address}`);
			addLog(`Registering ADMIN and WALLET...`);
			return Promise.all([
				registerAddress(reg, wallet, "ADMIN", adminAddr),
				registerAddress(reg, wallet, "WALLET", wallet.address)
			]);
		}).then(()=>{
			addLog(`Addresses registered.`);
			addLog(`Creating Comp, Tr, MC, PAC, and PAF.`);
			return Promise.all([
				Comptroller.new({_owner: wallet.address}),
				Treasury.new({_registry: reg.address}),
				MainController.new({_registry: reg.address}),
				PennyAuctionController.new({_registry: reg.address}),
				PennyAuctionFactory.new({_registry: reg.address}),
				InstaDice.new({_registry: reg.address})
			]);
		}).then((arr)=>{
			comp = arr[0].instance;
			tr = arr[1].instance;
			addLog(`Contracts created. Registering addresses...`);
			return Promise.all([
				registerAddress(reg, wallet, "COMPTROLLER", comp.address)
					.then(()=>{ addLog(`Comptroller Registered.`); }),
				registerAddress(reg, wallet, "TREASURY", tr.address)
					.then(()=>{ addLog(`Treasury Registered.`); }),
				registerAddress(reg, wallet, "MAIN_CONTROLLER", arr[2].instance.address)
					.then(()=>{ addLog(`MainController Registered.`); }),
				registerAddress(reg, wallet, "PENNY_AUCTION_CONTROLLER", arr[3].instance.address)
					.then(()=>{ addLog(`PAC Registered.`); }),
				registerAddress(reg, wallet, "PENNY_AUCTION_FACTORY", arr[4].instance.address)
					.then(()=>{ addLog(`PAF Registered.`); }),
				registerAddress(reg, wallet, "INSTADICE", arr[5].instance.address)
					.then(()=>{ addLog(`InstaDice Registered.`); })
			]);
		}).then(()=>{
			addLog(`Done registering. Doing tr.initToken(), and tr.initComptroller()`);
			return Promise.all([
				initTrToken(),
				initTrComptroller()
			])
		}).then(()=>{
			addLog(`Treasury set up. Now doing comp.initTreasury() and comp.initTokenLocker()`);
			return Promise.all([
				initCompTreasury(),
				initCompTokenLocker()
			]);
		}).then(()=>{
			alert("THANK THE LORD - IT'S ALL DONE")
			addLog(`All done!`);
			$("#PopulateAllRegAddress").val(reg.address);
			$("#PopulateAll").click();
		}).catch((e)=>{
			console.error("I caught this error from promise chain:", e);
			addLog(`SOMETHING FAILED.`);
			alert("Something died.");
		});
	});
	
	$("#PopulateAll").click(function(){
		const $log = $("#PopulateLog").empty();
		const addLog = (msg) => $log.append($("<div>").text(msg));

		const regAddress = $("#PopulateAllRegAddress").val();
		if (!regAddress) return alert("Must provide a registry address.");
		const reg = Registry.at(regAddress);
		$("#RegLoadAddress").val(regAddress)
		$("#RegLoad").click();
		Promise.resolve()
			// wallet
			.then(()=>reg.addressOf({_name: "WALLET"}))
			.then((addr)=>{
				$("#WalletLoadAddress").val(addr);
				$("#WalletLoad").click();
				addLog(`Found wallet at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find Wallet.`); })
			// comptroller
			.then(()=>reg.addressOf({_name: "COMPTROLLER"}))
			.then((addr)=>{
				$("#CompLoadAddress").val(addr);
				$("#CompLoad").click();
				addLog(`Found comptroller at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find comptroller.`); })
			// Treasury
			.then(()=>reg.addressOf({_name: "TREASURY"}))
			.then((addr)=>{
				$("#TrLoadAddress").val(addr);
				$("#TrLoad").click();
				addLog(`Found treasury at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find treasury.`); })
			// Main controller
			.then(()=>reg.addressOf({_name: "MAIN_CONTROLLER"}))
			.then((addr)=>{
				$("#McLoadAddress").val(addr);
				$("#McLoad").click();
				addLog(`Found main controller at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find main controller.`); })
			// pac
			.then(()=>reg.addressOf({_name: "PENNY_AUCTION_CONTROLLER"}))
			.then((addr)=>{
				$("#PacLoadAddress").val(addr);
				$("#PacLoad").click();
				addLog(`Found pac at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find pac.`); })
			// paf
			.then(()=>reg.addressOf({_name: "PENNY_AUCTION_FACTORY"}))
			.then((addr)=>{
				$("#PafLoadAddress").val(addr);
				$("#PafLoad").click();
				addLog(`Found paf at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find paf.`); })
			// dice
			.then(()=>reg.addressOf({_name: "INSTADICE"}))
			.then((addr)=>{
				$("#DiceLoadAddress").val(addr);
				$("#DiceLoad").click();
				addLog(`Found Dice at ${addr}`);
			})
			.catch((e)=>{ addLog(`Didn't find dice.`); })
	});


	/******** REGISTRY ***************************/
	$("#WalletLoad").click(function(){
		const walletAddr = $("#WalletLoadAddress").val();
		if (!walletAddr) return alert("Enter an address to load from");
		const wallet = CustodialWallet.at(walletAddr);
		$("#WalletAddress").text(walletAddr);
		util.bindToElement(wallet.custodian(), $("#WalletCustodian"));
		util.bindToElement(wallet.supervisor(), $("#WalletSupervisor"));
		util.bindToElement(wallet.owner(), $("#WalletOwner"));
	});
	$("#WalletRegister").click(function(){
		const walletAddr = $("#WalletLoadAddress").val();
		if (!walletAddr) return alert("No wallet address set (use Load input)");
		const regAddress = $("#RegLoadAddress").val();
		if (!regAddress) return alert("No registry address set.");

		const wallet = CustodialWallet.at(walletAddr);
		const reg = Registry.at(regAddress);
		registerAddress(reg, wallet, "WALLET", walletAddr)
			.then(()=>{
				alert(`Registered.`);
			})
			.catch(function(e){
				console.error(e);
				alert(`Failed to register: ${e.message}`);
			});
	});
	/******** REGISTRY ***************************/


	/******** REGISTRY ***************************/
	$("#RegCreate").click(function(){
		const owner = $("#RegCreateOwner").val();
		if (!owner) return alert("Owner required");
		Registry.new({_owner: owner}).then(function(result){
			const reg = result.instance;
			$("#RegLoadAddress").val(reg.address);
			$("#RegLoad").click();
		});
	});
	$("#RegLoad").click(function(){
		const address = $("#RegLoadAddress").val();
		const reg = Registry.at(address);
		$("#RegAddress").text(address);
		util.bindToElement(reg.owner(), $("#RegOwner"));
		util.bindToElement(reg.addressOf({_name: "ADMIN"}), $("#RegAdmin"));
		util.bindToElement(reg.addressOf({_name: "TREASURY"}), $("#RegTreasury"));
		util.bindToElement(reg.addressOf({_name: "MAIN_CONTROLLER"}), $("#RegMc"));
		util.bindToElement(reg.addressOf({_name: "PENNY_AUCTION_CONTROLLER"}), $("#RegPac"));
		util.bindToElement(reg.addressOf({_name: "PENNY_AUCTION_FACTORY"}), $("#RegPaf"));
		util.bindToElement(reg.addressOf({_name: "DICE"}), $("#RegDice"));
	});
	$("#RegSetAdmin").click(function(){
		alert("Not set up to work with Custodial Admin");
		// const regAddress = $("#RegLoadAddress").val();
		// const adminAddress = $("#RegSetAdminAddress").val();
		// if (!regAddress) return alert("No registry address set.");
		// if (!adminAddress) return alert("Must set an admin address.");

		// const reg = Registry.at(regAddress);
		// reg.register({_name: "ADMIN", _addr: adminAddress})
		// 	.then((res)=>{
		// 		alert("Admin has been set.");
		// 		$("#RegLoad").click();
		// 	})
		// 	.catch((err)=>{ 
		// 		alert("Unable to set admin. Are you the owner?");
		// 	});
	});
	/******** REGISTRY ***************************/

	/******** COMPTROLLER ************************/
	$("#CompCreate").click(function(){
		const ownerAddr = $("#CompCreateOwner").val()
		if (!ownerAddr) return alert("Owner address required.");
		Comptroller.new({_owner: ownerAddra}).then(function(result){
			$("#CompLoadAddress").val(result.instance.address);
			$("#CompLoad").click();
		});
	});
	$("#CompLoad").click(function(){
		const address = $("#CompLoadAddress").val();
		const comp = Comptroller.at(address);
		$("#CompAddress").text(address);
		util.bindToElement(comp.owner(), $("#CompOwner"));
		util.bindToElement(comp.treasury(), $("#CompTreasury"));
		util.bindToElement(comp.token(), $("#CompToken"));

		comp.locker().then((lockerAddr)=>{
			const locker = DividendTokenLocker.at(lockerAddr);
			$("#LockerAddress").text(lockerAddr);
			util.bindToElement(locker.owner(), $("#LockerOwner"));
		});
	});
	$("#CompRegister").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const compAddress = $("#CompLoadAddress").val();
		// const regAddress = $("#RegLoadAddress").val();
		// if (!compAddress) return alert("No address set (use Load input)");
		// if (!regAddress) return alert("No address set for registry.");
		// Registry.at(regAddress)
		// .register({_name: "COMPTROLLER", _addr: compAddress})
		// .then(function(){
		// 	alert("Comptroller has been registered.");
		// }).catch(function(e){
		// 	alert(`Failed to register: ${e.message}`);
		// });
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
		util.bindToElement(tr.getRegistry(), $("#TrRegistry"));
		util.bindToElement(tr.getOwner(), $("#TrOwner"));
		util.bindToElement(tr.getAdmin(), $("#TrAdmin"));
		util.bindToElement(tr.getMainController(), $("#TrMainController"));
		util.bindToElement(tr.comptroller(), $("#TrComptroller"));
		util.bindToElement(tr.token(), $("#TrToken"));
	});
	$("#TrRegister").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const trAddress = $("#TrLoadAddress").val();
		// if (!trAddress) return alert("No address set (use Load input)");
		// const tr = Treasury.at(trAddress);
		// tr.getRegistry().then((regAddress)=>{
		// 	const reg = Registry.at(regAddress);
		// 	return reg.register({_name: "TREASURY", _addr: trAddress});
		// }).then(function(){
		// 	alert("Treasury has been registered.");
		// }).catch(function(e){
		// 	alert(`Failed to register: ${e.message}`);
		// });
	});
	$("#TrInitComptroller").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const trAddress = $("#TrLoadAddress").val();
		// const compAddress = $("#TrInitCompAddress").val();
		// if (!trAddress) return alert("No Treasury address set.");
		// if (!compAddress) return alert("No comp address set.");
		// const tr = Treasury.at(trAddress);
		// tr.initComptroller({_comptroller: compAddress})
		// 	.then(function(){
		// 		alert("initComptroller successful.");
		// 		$("#TrLoad").click();
		// 	})
		// 	.catch(function(){
		// 		alert("Unable to initComptroller. Are you the admin?");
		// 	});
	});
	$("#TrInitToken").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const trAddress = $("#TrLoadAddress").val();
		// const tokenAddress = $("#TrInitTokenAddress").val();
		// if (!trAddress) return alert("No Treasury address set.");
		// if (!tokenAddress) return alert("No token address set.");
		// const tr = Treasury.at(trAddress);
		// tr.initToken({_token: tokenAddress})
		// 	.then(function(){
		// 		alert("initToken successful.");
		// 		$("#TrLoad").click();
		// 	})
		// 	.catch(function(){
		// 		alert("Unable to initToken. Are you the admin?");
		// 	});
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
		util.bindToElement(mc.version(), $("#McVersion"));
		util.bindToElement(mc.getTreasury(), $("#McTreasury"));
		util.bindToElement(mc.getAdmin(), $("#McAdmin"));
		util.bindToElement(mc.getPennyAuctionController(), $("#McPac"));
	});
	$("#McRegister").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const mcAddress = $("#McLoadAddress").val();
		// if (!mcAddress) return alert("No address set (use Load input)");
		// const mc = MainController.at(mcAddress);
		// mc.getRegistry().then((regAddress)=>{
		// 	const reg = Registry.at(regAddress);
		// 	return reg.register({_name: "MAIN_CONTROLLER", _addr: mcAddress});
		// }).then(function(){
		// 	alert("Main Controller has been registered.");
		// }).catch(function(e){
		// 	alert(`Failed to register: ${e.message}`);
		// });
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
		util.bindToElement(pac.version(), $("#PacVersion"));
		util.bindToElement(pac.getAdmin(), $("#PacAdmin"));
		util.bindToElement(pac.getPennyAuctionFactory(), $("#PacPaf"));
	});
	$("#PacRegister").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const pacAddress = $("#PacLoadAddress").val();
		// if (!pacAddress) return alert("No address set (use Load input)");
		// const pac = PennyAuctionController.at(pacAddress);
		// pac.getRegistry().then((regAddress)=>{
		// 	const reg = Registry.at(regAddress);
		// 	return reg.register({_name: "PENNY_AUCTION_CONTROLLER", _addr: pacAddress});
		// }).then(function(){
		// 	alert("Penny Auction Controller has been registered.");
		// }).catch(function(e){
		// 	alert(`Failed to register: ${e.message}`);
		// });
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
		util.bindToElement(paf.version(), $("#PafVersion"));
		util.bindToElement(paf.getTreasury(), $("#PafTreasury"));
		util.bindToElement(paf.getPennyAuctionController(), $("#PafPac"));
	});
	$("#PafRegister").click(function(){
		alert("Not set up to work with Custodial Wallet");
		// const pafAddress = $("#PafLoadAddress").val();
		// if (!pafAddress) return alert("No address set (use Load input)");
		// const paf = PennyAuctionFactory.at(pafAddress);
		// paf.getRegistry().then((regAddress)=>{
		// 	const reg = Registry.at(regAddress);
		// 	return reg.register({_name: "PENNY_AUCTION_FACTORY", _addr: pafAddress});
		// }).then(function(){
		// 	alert("Penny Auction Factory has been registered.");
		// }).catch(function(e){
		// 	alert(`Failed to register: ${e.message}`);
		// });
	});
	/******** Penny Auction Controller ********************/


	/******** Penny Auction Factory ********************/
	$("#DiceCreate").click(function(){
		const regAddress = $("#DiceRegistryAddress").val();
		if (!regAddress) return alert("No registry address set");
		InstaDice.new({_registry: regAddress}).then(function(result){
			$("#DiceLoadAddress").val(result.instance.address);
			$("#DiceLoad").click();
		});
	});
	$("#DiceLoad").click(function(){
		const address = $("#DiceLoadAddress").val();
		if (!address || address == "0x") return;
		const dice = InstaDice.at(address);
		$("#DiceAddress").text(address);
		util.bindToElement(dice.version(), $("#DiceVersion"));
		util.bindToElement(dice.getTreasury(), $("#DiceTreasury"));
	});
	$("#DiceRegister").click(function(){
		const diceAddr = $("#DiceLoadAddress").val();
		if (!diceAddr) return alert("No address set (use Load input)");

		const dice = InstaDice.at(diceAddr);
		var reg, wallet;
		dice.getRegistry().then((regAddress)=>{
			reg = Registry.at(regAddress);
			return reg.addressOf({_name: "WALLET"});
		}).then(function(walletAddress){
			wallet = CustodialWallet.at(walletAddress);
			console.log("Loaded wallet and registry. Registering now.");
		}).then(()=>{
			return registerAddress(reg, wallet, "INSTADICE", diceAddr);
		}).catch(function(e){
			console.error(e);
			alert(`Failed to register: ${e.message}`);
		});
	});
	/******** Penny Auction Controller ********************/

	init();
});