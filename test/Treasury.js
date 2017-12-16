const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("Treasury");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('Treasury', function(){
    const accounts = web3.eth.accounts;
    const dummyMainController = accounts[1];
    const dummyToken = accounts[2];
    const dummyComptroller = accounts[3];
    const admin = accounts[4];
    const anyone = accounts[5];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    var registry;
    var treasury;

    const DAILY_LIMIT = new BigNumber(1000000);

    before("Set up registry and treasury", async function(){
        registry = await Registry.new();
        await registry.register("MAIN_CONTROLLER", dummyMainController);
        await registry.register("ADMIN", admin);
        treasury = await Treasury.new(registry.address);

        const addresses = {
            registry: registry.address,
            treasury: treasury.address,
            dummyToken: dummyToken,
            dummyMainController: dummyMainController,
            dummyComptroller: dummyComptroller,
            admin: admin,
            anyone: anyone,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Initially", function(){
        it("Should have correct mainController and admin", function(){
            return createDefaultTxTester()
                .assertBalance(treasury, 0)
                .assertCallReturns([treasury, "getMainController"], dummyMainController)
                .assertCallReturns([treasury, "getAdmin"], admin)
                .assertCallReturns([treasury, "token"], NO_ADDRESS)
                .assertCallReturns([treasury, "comptroller"], NO_ADDRESS)
                .start();
        });
        itCannotFund(1, "Cannot fund.");
        itCannotDistribute("No profit to distribute.");
    });
    describe("Gets deposit", function(){
        itCanReceiveDeposit(10000);
        itCannotFund(1, "Cannot fund.");
        itCannotDistribute("No address to distribute to.");
    });
    describe(".setDistributeReward()", function(){
        it("Not callable from anyone", function(){
            return createDefaultTxTester()
                .doTx([treasury, "setDistributeReward", 100, {from: anyone}])
                .assertInvalidOpCode()
                .start();
        });
        it("Must be >10", function(){
            return createDefaultTxTester()
                .doTx([treasury, "setDistributeReward", 9, {from: admin}])
                .assertInvalidOpCode()
                .start();
        });
        it("Works", function(){
            return createDefaultTxTester()
                .doTx([treasury, "setDistributeReward", 100, {from: admin}])
                .assertSuccess()
                    .assertOnlyLog("DistributeRewardChanged", {
                        sender: admin,
                        oldValue: 1000,
                        newValue: 100
                    })
                .assertCallReturns([treasury, "distributeRewardDenom"], 100)
                .start();
        });
    })
    describe("dailyFundLimit", function(){
        describe(".setDailyFundLimit() initialization", function(){
            it("Not callable by anyone", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: anyone}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Can be initialized", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: admin}])
                    .assertSuccess()
                        .assertOnlyLog("DailyFundLimitChanged", {
                            sender: admin,
                            oldValue: 0,
                            newValue: DAILY_LIMIT
                        })
                    .assertCallReturns([treasury, "dailyFundLimit"], DAILY_LIMIT)
                    .assertCallReturns([treasury, "dayDailyFundLimitChanged"], {not: 0})
                    .start();
            });
            it("Not callable in same day.", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
        });
        describe(".setDailyFundLimit() to change", function(){
            const newLimit = DAILY_LIMIT.mul(1.03);
            before("Ensure it is initialized, and fast forward a day.", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "dailyFundLimit"], DAILY_LIMIT)
                    .doFn(()=>{ testUtil.fastForward(60*60*24); })
                    .start();
            });
            it("Cannot change by >5%", function(){
                const limit = DAILY_LIMIT.mul(1.051);
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", limit, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Cannot change by <%5", function(){
                const limit = DAILY_LIMIT.mul(.949);
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", limit, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Not callable by anyone", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", newLimit, {from: anyone}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", newLimit, {from: admin}])
                    .assertSuccess()
                        .assertOnlyLog("DailyFundLimitChanged", {
                            sender: admin,
                            oldValue: DAILY_LIMIT,
                            newValue: newLimit
                        })
                    .assertCallReturns([treasury, "dailyFundLimit"], newLimit)
                    .assertCallReturns([treasury, "dayDailyFundLimitChanged"], {not: 0})
                    .start();
            });
            it("Not callable in same day.", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works the next day", async function(){
                await testUtil.fastForward(60*60*24);
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: admin}])
                    .assertSuccess()
                        .assertOnlyLog("DailyFundLimitChanged", {
                            sender: admin,
                            oldValue: newLimit,
                            newValue: DAILY_LIMIT
                        })
                    .assertCallReturns([treasury, "dailyFundLimit"], DAILY_LIMIT)
                    .assertCallReturns([treasury, "dayDailyFundLimitChanged"], {not: 0})
                    .start();
            });
        });
        describe("Test the daily limit", async function(){
            const firstAmount = DAILY_LIMIT.mul(.5);
            const secondAmount = DAILY_LIMIT.mul(.5).plus(1);
            before("Fund treasury", function(){
                itCanReceiveDeposit(DAILY_LIMIT.mul(2));    
            });
            itCanFund(firstAmount);
            itCannotFund(secondAmount, "Cannot fund.");
            itCanRefund(10);
            itCanFund(secondAmount);
            itCannotFund(10, "Cannot fund.");
            it("Fast forwards...", function(){
                return testUtil.fastForward(24*60*60);
            });
            itCannotFund(DAILY_LIMIT.plus(1), "Cannot fund.");
            itCanFund(DAILY_LIMIT);
            it("Correctly reset amtFundedToday", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "amtFundedToday"], DAILY_LIMIT)
                    .start();
            });
            itCannotFund(1, "Cannot fund.");
        });
        describe("Setting Comptroller and Token", function(){
            describe(".initComptroller()", function(){
                it("Cannot be set by anyone", async function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: anyone}])
                        .assertInvalidOpCode()
                        .start();
                })
                it("Works", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: admin}])
                        .assertSuccess()
                        .assertOnlyLog("ComptrollerSet")
                        .assertCallReturns([treasury, "comptroller"], dummyComptroller)
                        .start();
                });
                it("Cannot be set again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                });
            })
            describe(".initToken()", function(){
                it("Cannot be set from anyone", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: anyone}])
                        .assertInvalidOpCode()
                        .start();
                });
                it("Can be set by admin", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: admin}])
                        .assertSuccess()
                            .assertOnlyLog("TokenSet", {token: dummyToken})
                        .assertCallReturns([treasury, "token"], dummyToken)
                        .start();
                });
                it("Cannot be set again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                });
            });
        });
        describe(".addToBankroll()", function(){
            const BANKROLL_ADD = new BigNumber(1000000);
            before("has no bankroll", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "bankroll"], 0)
                    .start();
            });
            it("cannot be called from admin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "addToBankroll", {from: admin, value: BANKROLL_ADD}])
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Works correctly (from comptroller)", function(){
                const expectedDist = testUtil.getBalance(treasury);
                return createDefaultTxTester()
                    .doTx([treasury, "addToBankroll", {from: dummyComptroller, value: BANKROLL_ADD}])
                    .assertSuccess()
                        .assertOnlyLog("BankrollChanged", {
                            oldValue: 0,
                            newValue: BANKROLL_ADD
                        })
                    .assertCallReturns([treasury, "bankroll"], BANKROLL_ADD)
                    .assertCallReturns([treasury, "getAmountToDistribute"], expectedDist)
                    .start();
            });
        })
        describe(".removeFromBankroll()", function(){
            const BANKROLL_REMOVE = new BigNumber(400000);
            before("has a bankroll already", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "bankroll"], {not: 0})
                    .start();
            })
            it("Cannot be called from admin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "removeFromBankroll", BANKROLL_REMOVE, {from: admin}])
                    .assertInvalidOpCode()
                    .start(); 
            })
            it("Works correctly (from comptroller)", async function(){
                const balance = testUtil.getBalance(treasury);
                const prevBankroll = await treasury.bankroll();
                assert(balance.gt(BANKROLL_REMOVE));
                return createDefaultTxTester()
                    .startLedger([treasury, dummyComptroller])
                    .doTx([treasury, "removeFromBankroll", BANKROLL_REMOVE, {from: dummyComptroller}])
                    .assertSuccess()
                        .assertOnlyLog("BankrollChanged", {
                            oldValue: prevBankroll,
                            newValue: prevBankroll.minus(BANKROLL_REMOVE)
                        })
                    .stopLedger()
                        .assertDelta(treasury, BANKROLL_REMOVE.mul(-1))
                        .assertDeltaMinusTxFee(dummyComptroller, BANKROLL_REMOVE)
                    .start();
            });
            it("Cannot remove more bankroll than exists", async function(){
                const br = await treasury.bankroll();
                return createDefaultTxTester()
                    .doTx([treasury, "removeFromBankroll", br.plus(1), {from: dummyComptroller}])
                    .assertInvalidOpCode()
                    .start();
            });
        });
        describe(".removeFromBankroll cannot remove more than balance", async function(){
            before("Distribute, then fund a little so balance < bankroll", function(){
                itCanDistribute();
                it("Fast forwards...", function(){
                    return testUtil.fastForward(24*60*60);
                });
                itCanFund(DAILY_LIMIT.div(2));
            });
            it("Fails if it cannot afford to removeFromBankroll", async function(){
                const balance = testUtil.getBalance(treasury);
                const br = await treasury.bankroll();
                assert(br.gt(balance));
                return createDefaultTxTester()
                    .doTx([treasury, "removeFromBankroll", br, {from: dummyComptroller}])
                    .assertInvalidOpCode()
                    .start();
            })
        })
        describe(".distributeToToken()", function(){
            itCanReceiveDeposit(123456789);
            itCanDistribute();
            itCannotDistribute("No profit to distribute.");
        });
    });

    function itCanReceiveDeposit(amount){
        amount = new BigNumber(amount);
        it(`Can receive ${amount}`, async function(){
            const expectedRevenue = (await treasury.totalRevenue()).plus(amount);
            return createDefaultTxTester()
                .startLedger([treasury, anyone])
                .doTx([treasury, "sendTransaction", {value: amount, from: anyone}])
                .assertSuccess()
                    .assertOnlyLog("RevenueReceived", {time: null, sender: anyone, amount: amount})
                .stopLedger()
                    .assertDeltaMinusTxFee(anyone, amount.mul(-1))
                    .assertDelta(treasury, amount)
                .assertCallReturns([treasury, "totalRevenue"], expectedRevenue)
                .doFn(assertIsBalanced)
                .start();
        })
    }
    async function itCanFund(amount) {
        amount = new BigNumber(amount);
        it(`Can fund ${amount}`, async function(){
            const NOTE = "Test reason.";
            const expectedFunded = (await treasury.totalFunded()).plus(amount);
            return createDefaultTxTester()
                .assertCallReturns([treasury, "canFund", amount], true)
                .startLedger([treasury, dummyMainController])
                .doTx([treasury, "fundMainController", amount, NOTE, {from: dummyMainController}])
                .assertSuccess()
                    .assertOnlyLog("FundSuccess", {
                        time: null,
                        recipient: dummyMainController, 
                        note: NOTE,
                        value: amount
                    })
                .stopLedger()
                    .assertDeltaMinusTxFee(dummyMainController, amount)
                    .assertDelta(treasury, amount.mul(-1))
                .assertCallReturns([treasury, "totalFunded"], expectedFunded)
                .doFn(assertIsBalanced)
                .start();
        });    
    }
    function itCannotFund(amount, reason) {
        amount = new BigNumber(amount);
        it(`Cannot fund ${amount} (${reason})`, async function(){
            const NOTE = "Test reason.";
            const expectedFunded = await treasury.totalFunded();
            const expectedAmtFundedToday = await treasury.amtFundedToday();
            return createDefaultTxTester()
                .assertCallReturns([treasury, "canFund", amount], false)
                .startLedger([treasury, dummyMainController])
                .doTx([treasury, "fundMainController", amount, NOTE, {from: dummyMainController}])
                .assertSuccess()
                    .assertOnlyLog("FundFailure", {reason: reason})
                .stopLedger()
                    .assertNoDelta(treasury)
                    .assertLostTxFee(dummyMainController)
                .assertCallReturns([treasury, "totalFunded"], expectedFunded)
                .assertCallReturns([treasury, "amtFundedToday"], expectedAmtFundedToday)
                .doFn(assertIsBalanced)
                .start();
        })
    }
    function itCanRefund(amount) {
        amount = new BigNumber(amount);
        it(`MainController can refund ${amount}`, async function(){
            const NOTE = "Bla bla bla.";
            const expectedAmtFundedToday = (await treasury.amtFundedToday()).minus(amount);
            return createDefaultTxTester()
                .startLedger([treasury, dummyMainController])
                .doTx([treasury, "acceptRefund", NOTE, {from: dummyMainController, value: amount}])
                .assertSuccess()
                    .assertOnlyLog("RefundReceived", {
                        note: NOTE,
                        sender: dummyMainController,
                        value: amount
                    })
                .stopLedger()
                    .assertDelta(treasury, amount)
                    .assertDeltaMinusTxFee(dummyMainController, amount.mul(-1))
                .assertCallReturns([treasury, "amtFundedToday"], expectedAmtFundedToday)
                .doFn(assertIsBalanced)
                .start();
        });
    }
    async function itCanDistribute() {
        it(`Can distribute to token`, async function(){
            const surplus = testUtil.getBalance(treasury).minus(await treasury.bankroll());
            const expectedReward = surplus.div(await treasury.distributeRewardDenom()).floor();
            const expectedToDistribute = surplus.minus(expectedReward);
            const prevTotalDistributed = await treasury.totalDistributed()
            return createDefaultTxTester()
                .assertCallReturns([treasury, "getAmountToDistribute"], surplus)
                .startLedger([anyone, treasury, dummyToken])
                .doTx([treasury, "distributeToToken", {from: anyone}])
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("DistributeSuccess", {
                        token: dummyToken,
                        amount: expectedToDistribute
                    })
                    .assertLog("RewardPaid", {
                        recipient: anyone,
                        note: "Called .distrubuteToToken()",
                        amount: expectedReward
                    })
                .stopLedger()
                    .assertDelta(dummyToken, expectedToDistribute)
                    .assertDelta(treasury, surplus.mul(-1))
                    .assertDeltaMinusTxFee(anyone, expectedReward)
                .assertCallReturns([treasury, "totalDistributed"],
                    prevTotalDistributed.plus(expectedToDistribute))
                .doFn(assertIsBalanced)
                .start()
        });
    }
    async function itCannotDistribute(msg) {
        it(`Cannot distribute (${msg})`, async function(){
            const expectedTotalDistributed = await treasury.totalDistributed()
            return createDefaultTxTester()
                .assertCallReturns([treasury, "getAmountToDistribute"], 0)
                .assertCallReturns([treasury, "getDistributeReward"], 0)
                .startLedger([treasury, anyone])
                .doTx([treasury, "distributeToToken", {from: anyone}])
                .assertSuccess()
                    .assertOnlyLog("DistributeError", {msg: msg})
                .stopLedger()
                    .assertNoDelta(treasury)
                    .assertLostTxFee(anyone)
                .assertCallReturns([treasury, "totalDistributed"], expectedTotalDistributed)
                .doFn(assertIsBalanced)
                .start();
        });
    }
    async function assertIsBalanced() {
        const balance = testUtil.getBalance(treasury);
        const bankroll = await treasury.bankroll();
        const revenue = await treasury.totalRevenue();
        const funded = await treasury.totalFunded();
        const distributed = await treasury.totalDistributed();
        const rewarded = await treasury.totalRewarded();
        const amtIn = bankroll.plus(revenue);
        const amtOut = funded.plus(distributed).plus(rewarded);
        assert(balance.equals(amtIn.minus(amtOut)),
            `balance (${balance}), should be amtIn (${amtIn}) minus amtOut (${amtOut})`);
        console.log("✓ balance == (revenue + bankroll) - (funded + distributed + rewarded)");
    }
});