const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("Treasury");
const Comptroller = artifacts.require("Comptroller");
const DividendToken = artifacts.require("DividendToken");
const DividendTokenLocker = artifacts.require("DividendTokenLocker");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

testCase(false, false);
testCase(true, false);
testCase(true, true);

// runs a full suite of tests for the given conditions
async function testCase(MEET_SOFT_CAP, MEET_HARD_CAP) {
    const softCapStr = MEET_SOFT_CAP ? "is met" : "is not met";
    const hardCapStr = MEET_HARD_CAP ? "is met" : "is not met";
    describe(`Test Case where softCap ${softCapStr} and hard cap ${hardCapStr}`, function(){
        const accounts = web3.eth.accounts;
        const admin = accounts[1];
        const wallet = accounts[2];
        const account1 = accounts[3];
        const account2 = accounts[4];
        const account3 = accounts[5];
        const accountWithNoTokens = accounts[6];
        const regOwner = accounts[7];
        const anon = accounts[8];

        var registry;
        var treasury;
        var comptroller;
        var token;
        var locker;

        testUtil.mineBlocks(1);
        const DATE_STARTED = testUtil.getBlockTime() + 20;
        const DATE_ENDED = DATE_STARTED + 30;
        const SOFT_CAP = new BigNumber(1e16);
        const BONUS_CAP = new BigNumber(2e16);
        const HARD_CAP = new BigNumber(3e16);
        const CAPITAL_PCT_BIPS = new BigNumber(2500);

        before("Set up Treasury, and create Comptroller.", async function(){
            await createDefaultTxTester().nameAddresses({
                regOwner: regOwner,
                admin: admin,
                wallet: wallet,
                account1: account1,
                account2: account2,
                account3: account3,
                accountWithNoTokens: accountWithNoTokens,
                anon: anon
            }).start();

            this.logInfo("Create Registry, and register Admin");
            await createDefaultTxTester()
                .doNewTx(Registry, [regOwner], {from: anon}).assertSuccess()
                .withTxResult((res, plugins)=>{
                    registry = res.contract;
                    plugins.addAddresses({registry: registry});
                }).start();
            await createDefaultTxTester()
                .doTx([registry, "register", "ADMIN", admin, {from: regOwner}])
                .assertSuccess().start();

            this.logInfo("Create Treasury, which points to registry.");
            await createDefaultTxTester()
                .doNewTx(Treasury, [registry.address, wallet], {from: anon}).assertSuccess()
                .withTxResult((res, plugins)=>{
                    treasury = res.contract;
                    plugins.addAddresses({treasury: treasury});
                }).start();

            this.logInfo("Create Comptroller, owned by dummyWallet.");
            await createDefaultTxTester()
                .doNewTx(Comptroller, [wallet, treasury.address], {from: anon}).assertSuccess()
                .withTxResult(async function(res, plugins){
                    comptroller = res.contract;
                    token = DividendToken.at(await comptroller.token());
                    locker = DividendTokenLocker.at(await comptroller.locker());
                    plugins.addAddresses({
                        comptroller: comptroller.address,
                        token: token.address,
                        locker: locker.address,
                    });
                }).start();

            this.logInfo("Init Treasury to point to Comptroller and Token");
            await createDefaultTxTester()
                .doTx([treasury, "initComptroller", [comptroller.address], {from: wallet}])
                .assertSuccess()
                .start();
                
            await createDefaultTxTester().printNamedAddresses().start();
        });
        
        describe("Comptroller is initialized correctly", function(){
            before("Has correct state", function(){
                return createDefaultTxTester()
                    .assertCallReturns([comptroller, "wallet"], wallet)
                    .assertCallReturns([comptroller, "locker"], locker.address)
                    .assertCallReturns([comptroller, "token"], token.address)
                    .assertCallReturns([comptroller, "treasury"], treasury.address)
                    .assertCallReturns([comptroller, "wasSaleStarted"], false)
                    .assertCallReturns([comptroller, "wasSaleEnded"], false)
                    .assertCallReturns([comptroller, "wasSoftCapMet"], false)
                    .assertCallReturns([token, "totalSupply"], 0)
                    .assertCallReturns([token, "isFrozen"], true)
                    .start();
            })
            it(".fund() doesn't work (sale not yet started)", function(){
                return assertCannotFund(account1, 1e15, "CrowdSale has not yet started.");
            });
        });
        describeSaleNotEnded();
        describe(".initSale()", function(){
            it("not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale", 1, 3, 2, 1, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("fails if softCap > hardCap", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 3, 2, 1, 1, {from: wallet}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("fails if bonusCap > hardCap", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 1, 2, 3, 1, {from: wallet}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("fails if capitalPctBips > 10000", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 1, 2, 3, 10001, {from: wallet}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("works from owner", function(){
               return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 1, 3, 2, 1, {from: wallet}])
                    .assertSuccess()
                    .start(); 
            });
            it("can be called again, since sale has not started", async function(){
                const blocktimestamp = testUtil.getBlockTime();
                const sTilStart = DATE_STARTED - blocktimestamp;
                const sTilEnd = DATE_ENDED - DATE_STARTED;
                this.logInfo(`CrowdSale will start in ${sTilStart} seconds.`);
                this.logInfo(`CrowdSale will end ${sTilEnd} seconds after it starts.`);
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, SOFT_CAP, HARD_CAP, BONUS_CAP, CAPITAL_PCT_BIPS, {from: wallet}])
                    .assertSuccess()
                    .assertCallReturns([comptroller, "wasSaleStarted"], false)
                    .assertCallReturns([comptroller, "dateSaleStarted"], DATE_STARTED)
                    .assertCallReturns([comptroller, "dateSaleEnded"], DATE_ENDED)
                    .assertCallReturns([comptroller, "softCap"], SOFT_CAP)
                    .assertCallReturns([comptroller, "hardCap"], HARD_CAP)
                    .assertCallReturns([comptroller, "bonusCap"], BONUS_CAP)
                    .assertCallReturns([comptroller, "capitalPctBips"], CAPITAL_PCT_BIPS)
                    .start();
            });
        });
        describe("CrowdSale starting", function(){
            it("Is not started yet.", function(){
                return assertCannotFund(account1, 1e15, "CrowdSale has not yet started.");
            });
            it("Fast forward to date started", async function(){
                const sTilStart = DATE_STARTED - testUtil.getBlockTime();
                testUtil.fastForward(sTilStart + 1);
            });
        });
        describe("Account1 can buy some tokens", function(){
            it("Account1 buys some tokens", async function(){
                return assertCanFund(account1, SOFT_CAP.div(2), this.logInfo);
            });
            describeSaleNotEnded();
        });
        if (MEET_SOFT_CAP) {
            describe("Meet the soft cap...", function(){
                it("Account2 buys some tokens (should meet soft cap)", async function(){
                    const curRaised = await comptroller.totalRaised();
                    const remaining = SOFT_CAP.minus(curRaised);
                    return assertCanFund(account2, remaining, this.logInfo);
                });
                it("Account3 buys some tokens (should meet bonus cap)", async function(){
                    this.logInfo("Note: We send just a little more than exceeds bonus cap");
                    this.logInfo("This more thoroughly tests the bonus computation.");
                    const curRaised = await comptroller.totalRaised();
                    const remaining = BONUS_CAP.minus(curRaised).plus(1e14);
                    return assertCanFund(account3, remaining, this.logInfo);
                });
                describeSaleNotEnded();
            });
        }
        if (MEET_HARD_CAP) {
            describe("Meet the hard cap...", function(){
                it("Account1 buys some tokens (should meet hard cap)", async function(){
                    this.logInfo("Note: We send just a bit more than exceeds the Hard Cap.");
                    this.logInfo("This tests the case that the user is refunded the extra.");
                    const curRaised = await comptroller.totalRaised();
                    const remaining = HARD_CAP.minus(curRaised);
                    return assertCanFund(account1, remaining.plus(1e16), this.logInfo);
                });
                it("Cannot buy more tokens", function(){
                    return assertCannotFund(account2, 1e15, "HardCap has been reached.");
                });
            });
        }
        describe(`CrowdSale ends ${MEET_SOFT_CAP ? "successfully" : "in failure"}.`, function(){
            if (!MEET_HARD_CAP) {
                it("Fast-forward to end of CrowdSale", async function(){
                    const sTilEnd = DATE_ENDED - testUtil.getBlockTime();
                    testUtil.fastForward(sTilEnd + 1);
                    const blocktime = testUtil.getBlockTime();
                    const dateSaleEnded = await comptroller.dateSaleEnded();
                    assert(blocktime > dateSaleEnded, "Blocktime is passed dateSaleEnded");
                });
            }
            if (MEET_SOFT_CAP) {
                const itStr = MEET_HARD_CAP
                    ? "Sale can immediately be ended."
                    : "Sale can now be ended.";
                it(itStr, async function(){
                    // treasury should get .5 for all burnable, plus capital
                    const totalRaised = await comptroller.totalRaised();
                    const expTotalSupply = (await token.totalSupply()).mul(1.25);
                    const expCapital = totalRaised.mul(CAPITAL_PCT_BIPS.div(10000)).floor();
                    const expWalletDelta = totalRaised.minus(expCapital);
                    // these should not change
                    const expAcc1Tokens = await token.balanceOf(account1);
                    const expAcc2Tokens = await token.balanceOf(account2);
                    const expAcc3Tokens = await token.balanceOf(account3);

                    this.logInfo("Sale should succeed:");
                    this.logInfo(`  - Total Raised: ${toEth(totalRaised)}`)
                    this.logInfo(`  - Treasury should get capital: ${toEth(expCapital)}`);
                    this.logInfo(`  - Wallet should get remaining: ${toEth(expWalletDelta)}`);
                    await createDefaultTxTester()
                        .startWatching([treasury])
                        .startLedger([anon, treasury, wallet])
                        .doTx([comptroller, "endSale", {from: anon}])
                        .assertSuccess()
                        .assertOnlyLog("SaleSuccessful")
                        .stopWatching()
                            .assertEvent(treasury, "CapitalRaised", {
                                amount: expCapital
                            })
                        .assertCallReturns([comptroller, "wasSaleEnded"], true)
                        .assertCallReturns([comptroller, "wasSoftCapMet"], true)
                        .stopLedger()
                            .assertBalance(comptroller, 0)
                            .assertDelta(treasury, expCapital)
                            .assertDelta(wallet, expWalletDelta)
                        .start();

                    this.logInfo("Check tokens:");
                    this.logInfo("  - Wallet should own 0 tokens.");
                    this.logInfo("  - Locker should own 20% of tokens.");
                    this.logInfo("  - Tokens should be unfrozen.");
                    const expLockerTokens = expTotalSupply.div(5).floor();
                    await createDefaultTxTester()
                        .assertCallReturns([token, "totalSupply"], expTotalSupply)
                        .assertCallReturns([token, "balanceOf", wallet], 0)
                        .assertCallReturns([token, "balanceOf", locker.address], expLockerTokens)
                        .assertCallReturns([token, "balanceOf", account1], expAcc1Tokens)
                        .assertCallReturns([token, "balanceOf", account2], expAcc2Tokens)
                        .assertCallReturns([token, "balanceOf", account3], expAcc3Tokens)
                        .assertCallReturns([token, "isFrozen"], false)
                        .start();

                    this.logInfo("Check that TokenLocker has proper vesting");
                    const today = (new BigNumber(testUtil.getBlockTime())).div(24*60*60).floor();
                    await createDefaultTxTester()
                        .assertCallReturns([locker, "vestingAmt"], expLockerTokens)
                        .assertCallReturns([locker, "vestingStartDay"], today)
                        .assertCallReturns([locker, "vestingDays"], 600)
                        .start();
                });
            } else {
                it("Sale can now be ended.", async function(){
                    this.logInfo("Sale should fail, since soft cap not met.");
                    this.logInfo("Tokens should remain frozen.");
                    return createDefaultTxTester()
                        .doTx([comptroller, "endSale", {from: anon}])
                        .assertSuccess()
                        .assertOnlyLog("SaleFailed")
                        .assertCallReturns([comptroller, "wasSaleEnded"], true)
                        .assertCallReturns([comptroller, "wasSoftCapMet"], false)
                        .assertCallReturns([token, "isFrozen"], true)
                        .start();
                });
            }
        });

        if (MEET_SOFT_CAP) {
            describe("After the ICO (soft cap met)", function(){
                describe(".refund() does nothing (soft cap met)", function(){
                    it(".refund() for account1 fails", function(){
                        return assertCannotRefund(account1);
                    });
                })
                describe("Raising capital works", function(){
                    before("Make Treasury need 1e18 ETH in capital", function(){
                        return increaseCapitalNeeded(1e16);
                    });
                    it(".fundCapital() works", function(){
                        return assertCanFundCapital(account3, .5e16, this.logInfo);
                    });
                    it(".fundCapital() works, limiting amount to amount needed", function(){
                        return assertCanFundCapital(account3, 15e16, this.logInfo);
                    });
                    it(".fundCapital() does not work if 0 needed", function(){
                        return assertCannotFundCapital(account3, 1e10, "No capital is needed.");
                    })
                });
            });
        } else {
            describe("After the ICO (soft cap not met)", function(){
                describe("Wallet owns PennyEther", function(){
                    it("Wallet owns more than 99.9999999% of tokens", async function(){
                        const walletTokens = await token.balanceOf(wallet);
                        const totalSupply = await token.totalSupply();
                        console.log(`Wallet owns ${toEth(walletTokens, "tokens")} of ${toEth(totalSupply, "tokens")}`);
                        assert(walletTokens.div(totalSupply).gt(.999999999), "Wallet owns more than 99.9999999%");
                    });
                });
                describe("Refunding works", function(){
                    it("Can refund account1", function(){
                        return assertCanRefund(account1, SOFT_CAP.div(2));
                    });
                    it("Cannot refund account1 again", function(){
                        return assertCannotRefund(account1);
                    })
                    it("Comptroller has no remaining balance", function(){
                        this.logInfo("Everyone has been refunded.");
                        return createDefaultTxTester()
                            .assertBalance(comptroller, 0)
                            .start();
                    });
                });
                describe("Cannot fund capital to Treasury", function(){
                    before("Make Treasury need 1e10 ETH in capital", function(){
                        return increaseCapitalNeeded(1e18);
                    });
                    it(".fundCapital() does not work", function(){
                        return assertCannotFundCapital(account3, 1e10, "SoftCap was not met.");
                    });
                });
            });
        }

        ////////////////////////////////////////////////////
        ///////// HELPER FUNCTIONS /////////////////////////
        ////////////////////////////////////////////////////
        async function computeTokens(amt, logInfo) {
            const curRaised = await comptroller.totalRaised();
            const endRaised = BigNumber.min(curRaised.plus(amt), HARD_CAP);
            const bonusRemaining = BONUS_CAP.minus(curRaised);

            var expTokens;
            if (bonusRemaining.gt(0)) {
                // its possible only _some_ eth is eligible for bonus
                const bonusEligible = endRaised.gt(BONUS_CAP)
                    ? BONUS_CAP.minus(curRaised)
                    : amt;

                // calculate avg bonus pct
                const startBonusPct = BONUS_CAP.minus(curRaised).div(BONUS_CAP).mul(.5).plus(1);
                const endBonusPct = BONUS_CAP.minus(curRaised.plus(bonusEligible)).div(BONUS_CAP).mul(.5).plus(1);
                const avgBonusPct = startBonusPct.plus(endBonusPct).div(2);

                // calculate the tokens
                const bonusTokens = bonusEligible.mul(avgBonusPct);
                const additionalTokens = amt.gt(bonusEligible)
                    ? amt.minus(bonusEligible)
                    : 0
                expTokens = bonusTokens.plus(additionalTokens);

                const bonusPctStr = avgBonusPct.mul(100).minus(100).toFixed(2);
                logInfo(`  - Will receive ${bonusPctStr}% bonus on ${toEth(bonusEligible)}.`);
                if (additionalTokens) {
                    logInfo(`  - Exceeds bonus phase by ${toEth(amt.minus(bonusEligible))}.`);
                }
            } else {
                expTokens = amt;
                logInfo(`  - No bonus remaining.`);
            }
            logInfo(`  - Will receive ${toEth(expTokens, "tokens")}`);
            return expTokens;
        }

        async function assertCanFund(account, amt, logInfo) {
            amt = new BigNumber(amt);
            const prevRaised = await comptroller.totalRaised();
            const expRaised = BigNumber.min(prevRaised.plus(amt), HARD_CAP);
            const triggersBonusCap = prevRaised.lt(BONUS_CAP) && !BONUS_CAP.gt(expRaised)
            const triggersSoftCap = prevRaised.lt(SOFT_CAP) && !SOFT_CAP.gt(expRaised);
            const triggersHardCap = prevRaised.lt(HARD_CAP) && !HARD_CAP.gt(expRaised);
            const triggersSale = prevRaised.equals(0);
            const expRefund = BigNumber.max(prevRaised.plus(amt).minus(HARD_CAP), 0);
            const expAmt = amt.minus(expRefund);
            const expTokens = await computeTokens(expAmt, logInfo);
            const expLogs = [["BuyTokensSuccess", {
                account: account,
                funded: expAmt,
                numTokens: expTokens
            }]];

            logInfo(`TotalRaised: ${toEth(prevRaised)}. Will raise another: ${toEth(amt)}`);
            if (expRefund.gt(0)) {
                logInfo(`Will only convert ${toEth(expAmt)} to tokens...`);
                logInfo(`${toEth(expRefund)} will be refunded.`);
                expLogs.push(["UserRefunded", {
                    account: account,
                    refund: expRefund
                }]);
            } else {
                logInfo(`Will convert ${toEth(amt)} to ${toEth(expTokens)} tokens...`);
            }

            const prevBalance = await token.balanceOf(account);
            const prevTotalSupply = await token.totalSupply();

            if (triggersSale) {
                logInfo("**This starts the sale.**");
                expLogs.push(["SaleStarted", {}])
            }
            if (triggersBonusCap) logInfo(`**Bonus Cap of ${toEth(BONUS_CAP)} will be met.**`);
            if (triggersSoftCap) logInfo(`**Soft Cap of ${toEth(SOFT_CAP)} will be met.**`);
            if (triggersHardCap) logInfo(`**Hard Cap of ${toEth(HARD_CAP)} will be met.**`);

            //event BuyTokensSuccess(uint time, address indexed sender, uint value, uint numTokens);
            const txTester = createDefaultTxTester()
                .startLedger([comptroller, account])
                .doTx([comptroller, "fund", {from: account, value: amt}])
                .assertSuccess()
                .assertLogCount(expLogs.length)

            expLogs.forEach(l=>{
                txTester.assertLog(l[0], l[1]);
            })

            txTester
                .stopLedger()
                    .assertDelta(comptroller, expAmt)
                    .assertDeltaMinusTxFee(account, expAmt.mul(-1))
                .assertCallReturns([comptroller, "totalRaised"], expRaised)
                .assertCallReturns([token, "balanceOf", account], prevBalance.plus(expTokens))
                .assertCallReturns([token, "totalSupply"], prevTotalSupply.plus(expTokens))
                .assertCallReturns([comptroller, "wasSaleStarted"], true)
                .assertCallReturns([token, "isFrozen"], true);

            if (triggersSale) {
                txTester.assertLog("SaleStarted");
                txTester.assertCallReturns([comptroller, "wasSaleStarted"], true);
            }

            return txTester.start();
        }
        function assertCannotFund(account, amt, reason) {
            return createDefaultTxTester()
                .doTx([comptroller, "fund", {from: account, value: amt}])
                .assertSuccess()
                .assertOnlyLog("BuyTokensFailure", {
                    time: null,
                    account: account,
                    reason: reason
                })
                .start();
        }

        async function assertCanRefund(account, expAmt) {
            const numTokens = await token.balanceOf(account);
            console.log(`Account should be refunded ${toEth(expAmt)} for ${toEth(numTokens, "tokens")}.`);
            return createDefaultTxTester()
                .startLedger([comptroller, account])
                .doTx([comptroller, "refund", {from: account}])
                .assertSuccess()
                .assertOnlyLog("UserRefunded", {
                    time: null,
                    account: account,
                    refund: expAmt
                })
                .stopLedger()
                .assertDelta(comptroller, expAmt.mul(-1))
                .assertDeltaMinusTxFee(account, expAmt)
                .start();
        }
        function assertCannotRefund(account){
            return createDefaultTxTester()
                .doTx([comptroller, "refund", {from: account}])
                .assertInvalidOpCode()
                .start();
        }

        function assertCannotEndSale(){
            return createDefaultTxTester()
                .doTx([comptroller, "endSale", {from: anon}])
                .assertInvalidOpCode()
                .start();
        }

        async function assertCanFundCapital(account, amt, logInfo) {
            amt = new BigNumber(amt);
            const needed = await treasury.capitalNeeded();
            const expAmt = BigNumber.min(needed, amt);
            const expRefund = amt.minus(needed);
            const expTokens = expAmt;
            if (expAmt.equals(0)) {
                throw new Error(`Treasury requires no capital. Consider assertCannotFundCapital()`);
            }

            const expLogs = [["BuyTokensSuccess",{
                account: account,
                funded: expAmt,
                numTokens: expTokens
            }]];

            logInfo(`Will fund capital: ${toEth(amt)}`);
            if (expRefund.gt(0)) {
                logInfo(`Will only convert ${toEth(expAmt)} to ${toEth(expTokens)} tokens...`);
                logInfo(`${toEth(expRefund)} will be refunded.`);
                expLogs.push(["UserRefunded", {
                    account: account,
                    refund: expRefund
                }]);
            } else {
                logInfo(`Will convert ${toEth(amt)} to ${toEth(expTokens)} tokens...`);
            }

            const prevBalance = await token.balanceOf(account);
            const prevTotalSupply = await token.totalSupply();
            const prevCapital = await treasury.capital();
            const prevCapitalRaised = await treasury.capitalRaised();
            const prevCapitalNeeded = await treasury.capitalNeeded();

            //event BuyTokensSuccess(uint time, address indexed sender, uint value, uint numTokens);
            const txTester = createDefaultTxTester()
                .startWatching([treasury])
                .startLedger([treasury, comptroller, account])
                .doTx([comptroller, "fundCapital", {from: account, value: amt}])
                .assertSuccess()
                .assertLogCount(expLogs.length)

            expLogs.forEach(l=>{
                txTester.assertLog(l[0], l[1]);
            })

            return txTester
                .stopWatching()
                    .assertEvent(treasury, "CapitalRaised", {
                        time: null,
                        amount: expAmt
                    })
                .stopLedger()
                    .assertNoDelta(comptroller)
                    .assertDeltaMinusTxFee(account, expAmt.mul(-1))
                .assertCallReturns([token, "balanceOf", account], prevBalance.plus(expTokens))
                .assertCallReturns([token, "totalSupply"], prevTotalSupply.plus(expTokens))
                .assertCallReturns([treasury, "capital"], prevCapital.plus(expAmt))
                .assertCallReturns([treasury, "capitalRaised"], prevCapitalRaised.plus(expAmt))
                .assertCallReturns([treasury, "capitalNeeded"], prevCapitalNeeded.minus(expAmt))
                .start();
        }
        function assertCannotFundCapital(account, amt, errMsg) {
            amt = new BigNumber(amt);
            return createDefaultTxTester()
                .startLedger([account, comptroller])
                .doTx([comptroller, "fundCapital", {from: account, value: amt}])
                .assertSuccess()
                    .assertOnlyLog("BuyTokensFailure", {
                        time: null,
                        account: account,
                        reason: errMsg
                    })
                .stopLedger()
                    .assertNoDelta(comptroller)
                    .assertDeltaMinusTxFee(account, 0)
                .start();
        }

        async function increaseCapitalNeeded(amt) {
            amt = new BigNumber(amt);
            var raiseAmt;
            const curNeeded = (await treasury.capitalNeeded());
            if (curNeeded.equals(0)) {
                const curTarget = (await treasury.capitalRaisedTarget());
                const curRaised = (await treasury.capitalRaised());
                const curSurplus = curRaised.minus(curTarget);
                console.log(`Treasury has a surplus of capital by ${toEth(curSurplus)}`);
                raiseAmt = amt.plus(curSurplus);
            } else {
                raiseAmt = amt;
            }
            console.log(`Will increase capitalRaisedTarget by ${toEth(amt)}.`);

            console.log("First, create request.");
            await createDefaultTxTester()
                .doTx([treasury, "createRequest", 2, 0, raiseAmt, "", {from: admin}])
                .assertSuccess().start();
            const rId = await treasury.curRequestId();
            
            console.log("");
            console.log("Next, fast-forward so we can execute it.");
            await testUtil.fastForward(60*60*24*7 + 1);
            
            console.log("");
            console.log("Execute it and test results.");
            await createDefaultTxTester()
                .doTx([treasury, "executeRequest", rId, {from: admin}])
                .assertSuccess()
                .assertLog("ExecutedRaiseCapital", {amount: raiseAmt})
                .assertCallReturns([treasury, "capitalNeeded"], curNeeded.plus(amt))
                .start();
        }

        function describeSaleNotEnded() {
            describe("During sale, several functions don't work.", async function(){
                const blocktime = testUtil.getBlockTime();
                const dateSaleEnded = await comptroller.dateSaleEnded();
                this.logInfo(`Blocktime: ${blocktime}, dateSaleEnded: ${dateSaleEnded}`);

                it("Check state", function(){
                    return createDefaultTxTester()
                        .assertCallReturns([comptroller, "wasSaleEnded"], false)
                        .start();
                })
                it(".endSale() doesn't work.", function(){
                    return assertCannotEndSale();
                });
                it(".refund() doesn't work.", function(){
                    return assertCannotRefund();
                });
                it(".fundCapital() doesn't work.", function(){
                    return assertCannotFundCapital(account1, 1e15, "Sale has not ended.");
                });
            });
        }
        function toEth(n, str) {
            return n.div(1e18).toFixed(5) + ` ${str || "ETH"}`
        }
    });
}