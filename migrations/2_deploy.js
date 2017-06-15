var Registry = artifacts.require("./Registry.sol");
var Treasury = artifacts.require("./Treasury.sol");
var MainController = artifacts.require("./MainController.sol");
var PennyAuctionFactory = artifacts.require("./PennyAuctionFactory.sol");
var PennyAuctionController = artifacts.require("./PennyAuctionController.sol");

module.exports = function(deployer, network, accounts) {
	deployer.then(async function(){
		console.log("Deploying PennyEth contracts...");
		await deployer.deploy(Registry);
		var registry = Registry.at(Registry.address);
		await deployer.deploy(Treasury, registry.address);
		var treasury = Treasury.at(Treasury.address);
		await deployer.deploy(MainController, registry.address);
		var mainController = MainController.at(MainController.address);
		await deployer.deploy(PennyAuctionController, registry.address, 1, 1e18);
		var pac = PennyAuctionController.at(PennyAuctionController.address);
		await deployer.deploy(PennyAuctionFactory, registry.address);
		var paf = PennyAuctionFactory.at(PennyAuctionFactory.address);

		// connect everything.
		await registry.register("TREASURY", treasury.address);
		await registry.register("MAIN_CONTROLLER", mainController.address);
		await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
		await registry.register("PENNY_AUCTION_FACTORY", paf.address);
		
		function assertEquals(arg1, arg2, msg){
			if (arg1 != arg2) throw new Error(msg + ": " + arg1 + " != " + arg2);
			//console.log(msg);
		}
		assertEquals(await registry.addressOf.call("OWNER"), accounts[0], "Registry sees correct owner.");
		
		assertEquals(await treasury.getOwner(), accounts[0], "Treasury sees correct owner.");
		assertEquals(await treasury.getMainController(), mainController.address, "Treasury sees correct mainController.");
		
		assertEquals(await pac.getOwner(), accounts[0], "PAC sees correct owner.");
		assertEquals(await pac.getMainController(), mainController.address, "PAC sees correct MainController");
		assertEquals(await pac.getPennyAuctionFactory(), paf.address, "PAC sees correct PAF.");
		
		assertEquals(await paf.getOwner(), accounts[0], "PAF sees correct owner.");
		assertEquals(await paf.getTreasury(), treasury.address, "PAF sees correct treasury.");
		assertEquals(await paf.getPennyAuctionController(), pac.address, "PAF sees correct PAC.");
		console.log("Done deploying.");
	});
};
