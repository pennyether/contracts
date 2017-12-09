var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");
var MainController = artifacts.require("MainController");
var PennyAuctionController = artifacts.require("PennyAuctionController");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const SUMMARY_0        = "First Auction";
const INITIAL_PRIZE_0  = new BigNumber(.05e18);
const BID_PRICE_0      = new BigNumber(.001e18);
const BID_ADD_BLOCKS_0 = new BigNumber(2);
const BID_FEE_PCT_0    = new BigNumber(60);
const INITIAL_BLOCKS_0 = new BigNumber(10);
const DEF_0 = [SUMMARY_0, INITIAL_PRIZE_0, BID_PRICE_0, BID_ADD_BLOCKS_0, BID_FEE_PCT_0, INITIAL_BLOCKS_0];
const FEE_INCR_0 = BID_PRICE_0.mul(BID_FEE_PCT_0.div(100));
const BID_INCR_0 = BID_PRICE_0.minus(FEE_INCR_0);

const SUMMARY_1        = "Second Auction (Invalid BID_ADD_BLOCKS_1)";
const INITIAL_PRIZE_1  = new BigNumber(.04e18);
const BID_PRICE_1      = new BigNumber(.001e18);
const BID_ADD_BLOCKS_1 = new BigNumber(0);
const BID_FEE_PCT_1    = new BigNumber(30);
const INITIAL_BLOCKS_1 = new BigNumber(5);
const DEF_1 = [SUMMARY_1, INITIAL_PRIZE_1, BID_PRICE_1, BID_ADD_BLOCKS_1, BID_FEE_PCT_1, INITIAL_BLOCKS_1];
const FEE_INCR_1 = BID_PRICE_1.mul(BID_FEE_PCT_1.div(100));
const BID_INCR_1 = BID_PRICE_1.minus(FEE_INCR_1);

const SUMMARY_2        = "Third Auction (Gigantic Initial Prize)";
const INITIAL_PRIZE_2  = new BigNumber(1e25);
const BID_PRICE_2      = new BigNumber(.001e18);
const BID_ADD_BLOCKS_2 = new BigNumber(0);
const BID_FEE_PCT_2    = new BigNumber(30);
const INITIAL_BLOCKS_2 = new BigNumber(5);
const DEF_2 = [SUMMARY_2, INITIAL_PRIZE_2, BID_PRICE_2, BID_ADD_BLOCKS_2, BID_FEE_PCT_2, INITIAL_BLOCKS_2];
const FEE_INCR_2 = BID_PRICE_2.mul(BID_FEE_PCT_2.div(100));
const BID_INCR_2 = BID_PRICE_2.minus(FEE_INCR_2);

const accounts = web3.eth.accounts;

describe("MainController", function(){
	var owner = accounts[0];
	var admin = accounts[1];
	var rando = accounts[2];
	const NO_ADDRESS = "0x0000000000000000000000000000000000000000";

	var registry;
	var treasury;
	var mainController;
	var pac;
	var paf;

	before("Set it all up", async function(){
		registry = await Registry.new({from: owner});
        treasury = await Treasury.new(registry.address);
        mainController = await MainController.new(registry.address);
        pac = await PennyAuctionController.new(registry.address);
        paf = await PennyAuctionFactory.new(registry.address);
        
        await registry.register("ADMIN", admin);
        await registry.register("TREASURY", treasury.address);
        await registry.register("MAIN_CONTROLLER", mainController.address);
        await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
        await registry.register("PENNY_AUCTION_FACTORY", paf.address);
        await testUtil.transfer(owner, treasury.address, INITIAL_PRIZE_0.mul(2));

        const addresses = {
        	owner: owner,
        	admin: admin,
        	registry: registry.address,
        	treasury: treasury.address,
        	mainController: mainController.address,
        	pac: pac.address,
        	paf: paf.address,
        	NO_ADDRESS: NO_ADDRESS
        };
        console.log("Addresses:", addresses);

        await createDefaultTxTester()
	        .nameAddresses(addresses)
        	.doTx([pac, "editDefinedAuction", 0].concat(DEF_0, {from: admin}))
        	.doTx([pac, "editDefinedAuction", 1].concat(DEF_1, {from: admin}))
        	.doTx([pac, "editDefinedAuction", 2].concat(DEF_2, {from: admin}))
        	.doTx([pac, "enableDefinedAuction", 0, {from: admin}])
        	.doTx([pac, "enableDefinedAuction", 2, {from: admin}])
        	.assertStateAsString(pac, "numDefinedAuctions", 3)
        	.start();
	});

	describe(".startPennyAuction()", async function(){
		it("Returns false when called on nonEnabled index", async function(){
			const callParams = [mainController, "startPennyAuction", 1, {gasPrice: 20000000000}];
			return createDefaultTxTester()
				.startLedger([treasury])
				.startWatching([treasury, pac])
				.assertCallReturns(callParams, [false, NO_ADDRESS])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("DefinedAuction is not currently startable.")
				.stopLedger()
					.assertNoDelta(treasury)
				.stopWatching()
					.assertEventCount(treasury, 0)
				.assertCallReturns([pac, "getAuction", 1], NO_ADDRESS)
				.start();
		});
		it("Returns false when cannot get funds.", async function(){
			const callParams = [mainController, "startPennyAuction", 2, {gasPrice: 20000000000}];
			return createDefaultTxTester()
				.startLedger([treasury])
				.startWatching([treasury])
				.assertCallReturns(callParams, [false, NO_ADDRESS])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("Unable to receive funds.")
				.stopLedger()
					.assertNoDelta(treasury)
				.stopWatching()
					.assertOnlyEvent(treasury, "NotEnoughFunds")
				.assertCallReturns([pac, "getAuction", 2], NO_ADDRESS)
				.start();
			});
		it("Returns false when PennyAuctionFactory fails. (call throws)", async function(){
			// 1 has invalid BID_ADD_BLOCKS.
			await pac.enableDefinedAuction(1, {from: admin});
			const callParams = [mainController, "startPennyAuction", 1, {gasPrice: 20000000000}];
			return createDefaultTxTester()
				.assertCallThrows(callParams)
				.startLedger([treasury])
				.startWatching([treasury, pac])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("PennyAuctionFactory.startDefinedAuction() failed.")
				.stopLedger()
					.assertNoDelta(treasury, "gets refunded")
				.stopWatching()
					.assertEventCount(treasury, 2)
					.assertEvent(treasury, "TransferSuccess")
					.assertEvent(treasury, "RefundReceived")
					.assertOnlyEvent(pac, "Error", {msg: "PennyAuctionFactory could not create auction (invalid params?)"})
				.assertCallReturns([pac, "getAuction", 1], NO_ADDRESS)
				.start();
		});
		it("Works", async function(){
			const callParams = [mainController, "startPennyAuction", 0, {gasPrice: 20000000000}];
			return createDefaultTxTester()
				.assertCallReturns(callParams, [true, null])
				.start();
		})
	});
});
