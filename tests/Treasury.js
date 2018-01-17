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
    const owner = accounts[4];
    const admin = accounts[5];
    const anon = accounts[6];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    var registry;
    var treasury;

    const DAILY_LIMIT = new BigNumber(1000000);

    before("Set up registry and treasury", async function(){
        const addresses = {
            dummyToken: dummyToken,
            dummyMainController: dummyMainController,
            dummyComptroller: dummyComptroller,
            owner: owner,
            admin: admin,
            anon: anon,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create Registry, and register MAIN_CONTROLLER and ADMIN");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register", "MAIN_CONTROLLER", dummyMainController, {from: owner}])
            .assertSuccess()
            .doTx([registry, "register", "ADMIN", admin, {from: owner}])
            .assertSuccess()
            .start();

        await createDefaultTxTester()
            .doNewTx(Treasury, [registry.address], {from: anon})
            .withTxResult((txRes, plugins)=>{
                treasury = txRes.contract;
                plugins.addAddresses({treasury: treasury});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Initially", function(){
        it("Should have correct mainController and admin", function(){
            return createDefaultTxTester()
                .assertBalance(treasury, 0)
                .assertCallReturns([treasury, "getMainController"], dummyMainController)
                .assertCallReturns([treasury, "getAdmin"], admin)
                .assertCallReturns([treasury, "token"], NO_ADDRESS)
                .assertCallReturns([treasury, "comptroller"], NO_ADDRESS)
                .assertCallReturns([treasury, "getOwner"], owner)
                .start();
        });
        itCannotFund(1, "Cannot fund.");
        itCannotDistribute("No address to distribute to.");
    });
    describe("On initialization", function(){
        this.logInfo("Treasury cannot fund if there is no daily limit.");
        this.logInfo("Treasury cannot distribute if there is no token set.");
        itCanReceiveDeposit(10000);
        itCannotFund(1, "Cannot fund.");
        itCannotDistribute("No address to distribute to.");
    });
    describe(".setDistributeReward()", function(){
        it("Not callable from anon", function(){
            return createDefaultTxTester()
                .doTx([treasury, "setDistributeReward", 100, {from: anon}])
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
        describe(".setDailyFundLimit() to initial value", function(){
            it("Not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it(`Can be initialized (to ${DAILY_LIMIT})`, function(){
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
        describe(".setDailyFundLimit() to a new value", function(){
            const newLimit = DAILY_LIMIT.mul(1.03);
            before("Ensure it is initialized, and fast forward a day.", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "dailyFundLimit"], DAILY_LIMIT)
                    .doFn(()=>{ testUtil.fastForward(60*60*24); })
                    .start();
            });
            it("Cannot be increased by >5%", function(){
                const limit = DAILY_LIMIT.mul(1.051);
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", limit, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Cannot be decreased by >%5", function(){
                const limit = DAILY_LIMIT.mul(.949);
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", limit, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "setDailyFundLimit", newLimit, {from: anon}])
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
            it(`Works the next day (reset dailyLimit to ${DAILY_LIMIT})`, async function(){
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
            before("Fund treasury with two times the daily limit.", function(){
                itCanReceiveDeposit(DAILY_LIMIT.mul(2));    
            });
            describe("Fund half the daily limit, then try the other half (plus one)", function(){
                itCanFund(firstAmount);
                itCannotFund(secondAmount, "Cannot fund.");    
            });
            describe("When a refund occurs, it credits the daily limit", function(){
                this.logInfo("Right now, Treasury has funded half the daily limit.");
                this.logInfo("After refunding 10 wei, Treasury should be able to fund the second half.")
                this.logInfo("However, it should not be able to fund an additional 10 wei.");
                itCanRefund(10);
                itCanFund(secondAmount);
                itCannotFund(10, "Cannot fund.");
            });
            it("Fast forwards to next day", function(){
                return testUtil.fastForward(24*60*60);
            });
            describe("Cannot fund the daily limit plus 1", function(){
                this.logInfo("Treasury should now able to fund the full daily limit, but not more.");
                itCannotFund(DAILY_LIMIT.plus(1), "Cannot fund.");
                itCanFund(DAILY_LIMIT);
                itCannotFund(1, "Cannot fund.");
            });
            
        });
        describe("Setting Comptroller and Token", function(){
            describe(".initComptroller()", function(){
                it("Cannot be set by anon", async function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: anon}])
                        .assertInvalidOpCode()
                        .start();
                })
                it("Cannot be set by admin", async function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                })
                it("Works", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: owner}])
                        .assertSuccess()
                        .assertOnlyLog("ComptrollerSet")
                        .assertCallReturns([treasury, "comptroller"], dummyComptroller)
                        .start();
                });
                it("Cannot be set again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initComptroller", dummyComptroller, {from: owner}])
                        .assertInvalidOpCode()
                        .start();
                });
            })
            describe(".initToken()", function(){
                it("Cannot be set from anon", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: anon}])
                        .assertInvalidOpCode()
                        .start();
                });
                it("Cannot be set from admin", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                });
                it("Can be set by owner", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: owner}])
                        .assertSuccess()
                            .assertOnlyLog("TokenSet", {token: dummyToken})
                        .assertCallReturns([treasury, "token"], dummyToken)
                        .start();
                });
                it("Cannot be set again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "initToken", dummyToken, {from: owner}])
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
            it("Works correctly (from comptroller)", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "addToBankroll", {from: dummyComptroller, value: BANKROLL_ADD}])
                    .assertSuccess()
                        .assertOnlyLog("BankrollChanged", {
                            oldValue: 0,
                            newValue: BANKROLL_ADD
                        })
                    .assertCallReturns([treasury, "bankroll"], BANKROLL_ADD)
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
            before("Distribute, then fund 14 * DAILY_LIMIT + 1", function(){
                describe("Ensure bankroll is equal to distribution threshold", function(){
                    this.logInfo("We deposit ETH, then distribute to token.");
                    this.logInfo("The balance should then be bankroll + 14*daily_limit.");
                    itCanReceiveDeposit(1e12);
                    itCanDistribute();
                    it("Bankroll == Dividend Threshold", async function(){
                        const expBalance = (await treasury.bankroll()).plus(DAILY_LIMIT.mul(14));
                        const balance = testUtil.getBalance(treasury);
                        this.logInfo(`Balance: ${balance}, 14*dailyLimit: ${expBalance}`);
                        assert(expBalance.equals(balance));
                    });
                });
                
                describe("Funds 14*DAILY_LIMIT + 1", async function(){
                    this.logInfo("We fund the full daily_limit 15 days in a row.");
                    this.logInfo("This ensures the balance is less than the bankroll.");
                    this.logInfo("This is a situation where the Treasury is not fully solvent.");
                    await testUtil.fastForward(24*60*60);
                    for (var i=0; i<14; i++){
                        await treasury.fundMainController(DAILY_LIMIT, "", {from: dummyMainController});
                        await testUtil.fastForward(24*60*60);
                    }
                    await treasury.fundMainController(1, "", {from: dummyMainController});
                });
            });
            it("Fails if it cannot afford to removeFromBankroll", async function(){
                const balance = testUtil.getBalance(treasury);
                const bankroll = await treasury.bankroll();
                this.logInfo(`Balance: ${balance} < Bankroll: ${bankroll}`);
                this.logInfo("Treasury cannot afford to remove full bankroll.");
                assert(balance.lt(bankroll), "Balance should be < bankroll");
                return createDefaultTxTester()
                    .doTx([treasury, "removeFromBankroll", bankroll, {from: dummyComptroller}])
                    .assertInvalidOpCode()
                    .start();
            });
        })
        describe(".distributeToToken()", function(){
            this.logInfo("We deposit a large amount of revenue.");
            this.logInfo("Treasury should now be able to distribute dividends once again.");
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
                .startLedger([treasury, anon])
                .doTx([treasury, "sendTransaction", {value: amount, from: anon}])
                .assertSuccess()
                    .assertOnlyLog("RevenueReceived", {time: null, sender: anon, amount: amount})
                .stopLedger()
                    .assertDeltaMinusTxFee(anon, amount.mul(-1))
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
            const bankroll = await treasury.bankroll();
            const surplus = testUtil.getBalance(treasury)
                .minus(bankroll)
                .minus(DAILY_LIMIT.mul(14));
            const expectedReward = surplus.div(await treasury.distributeRewardDenom()).floor();
            const expectedToDistribute = surplus.minus(expectedReward);
            const prevTotalDistributed = await treasury.totalDistributed();
            return createDefaultTxTester()
                .assertCallReturns([treasury, "getDistributeReward"], expectedReward)
                .assertCallReturns([treasury, "getAmountToDistribute"], surplus)
                .startLedger([anon, treasury, dummyToken])
                .doTx([treasury, "distributeToToken", {from: anon}])
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("RewardPaid", {
                        recipient: anon,
                        note: "Called .distrubuteToToken()",
                        amount: expectedReward
                    })
                    .assertLog("DistributeSuccess", {
                        token: dummyToken,
                        amount: expectedToDistribute
                    })
                .stopLedger()
                    .assertDelta(dummyToken, expectedToDistribute)
                    .assertDelta(treasury, surplus.mul(-1))
                    .assertDeltaMinusTxFee(anon, expectedReward)
                    .assertBalance(treasury, bankroll.plus(DAILY_LIMIT.mul(14)))
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
                .startLedger([treasury, anon])
                .doTx([treasury, "distributeToToken", {from: anon}])
                .assertSuccess()
                    .assertOnlyLog("DistributeError", {msg: msg})
                .stopLedger()
                    .assertNoDelta(treasury)
                    .assertLostTxFee(anon)
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

describe('Distribution Stats', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[1];
    const anon = accounts[2];
    const dummyToken = accounts[3];
    const admin = accounts[4];
    var treasury;

    before("Set up registry and treasury", async function(){
        const registry = await Registry.new(owner, {from: anon});
        await registry.register("ADMIN", admin, {from: owner});
        treasury = await Treasury.new(registry.address, {from: anon});

        const addresses = {
            registry: registry.address,
            treasury: treasury.address,
            owner: owner,
            anon: anon,
            dummyToken: dummyToken,
            admin: admin
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .doTx([treasury, "initToken", dummyToken, {from: owner}])
            .assertSuccess()
            .doTx([treasury, "setDistributeReward", 101, {from: admin}])
            .assertSuccess()
            .start();
    });
    // here we test that distribution stats work by distributing
    // and checking that the states are correct.
    // .assertDistributes() does the real math to check Treasury's math.
    describe("Distribution stats", function(){
        this.logInfo("Treasury has the ability to do a binary search for dividends (.getDistributionStats).");
        this.logInfo(`This is difficult to test. What we do is deposit and distribute many times,\n`+
            `and check that after each distribution that the stats returned are correct.`);

        it("Works for 1st deposit", async function(){
            await assertReceivesDeposit(101);
            await assertDistributes();    
        });
        it("Works for 2nd deposit", async function(){
            await assertReceivesDeposit(1010);
            await assertDistributes();    
        });
        it("Works for 3rd deposit", async function(){
            await assertReceivesDeposit(10100);
            await assertDistributes();    
        });
        it("Works for 4th deposit", async function(){
            await assertReceivesDeposit(101000);
            await assertDistributes();    
        });
        it("Works for 5th deposit", async function(){
            await assertReceivesDeposit(1010000);
            await assertDistributes();    
        });
        it("Works for 6th deposit", async function(){
            await assertReceivesDeposit(10100000);
            await assertDistributes();    
        });
        it("Works for 7th deposit", async function(){
            await assertReceivesDeposit(202);
            await assertDistributes();    
        });
        it("Works for 8th deposit", async function(){
            await assertReceivesDeposit(2020);
            await assertDistributes();    
        });
        it("Works for 9th deposit", async function(){
            await assertReceivesDeposit(20200);
            await assertDistributes();    
        });
        it("Works for 10th deposit", async function(){
            await assertReceivesDeposit(202000);
            await assertDistributes();    
        });
        it("Works for 11th deposit", async function(){
            await assertReceivesDeposit(2020000);
            await assertDistributes();    
        });
        it("Works for 12th deposit", async function(){
            await assertReceivesDeposit(20200000);
            await assertDistributes();    
        });
    });

    const divDates = [];
    const divAmounts = [];
    var divTotal = new BigNumber(0);
    function computeStats(d1, d2) {
        if (d2 == 0) d2 = Infinity;
        var count = 0;
        var total = new BigNumber(0);
        divDates.forEach((d,i)=>{
            if (d.lt(d1) || d.gt(d2)) return;
            count++;
            total = total.plus(divAmounts[i]);
        });
        return [count, total];
    }
    async function assertDistributes() {
        const txRes = await treasury.distributeToToken({from: anon});
        console.log(`Called .distributeToToken() (${txRes.receipt.gasUsed} gas)`);
        const date = txRes.logs[0].args.time;
        const amt = txRes.logs[0].args.amount;
        divDates.push(date);
        divAmounts.push(amt);
        divTotal = divTotal.plus(amt);

        function rand(start, end) {
            return start + Math.floor(Math.random()*end);
        }
        const len = divDates.length;
        const midIndex = Math.floor(len/2);
        const midDate = divDates[midIndex];
        const randIndex1 = rand(0, len);
        const randIndex2 = randIndex1 + rand(0, (len - randIndex1));
        const randDate1 = divDates[randIndex1].plus(rand(0,3)*7);
        const randDate2 = divDates[randIndex2].plus(rand(0,3)*7);
        const zeroToMidStats = computeStats(0, midDate);
        const midToNowStats = computeStats(midDate, 0);
        const randomStats = computeStats(randDate1, randDate2);
        await createDefaultTxTester()
            .assertCallReturns([treasury, "getDistributionStats", 0, 0], ()=>[divDates.length, divTotal])
            .assertCallReturns([treasury, "getDistributionStats", 0, midDate], zeroToMidStats)
            .assertCallReturns([treasury, "getDistributionStats", midDate, 0], midToNowStats)
            .assertCallReturns([treasury, "getDistributionStats", randDate1, randDate2], randomStats)
            .start();

        const estGas = await treasury.getDistributionStats.estimateGas(0, 0);
        console.log(`Estimate gas for getting all: ${estGas}`);
    }
    async function assertReceivesDeposit(amount) {
        await createDefaultTxTester()
            .doTx([treasury, "sendTransaction", {value: amount, from: anon}])
            .assertSuccess()
            .assertOnlyLog("RevenueReceived", {time: null, sender: anon, amount: amount})
            .start();
    }
});