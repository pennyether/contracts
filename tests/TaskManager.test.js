const Registry = artifacts.require("Registry");
const TaskManager = artifacts.require("TaskManager");
const Treasury = artifacts.require("Treasury");
const MockComptroller = artifacts.require("MockComptroller");
const MonarchyController = artifacts.require("MonarchyController");
const MonarchyFactory = artifacts.require("MonarchyFactory");
const MonarchyGame = artifacts.require("MonarchyGame");
const TestBankrollable = artifacts.require("TestBankrollable");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const DEFAULT_DEF = {
    summary: "",
    initialPrize: new BigNumber(.01e16),
    fee: new BigNumber(.001e16),
    prizeIncr: new BigNumber(.0001e16),
    reignBlocks: new BigNumber(2),
    initialBlocks: new BigNumber(10),
    feeIncr: function(){
        return this.fee.minus(this.prizeIncr)
    },
    toArr: function(){
        return [
            this.summary,
            this.initialPrize,
            this.fee,
            this.prizeIncr,
            this.reignBlocks,
            this.initialBlocks
        ];
    }
};

const DEF_1 = Object.assign({}, DEFAULT_DEF);
    DEF_1.summary = "1st Game";
const DEF_2 = Object.assign({}, DEFAULT_DEF);
    DEF_2.summary = "2nd Game (Invalid reignBlocks)";
    DEF_2.reignBlocks = new BigNumber(0);
const DEF_3 = Object.assign({}, DEFAULT_DEF);
    DEF_3.summary = "3rd Game (huge initialPrize)";
    DEF_3.initialPrize = new BigNumber(100e18);
const DEF_4 = Object.assign({}, DEFAULT_DEF);
    DEF_4.summary = "4th Game";
    DEF_4.initialBlocks = DEF_3.initialBlocks.plus(10);
const DEF_5 = Object.assign({}, DEFAULT_DEF);
    DEF_5.summary = "5th Game";
const DEFS = [null, DEF_1, DEF_2, DEF_3, DEF_4, DEF_5];

const ISSUE_DIVIDEND_REWARD_BIPS = new BigNumber(10);
const SEND_PROFITS_REWARD_BIPS = new BigNumber(50);
const MONARCHY_START_REWARD = new BigNumber(.001e18);
const MONARCHY_END_REWARD = new BigNumber(.001e18);

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
    var mockComptroller;
    var monarchyController;
    var monarchyFactory;
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

        this.logInfo("Create a MockComptroller pointing to Treasury and dummyToken");
        await createDefaultTxTester()
            .doNewTx(MockComptroller, [], {from: anon}).assertSuccess()
            .withTxResult(async function(res, plugins){
                mockComptroller = res.contract;
                await mockComptroller.setTreasury(treasury.address, {from: anon});
                await mockComptroller.setToken(dummyToken, {from: anon});
                plugins.addAddresses({mockComptroller: mockComptroller});
            }).start();

        this.logInfo("Create a MonarchyController, pointing to Registry.");
        await createDefaultTxTester()
            .doNewTx(MonarchyController, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((res, plugins)=>{
                monarchyController = res.contract;
                plugins.addAddresses({monarchyController: monarchyController.address});
            }).start();

        this.logInfo("Create a MonarchyFactory, pointing to Registry.");
        await createDefaultTxTester()
            .doNewTx(MonarchyFactory, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((res, plugins)=>{
                monarchyFactory = res.contract;
                plugins.addAddresses({monarchyFactory: monarchyFactory.address});
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
            .doTx([registry, "register", "MONARCHY_CONTROLLER", monarchyController.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "MONARCHY_FACTORY", monarchyFactory.address, {from: owner}])
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
                .assertCallReturns([taskManager, "getMonarchyController"], monarchyController.address)
                .assertCallReturns([taskManager, "getDailyLimit"], 1e18)
                .assertCallReturns([taskManager, "getDailyLimitUsed"], 0)
                .assertCallReturns([taskManager, "getDailyLimitRemaining"], 1e18)
                .assertCallReturns([monarchyController, "getMonarchyFactory"], monarchyFactory.address)
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
            it(".issueDividendReward() returns 0 (no comptroller set)", async function(){
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "issueDividendReward"], [0, 0])
                    .start();
            });
            it("Do Treasury.initComptroller()", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", mockComptroller.address, {from: owner}])
                    .assertSuccess()
                    .start();
            });
            it(".issueDividendReward() returns 0 (crowdsale not ended)", async function(){
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "issueDividendReward"], [0, 0])
                    .start();
            });
            it("End CrowdSale", function(){
                return createDefaultTxTester()
                    .doTx([mockComptroller, "endCrowdSale", {from: anon}])
                    .assertSuccess()
                    .start();
            })
            it(".issueDividendReward() works", async function(){
                const expProfits = await treasury.profits();
                const expReward = expProfits.mul(ISSUE_DIVIDEND_REWARD_BIPS).div(10000);
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "issueDividendReward"], [expReward, expProfits])
                    .start();
            });
            it(".doIssueDividend works", async function(){
                const expProfits = await treasury.profits();
                const expReward = expProfits.mul(ISSUE_DIVIDEND_REWARD_BIPS).div(10000);
                const prevTotalRewarded = await taskManager.totalRewarded();
                const prevDlUsed = await taskManager.getDailyLimitUsed();
                const prevDlRemaining = await taskManager.getDailyLimitRemaining();
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
                    .assertCallReturns([taskManager, "issueDividendReward"], [0,0])
                    .assertCallReturns([taskManager, "totalRewarded"], prevTotalRewarded.plus(expReward))
                    .assertCallReturns([taskManager, "getDailyLimitUsed"], prevDlUsed.plus(expReward))
                    .assertCallReturns([taskManager, "getDailyLimitRemaining"], prevDlRemaining.minus(expReward))
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
                const prevDlUsed = await taskManager.getDailyLimitUsed();
                const prevDlRemaining = await taskManager.getDailyLimitRemaining();
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
                    .assertCallReturns([taskManager, "getDailyLimitUsed"], prevDlUsed.plus(expReward))
                    .assertCallReturns([taskManager, "getDailyLimitRemaining"], prevDlRemaining.minus(expReward))
                    .start();
            });
        });
    });

    describe("Monarchy Rewards", function(){
        describe("Set up PAC (fund it, and enable)", function(){
            it("Set up and enable defined games.", function(){
                return createDefaultTxTester()
                    .doTx([monarchyController, "editDefinedGame", 1].concat(DEF_1.toArr(), {from: admin})).assertSuccess()
                    .doTx([monarchyController, "editDefinedGame", 2].concat(DEF_2.toArr(), {from: admin})).assertSuccess()
                    .doTx([monarchyController, "editDefinedGame", 3].concat(DEF_3.toArr(), {from: admin})).assertSuccess()
                    .doTx([monarchyController, "editDefinedGame", 4].concat(DEF_4.toArr(), {from: admin})).assertSuccess()
                    .doTx([monarchyController, "editDefinedGame", 5].concat(DEF_5.toArr(), {from: admin})).assertSuccess()
                    .doTx([monarchyController, "enableDefinedGame", 0, true, {from: admin}]).assertSuccess()
                    .doTx([monarchyController, "enableDefinedGame", 1, true, {from: admin}]).assertSuccess()
                    .doTx([monarchyController, "enableDefinedGame", 2, true, {from: admin}]).assertSuccess()
                    .doTx([monarchyController, "enableDefinedGame", 3, true, {from: admin}]).assertSuccess()
                    .assertCallReturns([monarchyController, "numDefinedGames"], 5)
                    .start();
            });
            it("Fund MonarchyController, so it can start games", function(){
                return createDefaultTxTester()
                    .doTx([monarchyController, "addBankroll", {from: anon, value: 1e16}])
                    .assertSuccess()
                    .assertCallReturns([monarchyController, "bankrollAvailable"], 1e16)
                    .start();
            });
        });
        describe(".setMonarchyRewards()", function(){
            it("Not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([taskManager, "setMonarchyRewards", MONARCHY_START_REWARD, MONARCHY_END_REWARD, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works when called by admin", function(){
                return createDefaultTxTester()
                    .doTx([taskManager, "setMonarchyRewards", MONARCHY_START_REWARD, MONARCHY_END_REWARD, {from: admin}])
                    .assertSuccess()
                        .assertOnlyLog("MonarchyRewardsChanged", {
                            time: null,
                            admin: admin,
                            startReward: MONARCHY_START_REWARD,
                            endReward: MONARCHY_END_REWARD
                        })
                    .assertCallReturns([taskManager, "monarchyStartReward"], MONARCHY_START_REWARD)
                    .assertCallReturns([taskManager, "monarchyEndReward"], MONARCHY_END_REWARD)
                    .start();
            });
            it("Values above 1 Ether not allowed", function(){
                return createDefaultTxTester()
                    .doTx([taskManager, "setMonarchyRewards", MONARCHY_START_REWARD, 1.01e18, {from: admin}])
                    .assertInvalidOpCode()
                    .doTx([taskManager, "setMonarchyRewards", 1.01e18, MONARCHY_END_REWARD, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
        });
        describe(".startMonarchyGameReward() and .startMonarchyGame()", function(){
            it(".startMonarchyGameReward() returns [reward, 0]", function(){
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "startMonarchyGameReward"], [MONARCHY_START_REWARD, 1])
                    .start();
            });
            it(".startMonarchyGame() errors on invalid index", function(){
                return assertCannotStartMonarchyGame(6);
            });
            it(".startMonarchyGame() errors if too expensive", function(){
                return assertCannotStartMonarchyGame(3);
            });
            it(".startMonarchyGame() errors if not enabled", function(){
                return assertCannotStartMonarchyGame(5);
            });
            it(".startMonarchyGame() works", function(){
                return assertCanStartMonarchyGame(1);
            });
            it(".startMonarchyGameReward() now returns [reward, 2]", function(){
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "startMonarchyGameReward"], [MONARCHY_START_REWARD, 2])
                    .start();
            });
        });
        describe(".refreshMonarchyGames() and .refreshMonarchyGamesReward()", async function(){
            const game1 = MonarchyGame.at(await monarchyController.getGame(1));

            it(".refreshMonarchyGamesReward() returns 0", function(){
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "refreshMonarchyGamesReward"], [0, 0])
                    .start();
            });
            it("Do some overthrows, end game #1", async function(){
                await game1.sendTransaction({from: bidder1, value: DEF_1.fee});
                await game1.sendTransaction({from: bidder2, value: DEF_1.fee});
                const blocksLeft = await game1.getBlocksRemaining();
                await testUtil.mineBlocks(blocksLeft);
            });
            it(".refreshMonarchyGamesReward() returns correct amount", function(){
                return createDefaultTxTester()
                    .assertCallReturns([taskManager, "refreshMonarchyGamesReward"], [MONARCHY_END_REWARD, 1])
                    .start();
            });
            it(".refreshMonarchyGames() ends game1", async function(){
                const expPrize = await game1.prize();
                return createDefaultTxTester()
                    .startLedger([taskManager, anon, bidder2])
                    .startWatching([game1])
                    .doTx([taskManager, "refreshMonarchyGames", {from: anon}])
                    .assertSuccess()
                        .assertLogCount(2)
                        .assertLog("MonarchyGamesRefreshed", {
                            time: null,
                            numEnded: 1,
                            feesCollected: DEF_1.feeIncr().mul(2)
                        })
                        .assertLog("RewardSuccess", {
                            time: null,
                            caller: anon,
                            reward: MONARCHY_END_REWARD
                        })
                    .stopWatching()
                        .assertEvent(game1, "SendPrizeSuccess")
                        .assertEvent(game1, "FeesSent")
                    .stopLedger()
                        .assertDelta(taskManager, MONARCHY_END_REWARD.mul(-1))
                        .assertDeltaMinusTxFee(anon, MONARCHY_END_REWARD)
                        .assertDelta(bidder2, expPrize)
                    .assertCallReturns([taskManager, "refreshMonarchyGamesReward"], [0, 0])
                    .start();
            });
        });
    });

    async function assertCannotStartMonarchyGame(index) {
        const prevGame = await monarchyController.getGame(index);
        const prevDlUsed = await monarchyController.getDailyLimitUsed();
        const prevDlRemaining = await monarchyController.getDailyLimitRemaining();
        return createDefaultTxTester()
            .startLedger([taskManager])
            .doTx([taskManager, "startMonarchyGame", index, {from: anon}])
            .assertSuccess()
                .assertOnlyLog("TaskError", {msg: "Game is not currently startable."})
            .stopLedger()
                .assertNoDelta(taskManager)
            .assertCallReturns([monarchyController, "getGame", index], prevGame)
            .assertCallReturns([monarchyController, "getDailyLimitUsed"], prevDlUsed)
            .assertCallReturns([monarchyController, "getDailyLimitRemaining"], prevDlRemaining)
            .start();
    }

    async function assertCanStartMonarchyGame(index) {
        const prevDlUsed = await taskManager.getDailyLimitUsed();
        const prevDlRemaining = await taskManager.getDailyLimitRemaining();
        return createDefaultTxTester()
            .startLedger([anon, taskManager])
            .doTx([taskManager, "startMonarchyGame", index, {from: anon}])
            .assertSuccess()
                .assertLogCount(2)
                .assertLog("MonarchyGameStarted", {
                    time: null,
                    addr: null,
                    initialPrize: DEFS[index].initialPrize
                })
                .assertLog("RewardSuccess", {
                    time: null,
                    caller: anon,
                    reward: MONARCHY_START_REWARD
                })
            .stopLedger()
                .assertDeltaMinusTxFee(anon, MONARCHY_START_REWARD)
                .assertDelta(taskManager, MONARCHY_START_REWARD.mul(-1))
            .assertCallReturns([monarchyController, "getGame", index], {not: NO_ADDRESS})
            .assertCallReturns([taskManager, "getDailyLimitUsed"], prevDlUsed.plus(MONARCHY_START_REWARD))
            .assertCallReturns([taskManager, "getDailyLimitRemaining"], prevDlRemaining.minus(MONARCHY_START_REWARD))
            .start();
    }
});
