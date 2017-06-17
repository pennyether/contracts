var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");
var MainController = artifacts.require("MainController");
var PennyAuctionController = artifacts.require("PennyAuctionController");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var Ledger = TestUtil.Ledger;
var BigNumber = require("bignumber.js");

var EXPECT_INVALID_OPCODE = TestUtil.expectInvalidOpcode;

contract("MainController", function(accounts){
	var owner;
	var admin;
	var rando;

	var registry;
	var treasury;
	var mainController;
	var pac;
	var paf;

	var maxOpenAuctions;
	var maxInitialPrize;

	var initialPrize; 
	var bidPrice;
	var bidTimeS     = new BigNumber(600);          // 10 minutes
	var bidFeePct    = new BigNumber(60);
	var auctionTimeS = new BigNumber(60*60*12);     // 12 hours

	before("Load contracts from deployment", async function(){
		await Registry.deployed().then(r => registry = r);
		await Treasury.deployed().then(t => treasury = t);
		await MainController.deployed().then(mc => mainController = mc);
		await PennyAuctionController.deployed().then(p => pac = p);
		await PennyAuctionFactory.deployed().then(p => paf = p);
		owner = await registry.addressOf("OWNER");
		admin = await registry.addressOf("ADMIN");
		maxOpenAuctions = await pac.maxOpenAuctions();
		maxInitialPrize = await pac.maxInitialPrize();
		initialPrize = maxInitialPrize.div(2);
		bidPrice = initialPrize.div(10);
		console.log("registry address:", registry.address);
		console.log("maxOpenAuctions:", maxOpenAuctions);
		console.log("maxInitialPrize:", maxInitialPrize);
	});

	describe("When calling createPennyAuction", function(){
		it("started an auction", async function(){
			await mainController.createPennyAuction(
				initialPrize,
				bidPrice,
				bidTimeS,
				bidFeePct,
				auctionTimeS,
				{from: admin}
			);
		});
	});
});
