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
    const admin = accounts[3];
    const nonAdmin = accounts[4];
    const nonMainController = accounts[5];
    var registry;
    var treasury;

    const DAILY_LIMIT = new BigNumber(1000000);
    const BANKROLL = new BigNumber(100000000);

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
            admin: admin,
            nonAdmin: nonAdmin,
            nonMainController: nonMainController
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
                .start();
        })
        itCannotFund(1, "Cannot fund.");
        itCannotDistribute("No funds to distribute.");
    });
    describe("Gets deposit", function(){
        itCanReceiveDeposit(10000);
        itCannotFund(1, "Cannot fund.");
        itCannotDistribute("No address to distribute to.");
    });
    describe("dailyFundLimit", function(){
        describe(".setDailyFundLimit() initialization", function(){
            it("Not callable by nonAdmin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: nonAdmin}])
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
            it("Not callable by nonAdmin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", newLimit, {from: nonAdmin}])
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
        describe("Setting token and bankroll", function(){
            describe(".setToken()", function(){
                it("Cannot be set from nonAdmin", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "setToken", dummyToken, {from: nonAdmin}])
                        .assertInvalidOpCode()
                        .start();
                });
                it("Can be set by admin", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "setToken", dummyToken, {from: admin}])
                        .assertSuccess()
                            .assertOnlyLog("TokenSet", {token: dummyToken})
                        .assertCallReturns([treasury, "token"], dummyToken)
                        .start();
                });
                it("Cannot be set again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "setToken", dummyToken, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                });
            });
            describe(".setBankroll()", function(){
                it("Cannot be set from nonAdmin", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "setBankroll", {from: nonAdmin, value: BANKROLL}])
                        .assertInvalidOpCode()
                        .start();
                });
                it("Cannot be set from admin", function(){
                   return createDefaultTxTester()
                        .doTx([treasury, "setBankroll", {from: admin, value: BANKROLL}])
                        .assertInvalidOpCode()
                        .start(); 
                });
                it("Can be set by token", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "setBankroll", {from: dummyToken, value: BANKROLL}])
                        .assertSuccess()
                            .assertOnlyLog("BankrollSet", {
                                sender: dummyToken,
                                amount: BANKROLL
                            })
                        .assertCallReturns([treasury, "bankroll"], BANKROLL)
                        .start();
                });
                it("Cannot be set again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "setBankroll", {from: dummyToken, value: BANKROLL}])
                        .assertInvalidOpCode()
                        .start();
                });
            })
        });
        describe(".distributeToToken()", function(){
            before("Has money to distribute", async function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "getAmountToDistribute"], {not: 0})
                    .start();
            })
            itCanDistribute();
            itCannotDistribute("No funds to distribute.");
        });
        describe(".dissolve()", function(){
            it("Cannot be called from nonAdmin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "dissolve", {from: nonAdmin}])
                    .assertInvalidOpCode()
                    .start();
            })
            it("Cannot be called from admin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "dissolve", {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            })
            it("Can be called by token", function(){
                const balance = testUtil.getBalance(treasury);
                return createDefaultTxTester()
                    .startLedger([dummyToken, treasury])
                    .doTx([treasury, "dissolve", {from: dummyToken}])
                    .assertSuccess()
                    .stopLedger()
                        .assertDeltaMinusTxFee(dummyToken, balance)
                        .assertDelta(treasury, balance.mul(-1))
                        .assertBalance(treasury, 0)
                    .assertCallReturns([treasury, "bankroll"], 0)
                    .assertCallReturns([treasury, "isDissolved"], true)
                    .start();
            })
            itCanReceiveDeposit(1000000);
            itCannotFund(100, "Cannot fund.");
            itCanDistribute();
        })
    });

    function itCanReceiveDeposit(amount){
        amount = new BigNumber(amount);
        it(`Can receive ${amount}`, async function(){
            const expectedAmtIn = (await treasury.amtIn()).plus(amount);
            return createDefaultTxTester()
                .startLedger([treasury, nonAdmin])
                .doTx([treasury, "sendTransaction", {value: amount, from: nonAdmin}])
                .assertSuccess()
                    .assertOnlyLog("DepositReceived", {time: null, sender: nonAdmin, amount: amount})
                .stopLedger()
                    .assertDeltaMinusTxFee(nonAdmin, amount.mul(-1))
                    .assertDelta(treasury, amount)
                .assertCallReturns([treasury, "amtIn"], expectedAmtIn)
                .start();
        })
    }
    async function itCanFund(amount) {
        amount = new BigNumber(amount);
        it(`Can fund ${amount}`, async function(){
            const NOTE = "Test reason.";
            const expectedAmtOut = (await treasury.amtOut()).plus(amount);
            return createDefaultTxTester()
                .assertCallReturns([treasury, "canFund", amount], true)
                .doTx([treasury, "refund", NOTE, {from: nonMainController, value: amount}])
                .assertInvalidOpCode()
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
                .assertCallReturns([treasury, "amtOut"], expectedAmtOut)
                .start();
        });    
    }
    function itCannotFund(amount, reason) {
        amount = new BigNumber(amount);
        it(`Cannot fund ${amount} (${reason})`, async function(){
            const NOTE = "Test reason.";
            const expectedAmtOut = await treasury.amtOut();
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
                .assertCallReturns([treasury, "amtOut"], expectedAmtOut)
                .assertCallReturns([treasury, "amtFundedToday"], expectedAmtFundedToday)
                .start();
        })
    }
    function itCanRefund(amount) {
        amount = new BigNumber(amount);
        it(`MainController can refund ${amount}`, async function(){
            const NOTE = "Bla bla bla.";
            const expectedAmtIn = (await treasury.amtIn()).plus(amount);
            const expectedAmtFundedToday = (await treasury.amtFundedToday()).minus(amount);
            return createDefaultTxTester()
                .startLedger([treasury, dummyMainController])
                .doTx([treasury, "refund", NOTE, {from: dummyMainController, value: amount}])
                .assertSuccess()
                    .assertOnlyLog("RefundReceived", {
                        note: NOTE,
                        sender: dummyMainController,
                        value: amount
                    })
                .stopLedger()
                    .assertDelta(treasury, amount)
                    .assertDeltaMinusTxFee(dummyMainController, amount.mul(-1))
                .assertCallReturns([treasury, "amtIn"], expectedAmtIn)
                .assertCallReturns([treasury, "amtFundedToday"], expectedAmtFundedToday)
                .start();
        });
    }
    async function itCanDistribute() {
        it(`Can distribute to token`, async function(){
            const surplus = testUtil.getBalance(treasury).minus(await treasury.bankroll());
            const expectedReward = surplus.div(await treasury.distributeRewardDenom()).floor();
            const expectedToDistribute = surplus.minus(expectedReward);
            const prevAmtOut = await treasury.amtOut();
            const prevAmtDistributed = await treasury.amtDistributed()
            return createDefaultTxTester()
                .assertCallReturns([treasury, "getAmountToDistribute"], surplus)
                .startLedger([nonAdmin, treasury, dummyToken])
                .doTx([treasury, "distributeToToken", {from: nonAdmin}])
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("DistributeSuccess", {
                        token: dummyToken,
                        amount: expectedToDistribute
                    })
                    .assertLog("RewardPaid", {
                        recipient: nonAdmin,
                        note: "Called .distrubuteToToken()",
                        amount: expectedReward
                    })
                .stopLedger()
                    .assertDelta(dummyToken, expectedToDistribute)
                    .assertDelta(treasury, surplus.mul(-1))
                    .assertDeltaMinusTxFee(nonAdmin, expectedReward)
                .assertCallReturns([treasury, "amtDistributed"],
                    prevAmtDistributed.plus(expectedToDistribute))
                .assertCallReturns([treasury, "amtOut"],
                    prevAmtOut.plus(surplus))
                .start()
        });
    }
    async function itCannotDistribute(msg) {
        it(`Cannot distribute (${msg})`, async function(){
            const expectedAmtOut = await treasury.amtOut();
            const expectedAmtDistributed = await treasury.amtDistributed()
            return createDefaultTxTester()
                .assertCallReturns([treasury, "getAmountToDistribute"], 0)
                .assertCallReturns([treasury, "getDistributeReward"], 0)
                .startLedger([treasury, nonAdmin])
                .doTx([treasury, "distributeToToken", {from: nonAdmin}])
                .assertSuccess()
                    .assertOnlyLog("Error", {msg: msg})
                .stopLedger()
                    .assertNoDelta(treasury)
                    .assertLostTxFee(nonAdmin)
                .assertCallReturns([treasury, "amtOut"], expectedAmtOut)
                .assertCallReturns([treasury, "amtDistributed"], expectedAmtDistributed)
                .start();
        });
    }
});