const Ledger = artifacts.require("Ledger");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('Ledger', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];
    const account4 = accounts[4];
    const account5 = accounts[5];
    const anon = accounts[6];
    var ledger;

    before("Set up Ledger", async function(){
        const addresses = {
            owner: owner,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            account5: account5,
            anon: anon
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a Ledger");
        await createDefaultTxTester()
            .doNewTx(Ledger, [owner], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                ledger = res.contract;
                plugins.addAddresses({ledger: ledger.address});
            }).start();
    });

    describe("Add / Subtract not callable by non-owner", function(){
        it(".add() fails", function(){
            return createDefaultTxTester()
                .doTx([ledger, "add", account1, 1e12, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it(".subtract() fails", function(){
            return createDefaultTxTester()
                .doTx([ledger, "subtract", account1, 1e12, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
    });

    describe("Add / Subtract from Ledger", function(){
        this.logInfo("Each of these tests asserts expected ledgerTotal and mappings.");
        this.logInfo("We will test a large variety of cases.");

        it("Adds to account1", function(){
            return assertAdds(account1, 2e9);
        });
        it("Removes some of account1", function(){
            return assertSubtracts(account1, 1e9);
        });
        it("Removes rest of account1, when high value passed", function(){
            return assertSubtracts(account1, 5e9);
        });
        it("Adds account2", function(){
            return assertAdds(account2, 1e9);
        });
        it("Adds more to account2", function(){
            return assertAdds(account2, 1e9);  
        });
        it("Adds account3", function(){
            return assertAdds(account3, 3e9);
        });
        it("Adds account4", function(){
            return assertAdds(account4, 4e9);
        });
        it("Adds account1", function(){
            return assertAdds(account1, 1e9);
        });
        it("Removes account3", function(){
            return assertSubtracts(account3, 3e9);
        });
        it("Leaves 1 wei in account4", function(){
            return assertSubtracts(account4, (new BigNumber(4e9)).minus(1));
        });
        it("Removes account4", function(){
            return assertSubtracts(account4, 1); 
        });
        it("Removes account1", function(){
            return assertSubtracts(account1, 1e9);
        });
        it("Removes account1 (again)", function(){
            return assertSubtracts(account4, 4e9);
        })
    });

    const EXP_ENTRIES = [];
    var EXP_TOTAL = new BigNumber(0);
    function getExpEntries() {
        const addresses = EXP_ENTRIES.map(e => e[0]);
        const values = EXP_ENTRIES.map(e => e[1]);
        return [addresses, values];
    }

    function assertAdds(acct, amt) {
        amt = new BigNumber(amt);

        var expBalance;
        const entry = EXP_ENTRIES.find(e => e[0]==acct);
        if (entry) {
            console.log("Entry should be increased.");
            entry[1] = entry[1].plus(amt);
            expBalance = entry[1];
        } else {
            console.log("Entry should be added to front of mappings.");
            EXP_ENTRIES.unshift([acct, amt]);
            expBalance = amt;
        }
        EXP_TOTAL = EXP_TOTAL.plus(amt);

        return createDefaultTxTester()
            .doTx([ledger, "add", acct, amt, {from: owner}])
            .assertSuccess()
            .assertCallReturns([ledger, "total"], EXP_TOTAL)
            .assertCallReturns([ledger, "balanceOf", acct], expBalance)
            .assertCallReturns([ledger, "balances"], getExpEntries())
            .start();
    }

    function assertSubtracts(acct, amt) {
        amt = new BigNumber(amt);

        var expBalance = new BigNumber(0);
        var expSubtracted;
        const entry = EXP_ENTRIES.find(e => e[0]==acct);
        if (entry) {
            if (entry[1].gt(amt)) {
                console.log("Entry should be decreased.");
                entry[1] = entry[1].minus(amt);
                expBalance = entry[1];
                expSubtracted = amt;
            } else {
                console.log("Entry should be removed from ledger.");
                const index = EXP_ENTRIES.indexOf(entry);
                EXP_ENTRIES.splice(index, 1);
                expSubtracted = entry[1];
            }
        } else {
            console.log("Entry doesn't exist. Nothing should change.")
            expSubtracted = new BigNumber(0);
        }
        EXP_TOTAL = EXP_TOTAL.minus(expSubtracted);

        return createDefaultTxTester()
            .doTx([ledger, "subtract", acct, amt, {from: owner}])
            .assertSuccess()
            .assertCallReturns([ledger, "total"], EXP_TOTAL)
            .assertCallReturns([ledger, "balanceOf", acct], expBalance)
            .assertCallReturns([ledger, "balances"], getExpEntries())
            .start();
    }

});