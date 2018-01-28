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
        const regOwner = accounts[1];
        const wallet = accounts[2];
        const admin = accounts[3];
        const account1 = accounts[4];
        const account2 = accounts[5];
        const account3 = accounts[6];
        const accountWithNoTokens = accounts[7];
        const dummyMainController = accounts[8];
        const anon = accounts[9];

        testUtil.mineBlocks(1);
        const DAILY_LIMIT = 1e12;
        const DATE_STARTED = testUtil.getBlockTime() + 20;
        const DATE_ENDED = DATE_STARTED + 30;
        const SOFT_CAP = new BigNumber(1e16);
        const BONUS_CAP = new BigNumber(2e16);
        const HARD_CAP = new BigNumber(3e16);

        var registry;
        var treasury;
        var comptroller;
        var token;
        var locker;

        before("Set up Registry, Treasury, and create Comptroller.", async function(){
            await createDefaultTxTester().nameAddresses({
                regOwner: regOwner,
                wallet: wallet,
                admin: admin,
                account1: account1,
                account2: account2,
                account3: account3,
                accountWithNoTokens: accountWithNoTokens,
                dummyMainController: dummyMainController,
                anon: anon,
            }).start();

            this.logInfo("Create Registry, owned by regOwner.");
            await createDefaultTxTester()
                .doNewTx(Registry, [regOwner], {from: anon}).assertSuccess()
                .withTxResult((res, plugins)=>{
                    registry = res.contract;
                    plugins.addAddresses({registry: registry.address});
                }).start();

            this.logInfo("Register the ADMIN (sets daily limit)");
            await createDefaultTxTester()
                .doTx([registry, "register", "ADMIN", admin, {from: regOwner}])
                .assertSuccess().start();

            this.logInfo("Register MAIN_CONTROLLER");
            await createDefaultTxTester()
                .doTx([registry, "register", "MAIN_CONTROLLER", dummyMainController, {from: regOwner}])
                .assertSuccess().start();

            this.logInfo("Create Treasury, which points to Registry.");
            await createDefaultTxTester()
                .doNewTx(Treasury, [registry.address], {from: anon}).assertSuccess()
                .withTxResult((res, plugins)=>{
                    treasury = res.contract;
                    plugins.addAddresses({treasury: treasury.address});
                }).start();

            this.logInfo("Create Comptroller, owned by wallet.");
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

            this.logInfo("Init Treasury to point to Comptroller and Token, set Daily limit");
            await createDefaultTxTester()
                .doTx([treasury, "initToken", [token.address], {from: regOwner}])
                .assertSuccess()
                .doTx([treasury, "initComptroller", [comptroller.address], {from: regOwner}])
                .assertSuccess()
                .doTx([treasury, "setDailyFundLimit", DAILY_LIMIT, {from: admin}])
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
                    .assertCallReturns([token, "balanceOf", wallet], 1)
                    .start();
            })
            it(".buyTokens() doesn't work (sale not yet started)", function(){
                return assertCannotBuyTokens(account1, 1e15, "CrowdSale has not yet started.");
            });
        });
        describeSaleNotEnded();
        describe(".initSale()", function(){
            it("not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale", 1, 3, 2, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("fails if softCap > hardCap", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 3, 2, 1, {from: wallet}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("fails if bonusCap > hardCap", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 1, 2, 3, {from: wallet}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("works from owner", function(){
               return createDefaultTxTester()
                    .doTx([comptroller, "initSale",
                        DATE_STARTED, DATE_ENDED, 1, 3, 2, {from: wallet}])
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
                        DATE_STARTED, DATE_ENDED, SOFT_CAP, HARD_CAP, BONUS_CAP, {from: wallet}])
                    .assertSuccess()
                    .assertCallReturns([comptroller, "wasSaleStarted"], false)
                    .assertCallReturns([comptroller, "dateSaleStarted"], DATE_STARTED)
                    .assertCallReturns([comptroller, "dateSaleEnded"], DATE_ENDED)
                    .assertCallReturns([comptroller, "softCap"], SOFT_CAP)
                    .assertCallReturns([comptroller, "hardCap"], HARD_CAP)
                    .assertCallReturns([comptroller, "bonusCap"], BONUS_CAP)
                    .start();
            });
        });
        describe("CrowdSale starting", function(){
            it("Is not started yet.", function(){
                return assertCannotBuyTokens(account1, 1e15, "CrowdSale has not yet started.");
            });
            it("Fast forward to date started", async function(){
                const sTilStart = DATE_STARTED - testUtil.getBlockTime();
                testUtil.fastForward(sTilStart + 1);
            });
        });
        describe("Account1 can buy some tokens", function(){
            it("Account1 buys some tokens", async function(){
                return assertCanBuyTokens(account1, SOFT_CAP.div(2), this.logInfo);
            });
            describeSaleNotEnded();
        });
        if (MEET_SOFT_CAP) {
            describe("Meet the soft cap...", function(){
                it("Account2 buys some tokens (should meet soft cap)", async function(){
                    const curRaised = await comptroller.totalRaised();
                    const remaining = SOFT_CAP.minus(curRaised);
                    return assertCanBuyTokens(account2, remaining, this.logInfo);
                });
                it("Account3 buys some tokens (should meet bonus cap)", async function(){
                    this.logInfo("Note: We just just a little more than exceeds bonus cap, to test this case.");
                    const curRaised = await comptroller.totalRaised();
                    const remaining = BONUS_CAP.minus(curRaised).plus(1e14);
                    return assertCanBuyTokens(account3, remaining, this.logInfo);
                });
                describeSaleNotEnded();
            });
        }
        if (MEET_HARD_CAP) {
            describe("Meet the hard cap...", function(){
                it("Account1 buys some tokens (should meet hard cap)", async function(){
                    const curRaised = await comptroller.totalRaised();
                    const remaining = HARD_CAP.minus(curRaised);
                    return assertCanBuyTokens(account1, remaining.plus(1e16), this.logInfo);
                });
                it("Cannot buy more tokens", function(){
                    return assertCannotBuyTokens(account2, 1e15, "HardCap has been reached.");
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
                it(MEET_HARD_CAP ? "Sale can immediately be ended." : "Sale can now be ended.", async function(){
                    // treasury should get .5 for all burnable, plus top-off
                    const expBurnable = (await token.totalSupply()).mul(1.125);
                    const threshold = await treasury.getMinBalanceToDistribute();
                    const expTreasuryDelta = expBurnable.mul(.5)
                        .plus(Math.max(threshold - testUtil.getBalance(treasury),0))
                        .floor();
                    // wallet should get remaining
                    const expWalletDelta = (await comptroller.totalRaised())
                        .minus(expTreasuryDelta)
                        .floor();
                    // these should not change
                    const expAcc1Tokens = await token.balanceOf(account1);
                    const expAcc2Tokens = await token.balanceOf(account2);
                    const expAcc3Tokens = await token.balanceOf(account3);

                    this.logInfo("Sale should succeed:");
                    this.logInfo("  - Treasury should get some ETH.");
                    this.logInfo("  - Wallet should get some ETH.")
                    await createDefaultTxTester()
                        .startLedger([anon, treasury, wallet])
                        .doTx([comptroller, "endSale", {from: anon}])
                        .assertSuccess()
                        .assertOnlyLog("SaleSuccessful")
                        .assertCallReturns([comptroller, "wasSaleEnded"], true)
                        .assertCallReturns([comptroller, "wasSaleSuccessful"], true)
                        .stopLedger()
                            .assertBalance(comptroller, 0)
                            .assertDelta(treasury, expTreasuryDelta)
                            .assertDelta(wallet, expWalletDelta)
                        .start();

                    this.logInfo("Check tokens:");
                    this.logInfo("  - Wallet should own 10% of tokens.");
                    this.logInfo("  - Locker should own 10% of tokens.");
                    this.logInfo("  - Tokens should be unfrozen.");
                    const newTotalSupply = await token.totalSupply();
                    const expWalletTokens = newTotalSupply.div(10).floor();
                    const expLockerTokens = newTotalSupply.div(10).floor();
                    await createDefaultTxTester()
                        .assertCallReturns([token, "balanceOf", wallet], expWalletTokens)
                        .assertCallReturns([token, "balanceOf", locker.address], expLockerTokens)
                        .assertCallReturns([token, "balanceOf", account1], expAcc1Tokens)
                        .assertCallReturns([token, "balanceOf", account2], expAcc2Tokens)
                        .assertCallReturns([token, "balanceOf", account3], expAcc3Tokens)
                        .assertCallReturns([token, "isFrozen"], false)
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
                        .assertCallReturns([comptroller, "wasSaleSuccessful"], false)
                        .assertCallReturns([token, "isFrozen"], true)
                        .start();
                });
            }
        });

        if (MEET_SOFT_CAP) {
            describe("After the ICO (soft cap met)", function(){
                describe(".sendRefund() does nothing (soft cap met)", function(){
                    it(".sendRefund() for account1 fails", function(){
                        return createDefaultTxTester()
                            .doTx([comptroller, "sendRefund", {from: account1}])
                            .assertInvalidOpCode()
                            .start();
                    });
                })
                describe("Burning works", function(){
                    it("Doens't work for user with no tokens", function(){
                        return createDefaultTxTester()
                            .doTx([comptroller, "burnTokens", 1e18, {from: accountWithNoTokens}])
                            .assertInvalidOpCode()
                            .start();
                    })
                    it("Burning half of account1's tokens works", async function(){
                        const amt = (await token.balanceOf(account1)).div(2);
                        return assertCanBurnTokens(account1, amt, this.logInfo);
                    });
                    it("Burning account1's remaining tokens tokens works", async function(){
                        const remaining = await token.balanceOf(account1);
                        this.logInfo("This tests that sending a large amount will burn the remaining tokens.");
                        this.logInfo(`Account1 has ${toEth(remaining, "tokens")} remaining, will try to burn double that.`);
                        return assertCanBurnTokens(account1, remaining.mul(2), this.logInfo);
                    });
                    it("Burn all of account2's tokens", async function(){
                        const acct2remaining = await token.balanceOf(account2);
                        await assertCanBurnTokens(account2, acct2remaining, this.logInfo);
                    });
                    it("Burn all of owner's tokens", async function(){
                        const walletRemaining = await token.balanceOf(wallet);
                        await assertCanBurnTokens(wallet, walletRemaining, this.logInfo);
                    })
                });
                describe("Burning works with limited Treasury funds", function(){
                    it("Drain Treasury for 16 days, so it's balance is low.", async function(){
                        await testUtil.fastForward(24*60*60);
                        for (var i=0; i<16; i++){
                            await treasury.fundMainController(DAILY_LIMIT, "", {from: dummyMainController});
                            await testUtil.fastForward(24*60*60);
                        }
                    });
                    it("Now burn all of account3's tokens", async function(){
                        const acc3tokens = (await token.balanceOf(account3));
                        const acc3wei = acc3tokens.div(2);
                        const tBalance = testUtil.getBalance(treasury);
                        this.logInfo(`Account3 can burn ${toEth(acc3tokens, "tokens")} for ${toEth(acc3wei)}...`);
                        this.logInfo(`But treasury only has ${toEth(tBalance)}.`);
                        assert(tBalance.lt(acc3wei), "Treasury should not have enough balance.");
                        return assertCanBurnTokens(account3, acc3tokens.mul(2), this.logInfo);
                    });
                });
            });
        } else {
            describe("After the ICO (soft cap not met)", function(){
                describe("Burning does nothing (softCap not met)", function(){
                    it("account1 cannot burn any tokens", function(){
                        return assertCannotBurnTokens(account1, 1e18);
                    });
                });
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
                        return assertCanSendRefund(account1, SOFT_CAP.div(2));
                    });
                    it("Has no remaining balance", function(){
                        this.logInfo("Everyone has been refunded.");
                        return createDefaultTxTester()
                            .assertBalance(treasury, 0)
                            .start();
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

        async function assertCanBuyTokens(account, amt, logInfo) {
            amt = new BigNumber(amt);
            const prevRaised = await comptroller.totalRaised();
            const expRaised = BigNumber.min(prevRaised.plus(amt), HARD_CAP);
            const triggersBonusCap = prevRaised.lt(BONUS_CAP) && !BONUS_CAP.gt(expRaised)
            const triggersSoftCap = prevRaised.lt(SOFT_CAP) && !SOFT_CAP.gt(expRaised);
            const triggersHardCap = prevRaised.lt(HARD_CAP) && !HARD_CAP.gt(expRaised);
            const triggersSale = prevRaised.equals(0);
            const expRefund = BigNumber.max(prevRaised.plus(amt).minus(HARD_CAP), 0);
            const expAmt = amt.minus(expRefund);

            logInfo(`TotalRaised: ${toEth(prevRaised)}. Will raise another: ${toEth(amt)}`);
            if (expRefund.gt(0)) {
                logInfo(`${toEth(expRefund)} will be refunded.`);
                logInfo(`Will only convert ${toEth(amt.minus(expRefund))} to tokens...`);
            } else {
                logInfo(`Will convert ${toEth(amt)} to tokens...`);
            }

            const expTokens = await computeTokens(amt.minus(expRefund), logInfo);
            const prevBalance = await token.balanceOf(account);
            const expBalance = prevBalance.plus(expTokens);
            const prevTotalSupply = await token.totalSupply();
            const expTotalSupply = prevTotalSupply.plus(expTokens);

            if (triggersSale) logInfo("**This starts the sale.**");
            if (triggersBonusCap) logInfo(`**Bonus Cap of ${toEth(BONUS_CAP)} will be met.**`);
            if (triggersSoftCap) logInfo(`**Soft Cap of ${toEth(SOFT_CAP)} will be met.**`);
            if (triggersHardCap) logInfo(`**Hard Cap of ${toEth(HARD_CAP)} will be met.**`);

            //event BuyTokensSuccess(uint time, address indexed sender, uint value, uint numTokens);
            const txTester = createDefaultTxTester()
                .startLedger([comptroller, account])
                .doTx([comptroller, "buyTokens", {from: account, value: amt}])
                .assertSuccess()
                .stopLedger()
                .assertLogCount(triggersSale ? 2 : 1)
                .assertLog("BuyTokensSuccess", {
                    sender: account,
                    value: amt.minus(expRefund),
                    numTokens: expTokens
                })
                .assertDelta(comptroller, amt.minus(expRefund))
                .assertDeltaMinusTxFee(account, amt.mul(-1).plus(expRefund))
                .assertCallReturns([comptroller, "totalRaised"], expRaised)
                .assertCallReturns([token, "balanceOf", account], expBalance)
                .assertCallReturns([token, "totalSupply"], expTotalSupply)
                .assertCallReturns([comptroller, "wasSaleStarted"], true)
                .assertCallReturns([token, "isFrozen"], true);

            if (triggersSale) {
                txTester.assertLog("SaleStarted");
                txTester.assertCallReturns([comptroller, "wasSaleStarted"], true);
            }

            return txTester.start();
        }
        function assertCannotBuyTokens(account, amt, reason) {
            return createDefaultTxTester()
                .doTx([comptroller, "buyTokens", {from: account, value: amt}])
                .assertSuccess()
                .assertOnlyLog("BuyTokensFailure", {
                    sender: account,
                    reason: reason
                })
                .start();
        }

        async function assertCanBurnTokens(acct, numTokens, logInfo) {
            numTokens = new BigNumber(numTokens);
            var expectedNumTokens = numTokens;
            var numWei = numTokens.div(2);
            // alter numTokens if not in user's balance
            const prevAccTokens = await token.balanceOf(acct);
            if (prevAccTokens.lt(expectedNumTokens)){
                logInfo(`Cannot burn all ${toEth(numTokens, "tokens")}, account only has ${toEth(prevAccTokens,"tokens")}.`);
                expectedNumTokens = prevAccTokens;
                numWei = expectedNumTokens.div(2);
            }
            // alter further if treasury cannot afford
            const tBalance = testUtil.getBalance(treasury.address);
            if (tBalance.lt(numWei)) {
                numWei = tBalance;
                expectedNumTokens = numWei.mul(2);
                logInfo(`Treasury can't afford to burn ${toEth(expectedNumTokens, "tokens")}.`);
            }
            logInfo(`Should burn ${toEth(expectedNumTokens, "tokens")} for ${toEth(numWei)}.`);

            const prevLockerTokens = await token.balanceOf(locker.address);
            const expectedTokens = prevAccTokens.minus(expectedNumTokens);
            const prevBankroll = await treasury.bankroll();
            const expectedBankroll = prevBankroll.minus(numWei);
            await createDefaultTxTester()
                .startLedger([comptroller, treasury, acct])
                .startWatching([treasury, token])
                .doTx([comptroller, "burnTokens", numTokens, {from: acct}])
                .assertSuccess()
                    .assertOnlyLog("UserRefunded", {
                        sender: acct,
                        numTokens: expectedNumTokens,
                        refund: numWei
                    })
                .stopLedger()
                    .assertNoDelta(comptroller)
                    .assertDelta(treasury, numWei.mul(-1))
                    .assertDeltaMinusTxFee(acct, numWei)
                .stopWatching()
                    .assertOnlyEvent(treasury, "BankrollChanged", {
                        oldValue: prevBankroll,
                        newValue: expectedBankroll
                    })
                    .assertEventCount(token, 2)
                    .assertEvent(token, "TokensBurned", {
                        account: acct,
                        amount: expectedNumTokens,
                    })
                    .assertEvent(token, "TokensBurned", {
                        account: locker.address,
                        amount: expectedNumTokens.div(9).floor(),
                    })
                .assertCallReturns([treasury, "bankroll"], expectedBankroll)
                .assertCallReturns([token, "balanceOf", acct], expectedTokens)
                .start();

            const totalSupply = await token.totalSupply();
            const expLockerTokens = totalSupply.div(10);
            logInfo(``);
            logInfo(`Locker should have 10% of totalSupply`);
            logInfo(`10% of ${toEth(totalSupply, "tokens")} is ${toEth(expLockerTokens, "tokens")}`);
            await createDefaultTxTester()
                .assertCallReturns([token, "balanceOf", locker.address], {within1: expLockerTokens})
                .start();
        }
        function assertCannotBurnTokens(account, amt) {
            return createDefaultTxTester()
                .doTx([comptroller, "burnTokens", amt, {from: account}])
                .assertInvalidOpCode()
                .start();
        }

        async function assertCanSendRefund(account, expAmt) {
            const numTokens = await token.balanceOf(account);
            console.log(`Account should be refunded ${toEth(expAmt)} for ${toEth(numTokens, "tokens")}.`);
            return createDefaultTxTester()
                .startLedger([comptroller, account])
                .doTx([comptroller, "sendRefund", {from: account}])
                .assertSuccess()
                .assertOnlyLog("UserRefunded", {
                    sender: account,
                    numTokens: numTokens,
                    refund: expAmt
                })
                .stopLedger()
                .assertDelta(comptroller, expAmt.mul(-1))
                .assertDeltaMinusTxFee(account, expAmt)
                .start();
        }
        function assertCannotSendRefund(){
            return createDefaultTxTester()
                .doTx([comptroller, "sendRefund", {from: anon}])
                .assertInvalidOpCode()
                .start();
        }

        function assertCannotEndSale(){
            return createDefaultTxTester()
                .doTx([comptroller, "endSale", {from: anon}])
                .assertInvalidOpCode()
                .start();
        }
        function describeSaleNotEnded() {
            describe("Sale has not ended yet.", async function(){
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
                it(".burnTokens() doesn't work.", function(){
                    return assertCannotBurnTokens(account1, 1e15);
                });
                it(".sendRefund() doesn't work.", function(){
                    return assertCannotSendRefund();
                });
            });
        }
        function toEth(n, str) {
            return n.div(1e18).toFixed(5) + ` ${str || "ETH"}`
        }
    });
}