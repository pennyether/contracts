var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");
var MainController = artifacts.require("MainController");
var PennyAuctionController = artifacts.require("PennyAuctionController");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

var TxTester = require("../js/tx-tester.js");
var TestUtil = require("../js/test-util.js").make(web3, assert);
var Ledger = TestUtil.Ledger;
var BigNumber = require("bignumber.js");

var EXPECT_INVALID_OPCODE = TestUtil.expectInvalidOpcode;
var EXPECT_ERROR_LOG = TestUtil.expectErrorLog;
var EXPECT_ONE_LOG = TestUtil.expectOneLog;
var maxOpenAuctions = new BigNumber(2);
var maxInitialPrize = new BigNumber(.05e18);

var initialPrize = maxInitialPrize.div(2);
var bidPrice     = initialPrize.div(10);
var bidTimeS     = new BigNumber(600);          // 10 minutes
var bidFeePct    = new BigNumber(60);
var auctionTimeS = new BigNumber(60*60*12);     // 12 hours

contract("MainController", function(accounts){
	var txTester = new TxTester(web3, assert);
	var owner = accounts[0];
	var admin = accounts[1];
	var rando = accounts[2];

	var registry;
	var treasury;
	var mainController;
	var pac;
	var paf;

	before("Set it all up", async function(){
		registry = await Registry.new({from: owner});
        treasury = await Treasury.new(registry.address);
        mainController = await MainController.new(registry.address);
        pac = await PennyAuctionController.new(registry.address, maxOpenAuctions, maxInitialPrize);
        paf = await PennyAuctionFactory.new(registry.address);
        
        await registry.register("ADMIN", admin);
        await registry.register("TREASURY", treasury.address);
        await registry.register("MAIN_CONTROLLER", mainController.address);
        await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
        await registry.register("PENNY_AUCTION_FACTORY", paf.address);
        await TestUtil.transfer(owner, treasury.address, maxInitialPrize.mul(2));
	});

	describe("When calling createPennyAuction", function(){
		describe("Before...", function(){
			it("is not callable from non-admin", async function(){
				await txTester.do(() => 
					mainController.createPennyAuction(
						initialPrize,
						bidPrice,
						bidTimeS,
						bidFeePct,
						auctionTimeS,
						{from: rando}
					)
				).assertInvalidOpCode();
			});
			it("cant start an auction that's more than treasury has", async function(){
				await txTester.do(async () => 
					mainController.createPennyAuction(
						await TestUtil.getBalance(treasury.address).plus(1),
						bidPrice,
						bidTimeS,
						bidFeePct,
						auctionTimeS,
						{from: admin}
					)
				).assertErrorLog("Unable to receive funds", mainController.address);
			});
			it("cant start an auction that's above maxInitialPrize", async function(){
				await txTester
					.watch([treasury.address])
					.do(() => 
						mainController.createPennyAuction(
							maxInitialPrize.plus(1),
							bidPrice,
							bidTimeS,
							bidFeePct,
							auctionTimeS,
							{from: admin}
						)
					).assertErrorLog("Unable to start a new auction", mainController.address)
					.assertDelta(treasury.address, 0, "No funds lost from treasury");
			});
			it("started an auction", async function(){
				await txTester
					.watch([treasury.address])
					.do( () => 
						mainController.createPennyAuction(
							initialPrize,
							bidPrice,
							bidTimeS,
							bidFeePct,
							auctionTimeS,
							{from: admin}
						)
					).assertOneLog("PennyAuctionStarted", {time: null, addr: null})
					.assertDelta(treasury.address, initialPrize.mul(-1), "Treasury lost funds");
			});
			it("returns proper stuff", async function(){
				var res = await mainController.createPennyAuction.call(
					initialPrize,
					bidPrice,
					bidTimeS,
					bidFeePct,
					auctionTimeS,
					{from: admin}
				);
				assert.equal(res[0], true, "Auction started successfully");
				assert.equal(res[1].length, 42, "Address had 42 chars");
			})
		});
		
		xdescribe("when the game was started", function(){
			it("created an auction with the proper settings", async function(){

			});

			it("created an auction via the proper PennyAuctionController", async function(){

			});
		});
	});

	xdescribe("When calling checkPennyAuctions", function(){
		beforeEach("create some auctions", async function(){

		});

		it("doesnt call PennyAuctionController when no fees to collect or games to close", async function(){

		});

		it("does call PennyAuctionController when fees to collect", async function(){
			// bid on some games
		});

		it("does call PennyAuctionController when games to close", async function(){
			// bid on some games, collect fees, fast forward
		});
	})
});
