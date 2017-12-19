var Registry = artifacts.require("./Registry.sol");
var Treasury = artifacts.require("./Treasury.sol");
var MainController = artifacts.require("./MainController.sol");
var PennyAuctionFactory = artifacts.require("./PennyAuctionFactory.sol");
var PennyAuctionController = artifacts.require("./PennyAuctionController.sol");

module.exports = function(deployer, network, accounts) {
	const owner = accounts[0];
	const admin = accounts[1];
	// fuck deployer. we dont need this shit.
	return;

	deployer.then(async function(){
		console.log("Deploying PennyEth singletons...");
		await deployer.deploy(Registry);
		var registry = Registry.at(Registry.address);
		await deployer.deploy(Treasury, registry.address);
		var treasury = Treasury.at(Treasury.address);
		await deployer.deploy(MainController, registry.address);
		var mainController = MainController.at(MainController.address);
		await deployer.deploy(PennyAuctionController, registry.address);
		var pac = PennyAuctionController.at(PennyAuctionController.address);
		await deployer.deploy(PennyAuctionFactory, registry.address);
		var paf = PennyAuctionFactory.at(PennyAuctionFactory.address);

		// connect everything.
		await registry.register("ADMIN", accounts[1]);
		await registry.register("TREASURY", treasury.address);
		await registry.register("MAIN_CONTROLLER", mainController.address);
		await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
		await registry.register("PENNY_AUCTION_FACTORY", paf.address);
		web3.eth.sendTransaction({from: owner, to: treasury.address, value: 0.5e18});
		console.log("Funded treasury with .5 ETH.");
		console.log("OWNER:", owner);
		console.log("ADMIN:", admin);
		console.log("REGISTRY:", registry.address);
		console.log("TREASURY:", treasury.address);
		console.log("MAIN_CONTROLLER:", mainController.address);
		console.log("PENNY_AUCTION_CONTROLLER", pac.address);
		console.log("PENNY_AUCTION_FACTORY", paf.address);
		
		function assertEquals(arg1, arg2, msg){
			if (arg1 != arg2) throw new Error(msg + ": " + arg1 + " != " + arg2);
			//console.log(msg);
		}
		assertEquals(await registry.addressOf.call("OWNER"), owner, "Registry sees correct owner.");
		
		assertEquals(await treasury.getOwner(), owner, "Treasury sees correct owner.");
		assertEquals(await treasury.getMainController(), mainController.address, "Treasury sees correct mainController.");

		assertEquals(await mainController.getOwner(), owner, "MainController sees correct owner");
		assertEquals(await mainController.getPennyAuctionController(), pac.address, "MainController sees correct PAC");
		
		assertEquals(await pac.getOwner(), owner, "PAC sees correct owner.");
		assertEquals(await pac.getAdmin(), admin, "PAC sees correct admin.");
		assertEquals(await pac.getPennyAuctionFactory(), paf.address, "PAC sees correct PAF.");
		
		assertEquals(await paf.getOwner(), owner, "PAF sees correct owner.");
		assertEquals(await paf.getTreasury(), treasury.address, "PAF sees correct treasury.");
		assertEquals(await paf.getPennyAuctionController(), pac.address, "PAF sees correct PAC.");
		console.log("Done deploying PennyEth singletons.");
	});
};
