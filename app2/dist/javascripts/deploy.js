Loader.promise.then(function(){
	function bindToElement(promise, element) {
		element.empty().text("loading...");
		promise.then(function(res){
			element.empty().text(res);
		},function(e){
			element.empty().text(`Error: ${e.message}`);
		});
	}

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
});