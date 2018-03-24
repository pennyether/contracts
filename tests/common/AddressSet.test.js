const AddressSet = artifacts.require("AddressSet");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('AddressSet', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const account3 = accounts[3];
    const account4 = accounts[4];
    const account5 = accounts[5];
    const anon = accounts[6];
    var set;

    before("Set up AddressSet", async function(){
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

        this.logInfo("Create an AddressSet");
        await createDefaultTxTester()
            .doNewTx(AddressSet, [owner], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                set = res.contract;
                plugins.addAddresses({set: set.address});
            }).start();
    });

    describe("Add / Remove not callable by non-owner", function(){
        it(".add() fails", function(){
            return createDefaultTxTester()
                .doTx([set, "add", account1, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it(".remove() fails", function(){
            return createDefaultTxTester()
                .doTx([set, "remove", account1, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
    });

    describe("Add / Subtract from Ledger", function(){
        this.logInfo("We will test a large variety of cases.");

        it("Add account1", function(){
            return assertAdds(account1);
        });
        it("Removes account1", function(){
            return assertRemoves(account1);
        });
        it("Add account1", function(){
            return assertAdds(account1);
        });
        it("Add account1 (again)", function(){
            return assertAdds(account1);
        });

        it("Add account2", function(){
            return assertAdds(account2);
        });
        it("Removes account2", function(){
            return assertRemoves(account2);
        });
        it("Removes account2 (again)", function(){
            return assertRemoves(account2);
        });
        it("Add account2", function(){
            return assertAdds(account2);
        });

        it("Add account3", function(){
            return assertAdds(account3);
        });
        it("Add account4", function(){
            return assertAdds(account4);
        });
        it("Add account5", function(){
            return assertAdds(account5);
        });

        it("Removes account3", function(){
            return assertRemoves(account3);
        });
        it("Removes account2", function(){
            return assertRemoves(account2);
        });
        it("Removes account4", function(){
            return assertRemoves(account4);
        });
        it("Removes account1", function(){
            return assertRemoves(account1);
        });
        it("Removes account5", function(){
            return assertRemoves(account5);
        });
    });

    const ACCOUNTS = [];
    function assertAdds(acct) {
        const has = ACCOUNTS.some(a => a==acct);
        if (has) {
            console.log("Entry already added");
        } else {
            console.log("Entry should be added to front of mappings.");
            ACCOUNTS.unshift(acct);
        }

        return createDefaultTxTester()
            .doTx([set, "add", acct, {from: owner}])
            .assertSuccess()
            .assertCallReturns([set, "size"], ACCOUNTS.length)
            .assertCallReturns([set, "has", acct], true)
            .assertCallReturns([set, "addresses"], ACCOUNTS)
            .start();
    }

    function assertRemoves(acct) {
        const has = ACCOUNTS.some(a => a==acct);
        if (has) {
            console.log("Entry should be deleted");
            const index = ACCOUNTS.indexOf(acct);
            ACCOUNTS.splice(index, 1);
        } else {
            console.log("Entry already removed.");
        }

        return createDefaultTxTester()
            .doTx([set, "remove", acct, {from: owner}])
            .assertSuccess()
            .assertCallReturns([set, "size"], ACCOUNTS.length)
            .assertCallReturns([set, "has", acct], false)
            .assertCallReturns([set, "addresses"], ACCOUNTS)
            .start();
    }

});