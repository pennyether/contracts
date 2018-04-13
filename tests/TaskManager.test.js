const Registry = artifacts.require("Registry");
const TaskManager = artifacts.require("TaskManager");
const Treasury = artifacts.require("Treasury");
const PennyAuctionController = artifacts.require("PennyAuctionController");
const PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
const PennyAuction = artifacts.require("PennyAuction");
const TestBankrollable = artifacts.require("TestBankrollable");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const DEFAULT_DEF = {
    summary: "",
    initialPrize: new BigNumber(.01e16),
    bidPrice: new BigNumber(.001e16),
    bidIncr: new BigNumber(.0001e16),
    bidAddBlocks: new BigNumber(2),
    initialBlocks: new BigNumber(10),
    feeIncr: function(){
        return this.bidPrice.minus(this.bidIncr)
    },
    toArr: function(){
        return [
            this.summary,
            this.initialPrize,
            this.bidPrice,
            this.bidIncr,
            this.bidAddBlocks,
            this.initialBlocks
        ];
    }
};

const DEF_0 = Object.assign({}, DEFAULT_DEF);
	DEF_0.summary = "0th Auction";
const DEF_1 = Object.assign({}, DEFAULT_DEF);
	DEF_1.summary = "1st Auction (Invalid BID_ADD_BLOCKS_1)";
	DEF_1.bidAddBlocks = new BigNumber(0);
const DEF_2 = Object.assign({}, DEFAULT_DEF);
	DEF_2.summary = "2nd auction (huge initialPrize)";
	DEF_2.initialPrize = new BigNumber(100e18);
const DEF_3 = Object.assign({}, DEFAULT_DEF);
	DEF_3.summary = "3rd auction";
	DEF_3.initialBlocks = DEF_3.initialBlocks.plus(10);
const DEF_4 = Object.assign({}, DEFAULT_DEF);
	DEF_4.summary = "4th auction";
const DEFS = [DEF_0, DEF_1, DEF_2, DEF_3, DEF_4];

const ISSUE_DIVIDEND_REWARD_BIPS = new BigNumber(10);
const SEND_PROFITS_REWARD_BIPS = new BigNumber(50);
const PA_START_REWARD = new BigNumber(.001e18);
const PA_END_REWARD = new BigNumber(.001e18);

const accounts = web3.eth.accounts;

describe("MainController", function(){
	const owner = accounts[1];
	const admin = accounts[2];
	const bidder1 = accounts[3];
	const bidder2 = accounts[4];
	const anon = accounts[5];
	const dummyToken = accounts[6];
	const NO_ADDRESS = "0x0000000000000000000000000000000000000000";

	var registry;
	var taskManager;
	var treasury;
	var pac;
	var paf;
	var bankrollable;

	before("Set it all up", async function(){
		const addresses = {
            owner: owner,
        	admin: admin,
        	bidder1: bidder1,
        	bidder2: bidder2,
        	anon: anon,
        	dummyToken: dummyToken,
        	NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a Registry.");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((res, plugins)=>{
                registry = res.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();

        this.logInfo("Create a TaskManager.");
        await createDefaultTxTester()
            .doNewTx(TaskManager, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((res, plugins)=>{
                taskManager = res.contract;
                plugins.addAddresses({taskManager: taskManager.address});
            }).start();

        this.logInfo("Create a Treasury")
        await createDefaultTxTester()
        	.doNewTx(Treasury, [registry.address, owner], {from: anon}).assertSuccess()
        	.withTxResult((res, plugins)=>{
        		treasury = res.contract;
        		plugins.addAddresses({treasury: treasury.address});
        	}).start();

        this.logInfo("Create a PennyAuctionController, pointing to Registry.");
        await createDefaultTxTester()
            .doNewTx(PennyAuctionController, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((res, plugins)=>{
                pac = res.contract;
                plugins.addAddresses({pac: pac.address});
            }).start();

        this.logInfo("Create a PennyAuctionFactory, pointing to Registry.");
        await createDefaultTxTester()
            .doNewTx(PennyAuctionFactory, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((res, plugins)=>{
                paf = res.contract;
                plugins.addAddresses({paf: paf.address});
            }).start();

        this.logInfo("Create a Bankrollable");
        await createDefaultTxTester()
        	.doNewTx(TestBankrollable, [registry.address], {from: anon}).assertSuccess()
        	.withTxResult((res, plugins)=>{
        		bankrollable = res.contract;
        		plugins.addAddresses({bankrollable: bankrollable.address});
        	}).start();

	    this.logInfo("Register ADMIN, TREASURY, PAC, and PAF");
        await createDefaultTxTester()
	        .doTx([registry, "register", "ADMIN", admin, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "TREASURY", treasury.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", pac.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "PENNY_AUCTION_FACTORY", paf.address, {from: owner}])
                .assertSuccess()
	        .start();

		// print addresses
        await createDefaultTxTester().printNamedAddresses().start();
	});

	describe("Initialization", function(){
		it("call .addBankroll() to add funds", function(){
			return createDefaultTxTester()
				.doTx([taskManager, "addBankroll", {value: 1e16, from: anon}])
				.assertSuccess()
				.start();
		});
		it("Has correct state", function(){
			return createDefaultTxTester()
				.assertCallReturns([taskManager, "getAdmin"], admin)
		        .assertCallReturns([taskManager, "getTreasury"], treasury.address)
		        .assertCallReturns([taskManager, "getPennyAuctionController"], pac.address)
		        .assertCallReturns([taskManager, "getDailyLimit"], 1e18)
		        .assertCallReturns([taskManager, "getDailyLimitUsed"], 0)
		        .assertCallReturns([taskManager, "getDailyLimitRemaining"], 1e18)
		        .assertCallReturns([pac, "getPennyAuctionFactory"], paf.address)
		        .assertBalance(taskManager, 1e16)
		        .start();
		});
	});

	describe("Send Dividends Rewards", function(){
		describe(".setIssueDividendReward()", function(){
			it("Not callable by non-admin", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setIssueDividendReward", ISSUE_DIVIDEND_REWARD_BIPS, {from: anon}])
					.assertInvalidOpCode()
					.start();
			});
			it("Works when called from admin", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setIssueDividendReward", ISSUE_DIVIDEND_REWARD_BIPS, {from: admin}])
					.assertSuccess()
					.assertOnlyLog("IssueDividendRewardChanged", {
						time: null,
						admin: admin,
						newValue: ISSUE_DIVIDEND_REWARD_BIPS
					})
					.assertCallReturns([taskManager, "issueDividendRewardBips"], ISSUE_DIVIDEND_REWARD_BIPS)
					.start();
			});
			it("Cannot be changed above 10", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setIssueDividendReward", 11, {from: admin}])
					.assertInvalidOpCode()
					.start();
			});
		});
		describe(".doIssueDividend() and .issueDividendReward()", function(){
			it(".issueDividendReward() returns 0", function(){
				return createDefaultTxTester()
					.assertCallReturns([treasury, "profits"], 0)
					.assertCallReturns([taskManager, "issueDividendReward"], [0, 0])
					.start();
			});
			it(".doIssueDividend() returns error", function(){
				return createDefaultTxTester()
					.startLedger([taskManager, anon])
					.doTx([taskManager, "doIssueDividend", {from: anon}])
					.assertSuccess()
						.assertOnlyLog("TaskError", {msg: "No profits to send."})
					.stopLedger()
						.assertNoDelta(taskManager)
						.assertLostTxFee(anon)
					.start();
			})
			it("Give treasury profits", function(){
				return createDefaultTxTester()
					.doTx([treasury, "sendTransaction", {value: 1e12, from: anon}])
					.assertSuccess()
					.assertCallReturns([treasury, "profits"], 1e12)
					.start();
			});
			it(".issueDividendReward() returns correct value", async function(){
				const expProfits = await treasury.profits();
				const expReward = expProfits.mul(ISSUE_DIVIDEND_REWARD_BIPS).div(10000);
				return createDefaultTxTester()
					.assertCallReturns([taskManager, "issueDividendReward"], [expReward, expProfits])
					.start();
			});
			it(".doIssueDividend() works when Treasury sends 0", async function(){
				this.logInfo("Note: The Treasury will fail to send profits, since no token is specified.")
				return createDefaultTxTester()
					.assertCallReturns([treasury, "token"], NO_ADDRESS)
					.startLedger([taskManager, anon, treasury])
					.doTx([taskManager, "doIssueDividend", {from: anon}])
					.assertSuccess()
						.assertOnlyLog("TaskError", {msg: "No profits were sent."})
					.stopLedger()
						.assertNoDelta(treasury)
						.assertNoDelta(taskManager)
						.assertLostTxFee(anon)
					.start();
			});
			it("Set treasury Token, so dividends can be sent.", async function(){
				return createDefaultTxTester()
					.doTx([treasury, "initToken", dummyToken, {from: owner}])
					.assertSuccess()
					.assertCallReturns([treasury, "token"], dummyToken)
					.start();
			});
			it(".doIssueDividend works", async function(){
				const expProfits = await treasury.profits();
				const expReward = expProfits.mul(ISSUE_DIVIDEND_REWARD_BIPS).div(10000);
				return createDefaultTxTester()
					.startLedger([taskManager, anon, treasury, dummyToken])
					.doTx([taskManager, "doIssueDividend", {from: anon}])
					.assertSuccess()
						.assertLogCount(2)
						.assertLog("IssueDividendSuccess", {
							treasury: treasury.address,
							profitsSent: expProfits
						})
						.assertLog("RewardSuccess", {
							caller: anon,
							reward: expReward
						})
					.stopLedger()
						.assertDelta(treasury, expProfits.mul(-1))
						.assertDelta(dummyToken, expProfits)
						.assertDelta(taskManager, expReward.mul(-1))
						.assertDeltaMinusTxFee(anon, expReward)
					.start();
			});
		});
	});

	describe("Bankrollable Rewards", function(){
		this.logInfo("Here we use the `bankrollable` instance to test rewarding.");
		describe(".setSendProfitsReward()", function(){
			it("Not callable by non-admin", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setSendProfitsReward", SEND_PROFITS_REWARD_BIPS, {from: anon}])
					.assertInvalidOpCode()
					.start();
			});
			it("Works when called from admin", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setSendProfitsReward", SEND_PROFITS_REWARD_BIPS, {from: admin}])
					.assertSuccess()
					//event SendProfitsRewardChanged(uint time, address indexed admin, uint newValue);
					.assertOnlyLog("SendProfitsRewardChanged", {
						time: null,
						admin: admin,
						newValue: SEND_PROFITS_REWARD_BIPS
					})
					.assertCallReturns([taskManager, "sendProfitsRewardBips"], SEND_PROFITS_REWARD_BIPS)
					.start();
			});
			it("Cannot be changed above 100", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setSendProfitsReward", 101, {from: admin}])
					.assertInvalidOpCode()
					.start();
			});
		});
		describe(".doSendProfits() and .sendProfitsReward()", function(){
			it(".sendProfitsReward() returns 0", function(){
				return createDefaultTxTester()
					.assertCallReturns([bankrollable, "profits"], 0)
					.assertCallReturns([taskManager, "sendProfitsReward", bankrollable.address], [0, 0])
					.start();
			});
			it(".doSendProfits() returns error", function(){
				return createDefaultTxTester()
					.startLedger([taskManager, anon])
					.doTx([taskManager, "doSendProfits", bankrollable.address, {from: anon}])
					.assertSuccess()
						.assertOnlyLog("TaskError", {msg: "No profits were sent."})
					.stopLedger()
						.assertNoDelta(taskManager)
						.assertLostTxFee(anon)
					.start();
			})
			it("Give bankrollable profits", function(){
				return createDefaultTxTester()
					.doTx([bankrollable, "receive", {value: 1e12, from: anon}])
					.assertSuccess()
					.assertCallReturns([bankrollable, "profits"], 1e12)
					.start();
			});
			it(".sendProfitsReward() returns correct value", async function(){
				const expProfits = await bankrollable.profits();
				const expReward = expProfits.mul(SEND_PROFITS_REWARD_BIPS).div(10000);
				return createDefaultTxTester()
					.assertCallReturns([taskManager, "sendProfitsReward", bankrollable.address], [expReward, expProfits])
					.start();
			});
			it(".doSendProfits() works", async function(){
				const expProfits = await bankrollable.profits();
				const expReward = expProfits.mul(SEND_PROFITS_REWARD_BIPS).div(10000);
				const prevTotalRewarded = await taskManager.totalRewarded();
				return createDefaultTxTester()
					.startLedger([taskManager, anon, treasury])
					.doTx([taskManager, "doSendProfits", bankrollable.address, {from: anon}])
					.assertSuccess()
						.assertLogCount(2)
						.assertLog("SendProfitsSuccess", {
							time: null,
							bankrollable: bankrollable.address,
							profitsSent: expProfits
						})
						.assertLog("RewardSuccess", {
							time: null,
							caller: anon,
							reward: expReward
						})
					.stopLedger()
						.assertDelta(taskManager, expReward.mul(-1))
						.assertDelta(treasury, expProfits)
						.assertDeltaMinusTxFee(anon, expReward)
					.assertCallReturns([taskManager, "sendProfitsReward", bankrollable.address], [0,0])
					.assertCallReturns([taskManager, "totalRewarded"], prevTotalRewarded.plus(expReward))
					.start();
			});
		});
	});

	//event PennyAuctionStarted(uint time, address indexed auctionAddr, uint initialPrize);
	//event PennyAuctionsRefreshed(uint time, uint numEnded, uint feesCollected);
	describe("PennyAuction Rewards", function(){
		describe("Set up PAC (fund it, and enable)", function(){
			it("Set up and enable defined auctions.", function(){
		    	return createDefaultTxTester()
		        	.doTx([pac, "editDefinedAuction", 0].concat(DEF_0.toArr(), {from: admin})).assertSuccess()
		        	.doTx([pac, "editDefinedAuction", 1].concat(DEF_1.toArr(), {from: admin})).assertSuccess()
		        	.doTx([pac, "editDefinedAuction", 2].concat(DEF_2.toArr(), {from: admin})).assertSuccess()
		        	.doTx([pac, "editDefinedAuction", 3].concat(DEF_3.toArr(), {from: admin})).assertSuccess()
		        	.doTx([pac, "editDefinedAuction", 4].concat(DEF_4.toArr(), {from: admin})).assertSuccess()
		        	.doTx([pac, "enableDefinedAuction", 0, {from: admin}]).assertSuccess()
		        	.doTx([pac, "enableDefinedAuction", 1, {from: admin}]).assertSuccess()
		        	.doTx([pac, "enableDefinedAuction", 2, {from: admin}]).assertSuccess()
		        	.doTx([pac, "enableDefinedAuction", 3, {from: admin}]).assertSuccess()
		        	.assertCallReturns([pac, "numDefinedAuctions"], 5)
		        	.start();
			});
			it("Fund PAC, so it can start auctions", function(){
				return createDefaultTxTester()
					.doTx([pac, "addBankroll", {from: anon, value: 1e16}])
					.assertSuccess()
					.assertCallReturns([pac, "bankrollAvailable"], 1e16)
					.start();
			});
		});
		describe(".setPaRewards()", function(){
			it("Not callable by anon", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setPaRewards", PA_START_REWARD, PA_END_REWARD, {from: anon}])
					.assertInvalidOpCode()
					.start();
			});
			it("Works when called by admin", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setPaRewards", PA_START_REWARD, PA_END_REWARD, {from: admin}])
					.assertSuccess()
						.assertOnlyLog("PennyAuctionRewardsChanged", {
							time: null,
							admin: admin,
							paStartReward: PA_START_REWARD,
							paEndReward: PA_END_REWARD
						})
					.assertCallReturns([taskManager, "paStartReward"], PA_START_REWARD)
					.assertCallReturns([taskManager, "paEndReward"], PA_END_REWARD)
					.start();
			});
			it("Values above 1 Ether not allowed", function(){
				return createDefaultTxTester()
					.doTx([taskManager, "setPaRewards", PA_START_REWARD, 1.01e18, {from: admin}])
					.assertInvalidOpCode()
					.doTx([taskManager, "setPaRewards", 1.01e18, PA_END_REWARD, {from: admin}])
					.assertInvalidOpCode()
					.start();
			});
		});
		describe(".startPennyAuctionReward() and .startPennyAuction()", function(){
			it(".startPennyAuctionReward() returns [reward, 0]", function(){
				return createDefaultTxTester()
					.assertCallReturns([taskManager, "startPennyAuctionReward"], [PA_START_REWARD, 0])
					.start();
			});
			it(".startPennyAuction() errors on invalid index", function(){
				return assertCannotStartPa(5);
			});
			it(".startPennyAuction() errors if too expensive", function(){
				return assertCannotStartPa(2);
			});
			it(".startPennyAuction() errors if not enabled", function(){
				return assertCannotStartPa(4);
			});
			it(".startPennyAuction() works", function(){
				return assertCanStartPa(0);
			});
			it(".startPennyAuctionReward() now returns [reward, 1]", function(){
				return createDefaultTxTester()
					.assertCallReturns([taskManager, "startPennyAuctionReward"], [PA_START_REWARD, 1])
					.start();
			});
		});
		describe(".refreshPennyAuctions() and .refreshPennyAuctionsReward()", async function(){
			const auction0 = PennyAuction.at(await pac.getAuction(0));

			it(".refreshPennyAuctionsReward() returns 0", function(){
				return createDefaultTxTester()
					.assertCallReturns([taskManager, "refreshPennyAuctionsReward"], [0, 0])
					.start();
			});
			it("Place bids, and end PennyAuction #1", async function(){
				await auction0.sendTransaction({from: bidder1, value: DEF_0.bidPrice});
            	await auction0.sendTransaction({from: bidder2, value: DEF_0.bidPrice});
            	const blocksLeft = await auction0.getBlocksRemaining();
            	await testUtil.mineBlocks(blocksLeft);
			});
			it(".refreshPennyAuctionsReward() returns correct amount", function(){
				return createDefaultTxTester()
					.assertCallReturns([taskManager, "refreshPennyAuctionsReward"], [PA_END_REWARD, 1])
					.start();
			});
			it(".refreshPennyAuctions() ends auction0", async function(){
				const expPrize = await auction0.prize();
				return createDefaultTxTester()
					.startLedger([taskManager, anon, bidder2])
					.startWatching([auction0])
					.doTx([taskManager, "refreshPennyAuctions", {from: anon}])
					.assertSuccess()
						.assertLogCount(2)
						.assertLog("PennyAuctionsRefreshed", {
							time: null,
							numEnded: 1,
							feesCollected: DEF_0.feeIncr().mul(2)
						})
						.assertLog("RewardSuccess", {
							time: null,
							caller: anon,
							reward: PA_END_REWARD
						})
					.stopWatching()
						.assertEvent(auction0, "SendPrizeSuccess")
						.assertEvent(auction0, "FeesSent")
					.stopLedger()
						.assertDelta(taskManager, PA_END_REWARD.mul(-1))
						.assertDeltaMinusTxFee(anon, PA_END_REWARD)
						.assertDelta(bidder2, expPrize)
					.assertCallReturns([taskManager, "refreshPennyAuctionsReward"], [0, 0])
					.start();
			});
		});
	});

	function assertCannotStartPa(index) {
		return createDefaultTxTester()
			.startLedger([taskManager])
			.doTx([taskManager, "startPennyAuction", index, {from: anon}])
			.assertSuccess()
				.assertOnlyLog("TaskError", {msg: "Auction is not currently startable."})
			.stopLedger()
				.assertNoDelta(taskManager)
			.start();
	}

	//event PennyAuctionStarted(uint time, address indexed auctionAddr, uint initialPrize);
	async function assertCanStartPa(index) {
		return createDefaultTxTester()
			.startLedger([anon, taskManager])
			.doTx([taskManager, "startPennyAuction", 0, {from: anon}])
			.assertSuccess()
				.assertLogCount(2)
				.assertLog("PennyAuctionStarted", {
					time: null,
					auctionAddr: null,
					initialPrize: DEFS[0].initialPrize
				})
				.assertLog("RewardSuccess", {
					time: null,
					caller: anon,
					reward: PA_START_REWARD
				})
			.stopLedger()
				.assertDeltaMinusTxFee(anon, PA_START_REWARD)
				.assertDelta(taskManager, PA_START_REWARD.mul(-1))
			.assertCallReturns([pac, "getAuction", index], {not: 0})
			.start();
	}
});
