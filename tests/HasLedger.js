const TestLedger = artifacts.require("TestLedger");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('HasLedger', function(){
    const accounts = web3.eth.accounts;
    const anon = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];
    const account4 = accounts[4];
    const account5 = accounts[5];
    var testLedger;

    before("Set up Treasury", async function(){
        const addresses = {
            anon: anon,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            account5: account5
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a TestLedger");
        await createDefaultTxTester()
            .doNewTx(TestLedger, [], {from: account1})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                testLedger = res.contract;
                plugins.addAddresses({testLedger: testLedger.address});
            }).start();
    });

    describe("Add / Subtract from Ledger", function(){
        this.logInfo("Each of these tests asserts expected ledgerTotal and mappings.");
        this.logInfo("We will test a large variety of cases.");

        it("Adds to account1", function(){
            return assertAddsToLedger(account1, 2e9);
        });
        it("Removes some of account1", function(){
            return assertSubtractsFromLedger(account1, 1e9);
        });
        it("Removes rest of account1, when high value passed", function(){
            return assertSubtractsFromLedger(account1, 5e9);
        });
        it("Adds account2", function(){
            return assertAddsToLedger(account2, 1e9);
        });
        it("Adds more to account2", function(){
            return assertAddsToLedger(account2, 1e9);  
        });
        it("Adds account3", function(){
            return assertAddsToLedger(account3, 3e9);
        });
        it("Adds account4", function(){
            return assertAddsToLedger(account4, 4e9);
        });
        it("Adds account1", function(){
            return assertAddsToLedger(account1, 1e9);
        });
        it("Removes account3", function(){
            return assertSubtractsFromLedger(account3, 3e9);
        });
        it("Leaves 1 wei in account4", function(){
            return assertSubtractsFromLedger(account4, (new BigNumber(4e9)).minus(1));
        });
        it("Removes account4", function(){
            return assertSubtractsFromLedger(account4, 1); 
        });
        it("Removes account1", function(){
            return assertSubtractsFromLedger(account1, 1e9);
        });
        it("Removes account1 (again)", function(){
            return assertSubtractsFromLedger(account4, 4e9);
        })
    });

    const EXP_ENTRIES = [];
    var EXP_TOTAL = new BigNumber(0);
    function getExpEntries() {
        const addresses = EXP_ENTRIES.map(e => e[0]);
        const values = EXP_ENTRIES.map(e => e[1]);
        return [addresses, values];
    }

    function assertAddsToLedger(acct, amt) {
        amt = new BigNumber(amt);

        const entry = EXP_ENTRIES.find(e => e[0]==acct);
        if (entry) {
            console.log("Entry should be increased.");
            entry[1] = entry[1].plus(amt);
        } else {
            console.log("Entry should be added to front of mappings.");
            EXP_ENTRIES.unshift([acct, amt]);
        }
        EXP_TOTAL = EXP_TOTAL.plus(amt);

        return createDefaultTxTester()
            .doTx([testLedger, "addToLedger", acct, amt, {from: anon}])
            .assertSuccess()
            .assertCallReturns([testLedger, "getLedgerTotal"], EXP_TOTAL)
            .assertCallReturns([testLedger, "getLedger"], getExpEntries())
            .start();
    }

    function assertSubtractsFromLedger(acct, amt) {
        amt = new BigNumber(amt);

        var expAmt = amt;
        const entry = EXP_ENTRIES.find(e => e[0]==acct);
        if (entry) {
            if (entry[1].gt(amt)) {
                console.log("Entry should be decreased.");
                entry[1] = entry[1].minus(amt);
            } else {
                console.log("Entry should be removed from ledger.");
                expAmt = entry[1];
                const index = EXP_ENTRIES.indexOf(entry);
                EXP_ENTRIES.splice(index, 1);
            }
        } else {
            console.log("Entry doesn't exist. Nothing should change.")
            expAmt = 0;
        }
        EXP_TOTAL = EXP_TOTAL.minus(expAmt);

        return createDefaultTxTester()
            .doTx([testLedger, "subtractFromLedger", acct, amt, {from: anon}])
            .assertSuccess()
            .assertCallReturns([testLedger, "getLedgerTotal"], EXP_TOTAL)
            .assertCallReturns([testLedger, "getLedger"], getExpEntries())
            .start();
    }

});