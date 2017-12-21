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
const INITIAL_BLOCKS_0 = new BigNumber(15);
const DEF_0 = [SUMMARY_0, INITIAL_PRIZE_0, BID_PRICE_0, BID_FEE_PCT_0, BID_ADD_BLOCKS_0, INITIAL_BLOCKS_0];
const FEE_INCR_0 = BID_PRICE_0.mul(BID_FEE_PCT_0.div(100));
const BID_INCR_0 = BID_PRICE_0.minus(FEE_INCR_0);

const SUMMARY_1        = "Second Auction (Invalid BID_ADD_BLOCKS_1)";
const INITIAL_PRIZE_1  = new BigNumber(.04e18);
const BID_PRICE_1      = new BigNumber(.001e18);
const BID_ADD_BLOCKS_1 = new BigNumber(0);
const BID_FEE_PCT_1    = new BigNumber(30);
const INITIAL_BLOCKS_1 = new BigNumber(5);
const DEF_1 = [SUMMARY_1, INITIAL_PRIZE_1, BID_PRICE_1, BID_FEE_PCT_1, BID_ADD_BLOCKS_1, INITIAL_BLOCKS_1];
const FEE_INCR_1 = BID_PRICE_1.mul(BID_FEE_PCT_1.div(100));
const BID_INCR_1 = BID_PRICE_1.minus(FEE_INCR_1);

const SUMMARY_2        = "Third Auction (Gigantic Initial Prize)";
const INITIAL_PRIZE_2  = new BigNumber(1e25);
const BID_PRICE_2      = new BigNumber(.001e18);
const BID_ADD_BLOCKS_2 = new BigNumber(2);
const BID_FEE_PCT_2    = new BigNumber(30);
const INITIAL_BLOCKS_2 = new BigNumber(5);
const DEF_2 = [SUMMARY_2, INITIAL_PRIZE_2, BID_PRICE_2, BID_FEE_PCT_2, BID_ADD_BLOCKS_2, INITIAL_BLOCKS_2];
const FEE_INCR_2 = BID_PRICE_2.mul(BID_FEE_PCT_2.div(100));
const BID_INCR_2 = BID_PRICE_2.minus(FEE_INCR_2);

const SUMMARY_3        = "Fourth Auction";
const INITIAL_PRIZE_3  = new BigNumber(.025e18);
const BID_PRICE_3      = new BigNumber(.01e18);
const BID_ADD_BLOCKS_3 = new BigNumber(2);
const BID_FEE_PCT_3    = new BigNumber(50);
const INITIAL_BLOCKS_3 = new BigNumber(40);
const DEF_3 = [SUMMARY_3, INITIAL_PRIZE_3, BID_PRICE_3, BID_FEE_PCT_3, BID_ADD_BLOCKS_3, INITIAL_BLOCKS_3];
const FEE_INCR_3 = BID_PRICE_3.mul(BID_FEE_PCT_3.div(100));
const BID_INCR_3 = BID_PRICE_3.minus(FEE_INCR_3);

const DEFS = [DEF_0, DEF_1, DEF_2, DEF_3];

const REWARD_GAS_PRICE_LIMIT = new BigNumber(40000000000); 	// 40 GWei
const PA_START_REWARD = new BigNumber(.001e18);				// .001 ETH
const PA_END_REWARD = new BigNumber(.001e18);				// .001 ETH
const PA_FEE_COLLECT_REWARD_DENOM = new BigNumber(1000);	// .1%

const accounts = web3.eth.accounts;

describe("MainController", function(){
	const owner = accounts[1];
	const admin = accounts[2];
	const nonAdmin = accounts[3];
	const bidder1 = accounts[4];
	const bidder2 = accounts[5];
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
        
        await testUtil.transfer(owner, treasury.address, INITIAL_PRIZE_0.mul(5));

        const addresses = {
        	owner: owner,
        	admin: admin,
        	nonAdmin: nonAdmin,
        	registry: registry.address,
        	treasury: treasury.address,
        	mainController: mainController.address,
        	pac: pac.address,
        	paf: paf.address,
        	bidder1: bidder1,
        	bidder2: bidder2,
        	NO_ADDRESS: NO_ADDRESS
        };

        await createDefaultTxTester()
	        .nameAddresses(addresses)
	        .doTx([registry, "register", "ADMIN", admin, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "TREASURY", treasury.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "MAIN_CONTROLLER", mainController.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", pac.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "PENNY_AUCTION_FACTORY", paf.address, {from: owner}])
                .assertSuccess()
            .doTx([treasury, "setDailyFundLimit", 1e18, {from: admin}])
            	.assertSuccess()
	        .assertCallReturns([mainController, "getAdmin"], admin)
	        .assertCallReturns([mainController, "getTreasury"], treasury.address)
	        .assertCallReturns([mainController, "getPennyAuctionController"], pac.address)
        	.doTx([pac, "editDefinedAuction", 0].concat(DEF_0, {from: admin}))
        	.doTx([pac, "editDefinedAuction", 1].concat(DEF_1, {from: admin}))
        	.doTx([pac, "editDefinedAuction", 2].concat(DEF_2, {from: admin}))
        	.doTx([pac, "editDefinedAuction", 3].concat(DEF_3, {from: admin}))
        	.doTx([pac, "enableDefinedAuction", 0, {from: admin}])
        	.doTx([pac, "enableDefinedAuction", 1, {from: admin}])
        	.doTx([pac, "enableDefinedAuction", 2, {from: admin}])
        	.doTx([pac, "enableDefinedAuction", 3, {from: admin}])
        	.assertCallReturns([pac, "numDefinedAuctions"], 4)
        	.start();
	});

	describe(".setPennyAuctionRewards()", function(){
		before("Initialized to 0", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "paStartReward"], 0)
				.assertCallReturns([mainController, "paEndReward"], 0)
				.assertCallReturns([mainController, "paFeeCollectRewardDenom"], 0)
				.start();
		});
		it("Not callable by nonAdmin", function(){
			const callParams = [mainController, "setPennyAuctionRewards",
				PA_START_REWARD, PA_END_REWARD, PA_FEE_COLLECT_REWARD_DENOM,
				{from: nonAdmin}]
			return createDefaultTxTester()
				.assertCallThrows(callParams)
				.doTx(callParams)
				.assertInvalidOpCode()
				.start();
		});
		it("Works.", function(){
			const callParams = [mainController, "setPennyAuctionRewards",
				PA_START_REWARD, PA_END_REWARD, PA_FEE_COLLECT_REWARD_DENOM,
				{from: admin}]
			return createDefaultTxTester()
				.doTx(callParams)
				.assertSuccess()
				.assertOnlyLog("PennyAuctionRewardsChanged", {time: null})
				.assertCallReturns([mainController, "paStartReward"], PA_START_REWARD)
				.assertCallReturns([mainController, "paEndReward"], PA_END_REWARD)
				.assertCallReturns([mainController, "paFeeCollectRewardDenom"], PA_FEE_COLLECT_REWARD_DENOM)
				.start();
		});
	});

	it(".getStartPennyAuctionReward() returns index 0", function(){
		return createDefaultTxTester()
			.assertCallReturns([mainController, "getStartPennyAuctionReward"], [PA_START_REWARD, 0])
			.start();
	});

	describe(".startPennyAuction()", async function(){
		before("Rewards are set up correctly", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "paStartReward"], PA_START_REWARD)
				.assertCallReturns([mainController, "paEndReward"], PA_END_REWARD)
				.assertCallReturns([mainController, "paFeeCollectRewardDenom"], PA_FEE_COLLECT_REWARD_DENOM)
				.start();
		})
		it("Returns false when called on nonEnabled index", async function(){
			const callParams = [mainController, "startPennyAuction", 1, {from: nonAdmin}];
			return createDefaultTxTester()
				.doTx([pac, "disableDefinedAuction", 1, {from: admin}])
					.assertSuccess()
				.startLedger([treasury, nonAdmin])
				.startWatching([treasury, pac])
				.assertCallReturns(callParams, [false, NO_ADDRESS])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("DefinedAuction is not currently startable.")
				.stopLedger()
					.assertNoDelta(treasury)
					.assertLostTxFee(nonAdmin)
				.stopWatching()
					.assertEventCount(treasury, 0)
				.assertCallReturns([pac, "getAuction", 1], NO_ADDRESS)
				.doTx([pac, "enableDefinedAuction", 1, {from: admin}])
					.assertSuccess()
				.start();
		});
		it("Returns false when cannot get funds.", async function(){
			const callParams = [mainController, "startPennyAuction", 2, {from: nonAdmin}];
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
					.assertOnlyEvent(treasury, "FundFailure", {
						reason: "Cannot fund.",
						note: ".startPennyAuction()"
					})
				.assertCallReturns([pac, "getAuction", 2], NO_ADDRESS)
				.start();
			});
		it("Returns false when PennyAuctionFactory fails. (call throws)", async function(){
			// 1 has invalid BID_ADD_BLOCKS.
			const refundNote = "PennyAuctionController.startDefinedAuction() failed.";
			const transferNote = ".startPennyAuction()";
			const callParams = [mainController, "startPennyAuction", 1, {from: nonAdmin, gas: 2000000}];
			await createDefaultTxTester()
				.assertCallThrows(callParams)
				.startLedger([treasury, nonAdmin])
				.startWatching([treasury, pac])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog(refundNote)
				.stopLedger()
					.assertLostTxFee(nonAdmin)
					.assertNoDelta(treasury, "gets refunded")
				.stopWatching()
					.assertEventCount(treasury, 2)
					.assertEvent(treasury, "FundSuccess", {note: transferNote})
					.assertEvent(treasury, "RefundReceived", {note: refundNote})
					.assertEventCount(pac, 2)
					.assertEvent(pac, "Error", {msg: "PennyAuctionFactory could not create auction (invalid params?)"})
					.assertEvent(pac, "DefinedAuctionInvalid", {time: null, index: 1})
				.assertCallReturns([pac, "getAuction", 1], NO_ADDRESS)
				.assertCallReturns([treasury, "amtFundedToday"], 0)
				.start();
			await pac.disableDefinedAuction(1, {from: admin});
		});
		it("Starts auction0", async function(){
			return startAuction(0);
		});
		it("Cannot start it again", async function(){
			const callParams = [mainController, "startPennyAuction", 0, {from: nonAdmin}];
			return createDefaultTxTester()
				.assertCallReturns(callParams, [false, NO_ADDRESS])
				.doTx(callParams)
				.assertSuccess()
				.assertOnlyErrorLog("DefinedAuction is not currently startable.")
				.start();
		});
	});

	describe("Start third auction", function(){
		before("make sure only 3 is startable", function(){
			return createDefaultTxTester()
				.doTx([pac, "disableDefinedAuction", 1, {from: admin}])
					.assertSuccess()
				.doTx([pac, "disableDefinedAuction", 2, {from: admin}])
					.assertSuccess()
				.assertCallReturns([pac, "getIsStartable", 0], false)
				.assertCallReturns([pac, "getIsStartable", 1], false)
				.assertCallReturns([pac, "getIsStartable", 2], false)
				.assertCallReturns([pac, "getIsStartable", 3], true)
				.start();
		});

		it(".getStartPennyAuctionReward returns index 3", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getStartPennyAuctionReward"], [PA_START_REWARD, 3])
				.start();
		})

		it(".startPennyAuction(3) works", function(){
			return startAuction(3);
		})

		it(".getStartPennyAuctionReward() returns nothing", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getStartPennyAuctionReward"], [0, 0])
				.start();
		});
	});

	describe(".refreshPennyAuctions()", function(){
		var auction0;
		var auction3;
		before("two auctions are open", function(){
			return createDefaultTxTester()
				.assertCallReturns([pac, "getAuction", 0], {not: NO_ADDRESS})
				.assertCallReturns([pac, "getAuction", 3], {not: NO_ADDRESS})
				.doFn(async function(){
					auction0 = PennyAuction.at(await pac.getAuction(0));
					auction3 = PennyAuction.at(await pac.getAuction(3));
				})
				.start()
		});
		it(".getRefreshPennyAuctionsReward() returns 0", function(){
			return createDefaultTxTester()
				.assertCallThrows([mainController, "getRefreshPennyAuctionsReward"], 0)
				.start();
		});
		it(".refreshPennyAuctions() returns error", function(){
			const callParams = [mainController, "refreshPennyAuctions", {from: nonAdmin}];
			return createDefaultTxTester()
				.startLedger([treasury, nonAdmin])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("No reward to be paid.")
				.stopLedger()
					.assertNoDelta(treasury)
					.assertLostTxFee(nonAdmin)
				.start();
		});
		it("do some bidding", async function(){
			await auction0.sendTransaction({from: bidder1, value: BID_PRICE_0});
            await auction0.sendTransaction({from: bidder2, value: BID_PRICE_0});
            await auction3.sendTransaction({from: bidder2, value: BID_PRICE_3});
            await auction3.sendTransaction({from: bidder1, value: BID_PRICE_3});
		});
		it(".getRefreshPennyAuctionsReward() returns percentage of fees", async function(){
			const totalFees = (await auction0.fees()).plus(await auction3.fees());
			const expectedBonus = totalFees.div(PA_FEE_COLLECT_REWARD_DENOM);
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getRefreshPennyAuctionsReward"], expectedBonus)
				.start();
		});
		it(".refreshPennyAuctions() collects fees", async function(){
			return refreshAuctions();
		});
		it(".getRefreshPennyAuctionsReward() returns 0", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getRefreshPennyAuctionsReward"], 0)
				.start();
		});
		it(".refreshPennyAuctions() returns error", function(){
			const callParams = [mainController, "refreshPennyAuctions", {from: nonAdmin}];
			return createDefaultTxTester()
				.startLedger([treasury, nonAdmin])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("No reward to be paid.")
				.stopLedger()
					.assertNoDelta(treasury)
					.assertLostTxFee(nonAdmin)
				.start();
		});
	});

	describe("After one auction done", function(){
		before("fast forward so auction0 is ended", async function(){
			const auction0 = PennyAuction.at(await pac.getAuction(0));
			const auction3 = PennyAuction.at(await pac.getAuction(3));
			return createDefaultTxTester()
				.assertCallReturns([auction0, "isEnded"], false)
				.assertCallReturns([auction3, "isEnded"], false)
				.doFn(async function(){
					const blocksRemaining0 = (await auction0.getBlocksRemaining()).toNumber();
		            const blocksRemaining3 = (await auction3.getBlocksRemaining()).toNumber();
		            console.log(`Blocks left: auction0: ${blocksRemaining0}, auction3: ${blocksRemaining3}`);
		            if (blocksRemaining3 - blocksRemaining0 < 20){
		                throw new Error("Should be set up so auction0 ends long before auction3 other...");
		            }
		            const blocksToMine = blocksRemaining0;
		            console.log(`Mining ${blocksToMine} blocks so auction0 ends...`);
		            await testUtil.mineBlocks(blocksToMine);
				})
				.assertCallReturns([auction0, "isEnded"], true)
				.assertCallReturns([auction3, "isEnded"], false)
				.start()
		});
		it(".getRefreshPennyAuctionsReward() returns endBonus", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getRefreshPennyAuctionsReward"], PA_END_REWARD)
				.start();
		});
		it(".refreshPennyAuctions() works", function(){
			return refreshAuctions();
		});
		it(".getStartPennyAuctionReward() returns index 0", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getStartPennyAuctionReward"], [PA_START_REWARD, 0])
				.start();
		});
		it(".getRefreshPennyAuctionsReward() returns 0", function(){
			return createDefaultTxTester()
				.assertCallReturns([mainController, "getRefreshPennyAuctionsReward"], 0)
				.start();
		});
		it(".refreshPennyAuctions() returns error", function(){
			const callParams = [mainController, "refreshPennyAuctions", {from: nonAdmin}];
			return createDefaultTxTester()
				.startLedger([treasury, nonAdmin])
				.doTx(callParams)
				.assertSuccess()
					.assertOnlyErrorLog("No reward to be paid.")
				.stopLedger()
					.assertNoDelta(treasury)
					.assertLostTxFee(nonAdmin)
				.start();
		});
	});

	async function startAuction(index) {
		var auction;
		const expectedReward = PA_START_REWARD;
		const initialPrize = await pac.getInitialPrize(index);
		const callParams = [mainController, "startPennyAuction", index, {from: nonAdmin}];
		return createDefaultTxTester()
			.assertCallReturns([mainController, "getStartPennyAuctionReward"], [PA_START_REWARD, index])
			.assertCallReturns(callParams, [true, null])
			.startLedger([treasury, pac, nonAdmin, paf])
			.startWatching([treasury, pac, paf])
			.doTx(callParams)
			.assertSuccess()
				.assertLogCount(2)
				.doFn((ctx) => {
					auction = PennyAuction.at(ctx.txRes.logs[0].args.addr);
					const obj = {}; obj[`auction${index}`] = auction.address;
	                return createDefaultTxTester().nameAddresses(obj, false).start();
				})
				.assertLog("PennyAuctionStarted", {
					time: null,
					index: index,
					addr: ()=>auction.address
				})
				.assertLog("RewardPaid", {
					time: null,
					recipient: nonAdmin,
					note: "Called .startPennyAuction()",
					amount: expectedReward
				})
			.stopLedger()
				.assertNoDelta(pac)
				.assertNoDelta(paf)
				.assertDelta(treasury, expectedReward.plus(initialPrize).mul(-1), "lost prize and reward")
				.assertDeltaMinusTxFee(nonAdmin, expectedReward, "lost txFee, got back reward")
			.stopWatching()
				.assertOnlyEvent(pac, "AuctionStarted", {
					time: null,
					index: index,
					addr: ()=>auction.address
				})
				.assertOnlyEvent(paf, "AuctionCreated", {
					time: null,
			        addr: ()=>auction.address,
			        collector: treasury.address,
			        initialPrize: DEFS[index][1],
			        bidPrice: DEFS[index][2],
			        bidFeePct: DEFS[index][3],
			        bidAddBlocks: DEFS[index][4],
			        initialBlocks: DEFS[index][5]
				})
				.assertOnlyEvent(treasury, "FundSuccess", {
					time: null,
					recipient: mainController.address,
					note: ".startPennyAuction()",
					value: expectedReward.plus(initialPrize)
				})
			.start();
	}

	async function refreshAuctions(){
		const expectedFees = await pac.getAvailableFees();
		const expectedEnded = await pac.getNumEndedAuctions();
		const expectedReward = await mainController.getRefreshPennyAuctionsReward();
		const callParams = [mainController, "refreshPennyAuctions", {from: nonAdmin}]
		const tester = createDefaultTxTester()
			.startLedger([treasury, nonAdmin])
			.startWatching([treasury, pac])
			.doTx(callParams)
			.assertSuccess()
				.assertLogCount(1)
				.assertLog("RewardPaid", {
					time: null,
					recipient: nonAdmin,
					note: "Called .refreshPennyAuctions()",
					amount: expectedReward
				})
			.stopLedger()
				.assertDelta(treasury, expectedFees.minus(expectedReward), "Got fees, lost reward.")
				.assertDeltaMinusTxFee(nonAdmin, expectedReward, "Lost txFee, got reward.")
			.stopWatching()
				.assertEvent(treasury, "FundSuccess", {
					time: null,
					recipient: mainController.address,
					note: ".refreshPennyAuctions()",
					value: expectedReward
				});
			if (expectedFees.gt(0)) {
				tester.assertEvent(pac, "FeeCollectionSuccess", {
					time: null,
					amount: expectedFees
				})
			};
			if (expectedEnded.gt(0)) {
				tester.assertEvent(pac, "AuctionEnded");
			}

		return tester.start();
	}
	
});
