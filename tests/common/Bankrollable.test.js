const TestBankrollable = artifacts.require("TestBankrollable");
const Registry = artifacts.require("Registry");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;
const BankrollableUtils = require("../helpers/BankrollableUtils.js").Create(web3, createDefaultTxTester);

describe('Bankrollable', function(){
    const accounts = web3.eth.accounts;
    const regOwner = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];
    const dummyTreasury = accounts[4];
    const anon = accounts[5];
    const whitelistOwner = accounts[6];
    const whitelisted1 = accounts[7];
    const whitelisted2 = accounts[8];
    var bankrollable;

    before("Set up Treasury", async function(){
        const addresses = {
            regOwner: regOwner,
            account1: account1,
            account2: account2,
            account3: account3,
            dummyTreasury: dummyTreasury,
            anon: anon,
            whitelistOwner: whitelistOwner,
            whitelisted1: whitelisted1,
            whitelisted2: whitelisted2
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a Registry, with TREASURY set.");
        await createDefaultTxTester()
            .doNewTx(Registry, [regOwner], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                registry = res.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register","TREASURY", dummyTreasury, {from: regOwner}])
            .assertSuccess().start();

        this.logInfo("Create the TestBankrollable instance.");
        await createDefaultTxTester()
            .doNewTx(TestBankrollable, [registry.address], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                bankrollable = res.contract;
                plugins.addAddresses({bankrollable: bankrollable.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Adding bankroll", async function(){
        it("Account1 adds bankroll", function(){
            return BankrollableUtils.assertAddsBankroll(bankrollable, account1, 5e9);
        });
        it("Account2 adds bankroll", function(){
            return BankrollableUtils.assertAddsBankroll(bankrollable, account2, 1e10); 
        });
        it("Account1 adds more bankroll", function(){
            return BankrollableUtils.assertAddsBankroll(bankrollable, account1, 1e9);
        });
        it("State is correct", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
    });

    describe("Removing bankroll", async function(){
        it("Account1 removes some bankroll", function(){
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account1, 1e9);
        });
        it("Account2 removes full bankroll by passing a large number", function(){
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account2, 1e18);
        });
    });

    describe("Whitelist", function(){
        this.logInfo("All of the prior tests worked, because there was no whitelist.");
        this.logInfo("In these tests we ensure the whitelist is modifiable and enforced.");

        before("Set whitelist owner", function(){
            return createDefaultTxTester()
                .doTx([bankrollable, "setWhitelistOwner", whitelistOwner, {from: anon}])
                .assertSuccess()
                .start();
        });
        describe(".addToWhitelist()", function(){
            it("Not callable by anon", function(){
                return BankrollableUtils.assertNotAddsToWhitelist(bankrollable, whitelisted1, anon);
            });
            it("Adds whitelisted1", function(){
                return BankrollableUtils.assertAddsToWhitelist(bankrollable, whitelisted1, whitelistOwner);
            });
            it("Works again, but doesnt log", function(){
                return BankrollableUtils.assertAddsToWhitelist(bankrollable, whitelisted1, whitelistOwner);
            });
            it("Enforces whitelist: blocks non-whitelisted", function(){
                return BankrollableUtils.assertNotAddsBankroll(bankrollable, account1, 1e9);
            });
            it("Enforces whitelist: allows whitelisted", function(){
                return BankrollableUtils.assertAddsBankroll(bankrollable, whitelisted1, 1e9);
            });
            it("Adds whitelisted2", function(){
                return BankrollableUtils.assertAddsToWhitelist(bankrollable, whitelisted2, whitelistOwner);
            });
        });
        describe(".removeFromWhitelist()", function(){
            it("Not callable by anon", function(){
                return BankrollableUtils.assertNotRemovesFromWhitelist(bankrollable, whitelisted1, anon);
            });
            it("Removes whitelisted1", function(){
                return BankrollableUtils.assertRemovesFromWhitelist(bankrollable, whitelisted1, whitelistOwner);
            });
            it("Works again, but doesnt log", function(){
                return BankrollableUtils.assertRemovesFromWhitelist(bankrollable, whitelisted1, whitelistOwner);
            });
            it("Enforces whitelist: blocks previously-whitelisted", function(){
                return BankrollableUtils.assertNotAddsBankroll(bankrollable, whitelisted1, 1e9);
            });
            it("Enforces whitelist: allows whitelisted", function(){
                return BankrollableUtils.assertAddsBankroll(bankrollable, whitelisted2, 1e9);
            });
        });
        describe("Empty out the whitelist", function(){
            it("Remove whitelisted2", function(){
                return BankrollableUtils.assertRemovesFromWhitelist(bankrollable, whitelisted2, whitelistOwner);
            });
            it("Ignores empty whitelist again", function(){
                return BankrollableUtils.assertAddsBankroll(bankrollable, account3, 1e9);
            });
        })
    });

    // Account 1 has 5GWei in bankroll.
    describe("When insolvant (balance < collateral)", function(){
        before("Set collateral to 2 GWei, and set balance to 1 Gwei", async function(){
            this.logInfo("First we set collateral to 2 GWei");
            await createDefaultTxTester()
                .doTx([bankrollable, "setCollateral", 2e9, {from: anon}])
                .assertSuccess()
                .assertCallReturns([bankrollable, "getCollateral"], 2e9)
                .start();

            this.logInfo("");
            this.logInfo("Next we remove balance so that balance == 1 GWei");
            const curBalance = testUtil.getBalance(bankrollable);
            const toSend = curBalance.minus(1e9);
            await createDefaultTxTester()
                .doTx([bankrollable, "removeBalance", toSend, {from: anon}])
                .assertSuccess()
                .start();

            const collat = await bankrollable.getCollateral();
            const balance = testUtil.getBalance(bankrollable);
            const bankroll = await bankrollable.bankroll();
            const profitThreshold = bankroll.plus(collat);
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            this.logInfo(`Collateral:           ${collat}`);
            this.logInfo(`Balance:              ${balance}`);
            this.logInfo(`Bankroll:             ${bankroll}`);
            this.logInfo(`Profit Threshold:     ${profitThreshold}`);
            this.logInfo(`Account1 Bankrolled:  ${acct1Bankrolled}`);

            // make sure account1 has some bankrolled, and Balance < Collateral
            assert(acct1Bankrolled.gt(0), "Account1 has > 0 GWei bankrolled.");
            assert(testUtil.getBalance(bankrollable).lt(collat), "Balance < Collateral");
            this.logInfo("");
            this.logInfo("Account1 has some amount bankrolled, and Balance < Collateral.");
        });
        it(".bankrollAvilable() and .profits() should be zero", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".removeBankroll() cannot remove anything.", function(){
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account1, 5e9);
        });
        it(".sendProfits() sends nothing", function(){
            return BankrollableUtils.assertSendsProfits(bankrollable, anon);
        });
    });

    describe("When not-profitable (collat < balance < bankroll)", function(){
        before("Send Ether so that collateral < balance < bankroll", async function(){
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            const curBalance = testUtil.getBalance(bankrollable);

            this.logInfo("Send funds so that balance is 1 Gwei below acct1Bankrolled");
            const toReceive = acct1Bankrolled.minus(curBalance).minus(1e9);
            await createDefaultTxTester()
                .doTx([bankrollable, "receive", {value: toReceive, from: anon}])
                .assertSuccess()
                .start();

            // Print everything, and do assertions.
            const collat = await bankrollable.getCollateral();
            const balance = testUtil.getBalance(bankrollable);
            const bankroll = await bankrollable.bankroll();
            const profitThreshold = bankroll.plus(collat);
            this.logInfo(`Collateral:           ${collat}`);
            this.logInfo(`Balance:              ${balance}`);
            this.logInfo(`Bankroll:             ${bankroll}`);
            this.logInfo(`Profit Threshold:     ${profitThreshold}`);
            this.logInfo(`Account1 Bankrolled:  ${acct1Bankrolled}`);
            assert(collat.lt(balance), "Collateral < Balance");
            assert(balance.lt(acct1Bankrolled), "Balance < acct1Bankrolled");

            this.logInfo("");
            this.logInfo("Collateral < Balance, and Balance < acct1Bankrolled");
        });
        it(".bankrollAvilable() returns >0 GWei, .profits() returns negative", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".sendProfits() sends nothing", function(){
            return BankrollableUtils.assertSendsProfits(bankrollable, anon);
        });
        it(".removeBankroll() removes limited amount", async function(){
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            this.logInfo("Account1 should only be able to remove a limited amount.");
            this.logInfo("This maintains a balance above the collateral.");
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account1, acct1Bankrolled);
        });
        it(".bankrollAvilable() returns 0, .profits() returns negative", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
    });

    describe("When profitable (balance > collat + bankroll)", async function(){
        before("Send Ether so that balance > profit threshold.", async function(){
            await createDefaultTxTester()
                .doTx([bankrollable, "receive", {value: 1e12, from: anon}])
                .assertSuccess()
                .start();

            const balance = testUtil.getBalance(bankrollable);
            const bankroll = await bankrollable.bankroll();
            const collat = await bankrollable.getCollateral();
            const profitThreshold = bankroll.plus(collat);
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            this.logInfo(`Collateral:           ${collat}`);
            this.logInfo(`Balance:              ${balance}`);
            this.logInfo(`Bankroll:             ${bankroll}`);
            this.logInfo(`Profit Threshold:     ${profitThreshold}`);
            this.logInfo(`Account1 Bankrolled:  ${acct1Bankrolled}`);
            assert(balance.gt(profitThreshold), "Balance > ProfitThreshold");
            assert(acct1Bankrolled.gt(0), "acct1Bankrolled > 0");

            this.logInfo("");
            this.logInfo("Balance > ProfitThreshold, and acct1Bankrolled > 0");
        });
        it(".bankrollAvilable(), .profits() returns non-zero values", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".removeBankroll() works", function(){
            this.logInfo("This should remove account 1's remaining bankroll");
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account1, 1e20);
        });
        it(".bankrollAvilable() decreases, .profits() remains the same", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".sendProfits() works", function(){
            return BankrollableUtils.assertSendsProfits(bankrollable, anon);
        });
        it(".bankrollAvilable() remains the same, .profits() is now 0", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
    });
});