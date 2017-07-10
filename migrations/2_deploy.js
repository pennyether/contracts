var Registry = artifacts.require("./Registry.sol");
var Treasury = artifacts.require("./Treasury.sol");
var MainController = artifacts.require("./MainController.sol");
var PennyAuctionFactory = artifacts.require("./PennyAuctionFactory.sol");
var PennyAuctionController = artifacts.require("./PennyAuctionController.sol");

module.exports = function(deployer, network, accounts) {
	var maxOpenAuctions = 2;
	var maxInitialPrize = .1e18;

	deployer.then(async function(){
		console.log("Deploying PennyEth singletons...");
		await deployer.deploy(Registry);
		var registry = Registry.at(Registry.address);
		await deployer.deploy(Treasury, registry.address);
		var treasury = Treasury.at(Treasury.address);
		await deployer.deploy(MainController, registry.address);
		var mainController = MainController.at(MainController.address);
		await deployer.deploy(PennyAuctionController, registry.address, maxOpenAuctions, maxInitialPrize);
		var pac = PennyAuctionController.at(PennyAuctionController.address);
		await deployer.deploy(PennyAuctionFactory, registry.address);
		var paf = PennyAuctionFactory.at(PennyAuctionFactory.address);

		// connect everything.
		await registry.register("ADMIN", accounts[1]);
		await registry.register("TREASURY", treasury.address);
		await registry.register("MAIN_CONTROLLER", mainController.address);
		await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
		await registry.register("PENNY_AUCTION_FACTORY", paf.address);
		web3.eth.sendTransaction({from: accounts[0], to: treasury.address, value: 0.5e18});
		console.log("Funded treasury with .5 ETH.");
		console.log("OWNER:", accounts[0]);
		console.log("ADMIN:", accounts[1]);
		console.log("REGISTRY:", registry.address);
		console.log("TREASURY:", treasury.address);
		console.log("MAIN_CONTROLLER:", mainController.address);
		console.log("PENNY_AUCTION_CONTROLLER", pac.address);
		console.log("PENNY_AUCTION_FACTORY", paf.address);
		
		function assertEquals(arg1, arg2, msg){
			if (arg1 != arg2) throw new Error(msg + ": " + arg1 + " != " + arg2);
			//console.log(msg);
		}
		assertEquals(await registry.addressOf.call("OWNER"), accounts[0], "Registry sees correct owner.");
		
		assertEquals(await treasury.getOwner(), accounts[0], "Treasury sees correct owner.");
		assertEquals(await treasury.getMainController(), mainController.address, "Treasury sees correct mainController.");

		assertEquals(await mainController.getOwner(), accounts[0], "MainController sees correct owner");
		assertEquals(await mainController.getAdmin(), accounts[1], "MainController sees correct admin");
		assertEquals(await mainController.getPennyAuctionController(), pac.address, "MainController sees correct PAC");
		
		assertEquals(await pac.getOwner(), accounts[0], "PAC sees correct owner.");
		assertEquals(await pac.getMainController(), mainController.address, "PAC sees correct MainController");
		assertEquals(await pac.getPennyAuctionFactory(), paf.address, "PAC sees correct PAF.");
		
		assertEquals(await paf.getOwner(), accounts[0], "PAF sees correct owner.");
		assertEquals(await paf.getTreasury(), treasury.address, "PAF sees correct treasury.");
		assertEquals(await paf.getPennyAuctionController(), pac.address, "PAF sees correct PAC.");
		console.log("Done deploying PennyEth singletons.");
	});
};
