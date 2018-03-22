const TestBankrollable = artifacts.require("TestBankrollable");
const Registry = artifacts.require("Registry");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;
const BankrollableUtils = require("./helpers/BankrollableUtils.js").Create(web3, createDefaultTxTester);

describe('Bankrollable', function(){
    const accounts = web3.eth.accounts;
    const regOwner = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];
    const dummyTreasury = accounts[4];
    const anon = accounts[5];
    var bankrollable;

    before("Set up Treasury", async function(){
        const addresses = {
            regOwner: regOwner,
            account1: account1,
            account2: account2,
            account3: account3,
            dummyTreasury: dummyTreasury,
            anon: anon
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
            return BankrollableUtils.assertAddsBankroll(bankrollable, account1, 1e9)
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

    // Account 1 has 5GWei in bankroll.
    describe("When insolvant (balance < collateral)", function(){
        before("Set collateral to 2 GWei, and set balance to 1 Gwei", async function(){
            this.logInfo("First we set collateral to 2 GWei");
            await createDefaultTxTester()
                .doTx([bankrollable, "setCollateral", 2e9, {from: anon}])
                .assertSuccess()
                .start();

            const collat = await bankrollable.getCollateral();
            assert(collat.equals(2e9), "Collateral == 2 GWei");

            this.logInfo("");
            this.logInfo("Next we remove balance so that balance == 1 GWei");
            const balance = testUtil.getBalance(bankrollable);
            const toSend = balance.minus(1e9);
            await createDefaultTxTester()
                .doTx([bankrollable, "removeBalance", toSend, {from: anon}])
                .assertSuccess()
                .start();
            assert(testUtil.getBalance(bankrollable).equals(1e9), "Balance == 1 GWei");

            // make sure account1 has bankrolled 5gwei, and bankroll < collateral
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            assert(acct1Bankrolled.equals(5e9), "Account1 has 5 GWei bankrolled.");
            assert(testUtil.getBalance(bankrollable).lt(collat), "Bankroll < collateral");
            assert((await bankrollable.bankroll()).equals(5e9), "Bankroll == 5 GWei");
            this.logInfo("");
            this.logInfo("Account1 has 5GWei bankrolled, and bankroll < collateral.");
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

    describe("When not-profitable (collat < balance < collat+bankroll)", function(){
        before("Send Ether so that collateral < balance < profit-threshold", async function(){
            const collat = await bankrollable.getCollateral();
            const profitThreshold = (await bankrollable.bankroll()).plus(collat);
            const balance = testUtil.getBalance(bankrollable);

            this.logInfo("Send funds so that balance is 1 Gwei below profit threshold.");
            const toReceive = profitThreshold.minus(balance).minus(1e9);
            await createDefaultTxTester()
                .doTx([bankrollable, "receive", {value: toReceive, from: anon}])
                .assertSuccess()
                .start();

            // make sure account1 has bankrolled expected amount
            this.logInfo("Bankroll: 5 Gwei (account 1)");
            this.logInfo("Collateral: 2 GWei");
            this.logInfo("Profit Threshold: 7 Gwei");
            this.logInfo("Balance: 6 GWei");
            const bankroll = await bankrollable.bankroll();
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            const newBalance = testUtil.getBalance(bankrollable);
            assert(bankroll.equals(5e9), "Bankroll is 5 GWei");
            assert(acct1Bankrolled.equals(5e9), "Account1 has 5 GWei bankrolled.");
            assert(collat.equals(2e9), "Collateral is 2 GWei");
            assert(profitThreshold.equals(7e9), "Profit Threshold is 7 GWei");
            assert(newBalance.equals(6e9), "Balance is 6 GWei");
        });
        it(".bankrollAvilable() returns 4 GWei, .getProfits() returns 0", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".sendProfits() sends nothing", function(){
            return BankrollableUtils.assertSendsProfits(bankrollable, anon);
        });
        it(".removeBankroll() removes limited amount", function(){
            this.logInfo("Account 1 should only be able to remove 4 GWei of bankroll.");
            this.logInfo("This maintains a balance above the collateral.");
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account1, 10e9);
        });
        it(".bankrollAvilable() returns 0, .getProfits() returns 0", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
    });

    describe("When profitable (balance > collat + bankroll)", async function(){
        before("Send Ether so that balance > profit threshold.", async function(){
            await createDefaultTxTester()
                .doTx([bankrollable, "receive", {value: 3e9, from: anon}])
                .assertSuccess()
                .start();

            this.logInfo("Bankroll: 1 Gwei (account 1)");
            this.logInfo("Collateral: 2 GWei");
            this.logInfo("Profit Threshold: 3 Gwei");
            this.logInfo("Balance: 5 GWei");
            const bankroll = await bankrollable.bankroll();
            const acct1Bankrolled = await bankrollable.bankrolledBy(account1);
            const collat = await bankrollable.getCollateral();
            const profitThreshold = bankroll.plus(collat);
            const balance = testUtil.getBalance(bankrollable);
            assert(bankroll.equals(1e9), "Bankroll is 1 GWei");
            assert(acct1Bankrolled.equals(1e9), "Account1 has 1 GWei bankrolled.");
            assert(collat.equals(2e9), "Collateral is 2 GWei");
            assert(profitThreshold.equals(3e9), "Profit Threshold is 3 GWei");
            assert(balance.equals(5e9), "Balance is 5 GWei");
        });
        it(".bankrollAvilable() returns 1 GWei, .getProfits() returns 2 Gwei", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".removeBankroll() works", function(){
            this.logInfo("This should remove account 1's remaining 1 GWei of bankroll");
            return BankrollableUtils.assertRemovesBankroll(bankrollable, account1, 10e9);
        });
        it(".bankrollAvilable() returns 0 GWei, .getProfits() returns 2 Gwei", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
        it(".sendProfits() works", function(){
            return BankrollableUtils.assertSendsProfits(bankrollable, anon);
        });
        it(".bankrollAvilable() returns 1 GWei, .getProfits() returns 0 Gwei", function(){
            return BankrollableUtils.assertState(bankrollable);
        });
    });
});