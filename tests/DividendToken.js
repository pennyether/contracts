const DividendToken = artifacts.require("DividendToken");
const UnpayableTokenHolder = artifacts.require("UnpayableTokenHolder");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const accounts = web3.eth.accounts;
const comptroller = accounts[1];
const account1 = accounts[2];
const account2 = accounts[3];
const account3 = accounts[4];
const account4 = accounts[5];
const anon = accounts[6];
const nonAccount = accounts[7];
var token;
var unpayableTokenHolder;

describe('DividendToken', function(){
    before("Initialize TokenCrowdSale", async function(){
        const addresses = {
            comptroller: comptroller,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            anon: anon,
            nonAccount: nonAccount,
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a DividendToken, owned by comptroller.");
        await createDefaultTxTester()
            .doNewTx(DividendToken, [], {from: comptroller})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                token = res.contract;
                plugins.addAddresses({dividendToken: token.address});
            }).start();

        this.logInfo("Create a malicious 'UnpayableTokenHolder' to use later.");
        await createDefaultTxTester()
            .doNewTx(UnpayableTokenHolder, [], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                unpayableTokenHolder = res.contract;
                plugins.addAddresses({unpayableTokenHolder: unpayableTokenHolder.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });
    describe("Is initialized correctly", async function(){
        it("token.comptroller() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "comptroller"], comptroller)
                .start();
        });
    });
    describe(".mintTokens() works", async function(){
        it("Cannot be called by anon", async function(){
            return createDefaultTxTester()
                .doTx([token, "mintTokens", account1, 1000, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Can be called by comptroller", async function(){
            it("Can create 1000 tokens for account1", function(){
                return assertCanMint(account1, 1000);
            });
            it("Can create 2000 tokens for account1", function(){
                return assertCanMint(account2, 2000);
            });
            it("Can create 3000 tokens for account1", function(){
                return assertCanMint(account3, 3000);
            });
            it("Can create 4000 tokens for account1", function(){
                return assertCanMint(account4, 4000);
            });
        });
    });
    describe(".burnTokens() works", async function(){
        it("Cannot be called by anon", async function(){
            return createDefaultTxTester()
                .doTx([token, "burnTokens", account4, 4000, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Cannot burn more tokens than account has", async function(){
            return createDefaultTxTester()
                .doTx([token, "burnTokens", account4, 4001, {from: comptroller}])
                .assertInvalidOpCode()
                .start();
        });
        it("Can burn correctly", async function(){
            await assertCanBurn(account4, 4000);
        });
    });
    describe("Dividends work", async function(){
        itCanReceiveDeposit(6e12);
        itCanGetOwedDividends();
        itCanCollectDividend(1);
        itCanGetOwedDividends();
        itCanReceiveDeposit(12e13)
        itCanGetOwedDividends();
        itCanCollectDividend(1);
        itCanCollectDividend(2);
        itCanCollectDividend(2);
        itCanGetOwedDividends();
    });
    describe("Transfering works", async function(){
        itCanReceiveDeposit(6e14);
        itCanGetOwedDividends();
        it("account3 cannot transfer more than it has.", async function(){
            return assertCannotTransferTooMuch(account3, account4);
        })
        it("account3 can transfer to account4.", async function(){
            return assertCanTransfer(account3, account4);
        });
        itCanGetOwedDividends();
        itCanReceiveDeposit(6e15);
        itCanGetOwedDividends();
    });
    describe(".collectDividends() when account is unpayable", async function(){
        it("Transfer from account4 to unpayableTokenHolder", function(){
            return assertCanTransfer(account4, unpayableTokenHolder.address);
        });
        itCanReceiveDeposit(6e16);
        it(".collectDividends() throws if cannot send", async function(){
            const unpayableAddress = unpayableTokenHolder.address;
            const amount = await token.getOwedDividends(unpayableAddress);
            assert(amount.gt(0), `${amount} should be > 0`);
            return createDefaultTxTester()
                .assertCallReturns([token, "getOwedDividends", unpayableAddress], amount)
                .doTx([unpayableTokenHolder, "collectDividends", token.address])
                    .assertInvalidOpCode()
                .start();
        })
    });
    describe("More dividends while minting and burning", async function(){
        itCanReceiveDeposit(6e16);
        it("Mint tokens for account3", function(){
            return assertCanMint(account3, 5000);
        });
        itCanReceiveDeposit(1e16);
        itCanCollectDividend(0);
        itCanCollectDividend(1);
        itCanCollectDividend(2);
        it("Burn tokens for account1", function(){
            return assertCanBurn(account1, 500);
        })
        itCanReceiveDeposit(6e16);
        itCanCollectDividend(0);
        itCanCollectDividend(1);
        itCanCollectDividend(2);
        itCanCollectDividend(3);
    });


    // These functions keep track of expected dividends, and do assertions against them.
    const trackedAccounts = [account1, account2, account3, account4];
    var expectedTotalDividends = new BigNumber(0);
    var owedDividends = trackedAccounts.map(()=>new BigNumber(0));
    async function itCanReceiveDeposit(amt) {
        amt = new BigNumber(amt);

        // expectDividends calculates owedDividends and expectedTotalDividends
        async function expectDividends(amt) {
            const totalSupply = await token.totalSupply();
            expectedTotalDividends = expectedTotalDividends.plus(amt);
            await Promise.all(trackedAccounts.map((acc, i) => {
                return token.balanceOf(trackedAccounts[i]).then((numTokens)=>{
                    owedDividends[i] = owedDividends[i]
                        .plus(numTokens.mul(amt).div(totalSupply));
                });
            }));
        }

        it(`Can receive deposit of ${amt.div(1e18)} ETH`, async function(){
            await expectDividends(amt);
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: nonAccount, value: amt}])
                .assertSuccess()
                    .assertOnlyLog("DividendReceived", {sender: nonAccount, amount: amt})
                .assertCallReturns([token, "totalDividends"], expectedTotalDividends)
                .start();
        });
    }

    async function itCanGetOwedDividends() {
        it(".getOwedDividends() works", async function(){
            const tester = createDefaultTxTester();
            trackedAccounts.forEach((acc, i)=>{
                const expected = owedDividends[i].floor();
                tester.assertCallReturns([token, "getOwedDividends", acc], expected);
            })
            return tester.start();
        });
    }

    async function itCanCollectDividend(accountNum) {
        it(`account${accountNum+1} collects correct amount.`, function(){
            const account = trackedAccounts[accountNum];
            const expected = owedDividends[accountNum].floor();
            this.logInfo(`account${accountNum} is owed ${expected} Wei and should be payed that exact amount.`);
            return createDefaultTxTester()
                .startLedger([account])
                .doTx([token, "collectDividends", {from: account}])
                .assertSuccess()
                .stopLedger()
                    .assertLog("CollectedDividends", {
                        account: account,
                        amount: expected
                    })
                    .assertDeltaMinusTxFee(account, expected)
                .doFn(() => owedDividends[accountNum] = new BigNumber(0))
                .assertCallReturns([token, "getOwedDividends", account], 0)
                .start();         
        })
    }

    async function assertCanTransfer(from, to, amt) {
        if (!amt){ amt = await token.balanceOf(from); }
        const balanceFrom = await token.balanceOf(from);
        const balanceTo = await token.balanceOf(to);
        return createDefaultTxTester()
            .doTx([token, "transfer", to, amt, {from: from}])
            .assertSuccess()
            .assertOnlyLog("Transfer", {
                from: from,
                to: to,
                amount: amt
            })
            .assertCallReturns([token, "balanceOf", from], balanceFrom.minus(amt))
            .assertCallReturns([token, "balanceOf", to], balanceTo.plus(amt))
            .start();
    }

    async function assertCannotTransferTooMuch(from, to) {
        const amt = (await token.balanceOf(from)).plus(1);
        return createDefaultTxTester()
            .doTx([token, "transfer", to, amt, {from: from}])
            .assertInvalidOpCode()
            .start();
    }

    async function assertCanMint(acct, amount) {
        const expectedBal = (await token.balanceOf(acct)).plus(amount);
        const expectedTotal = (await token.totalSupply()).plus(amount);
        return createDefaultTxTester()
            .doTx([token, "mintTokens", acct, amount, {from: comptroller}])
            .assertSuccess()
            .assertOnlyLog("TokensMinted", {
                account: acct,
                amount: amount,
                newTotalSupply: expectedTotal
            })
            .assertCallReturns([token, "balanceOf", acct], expectedBal)
            .start();
    }
    async function assertCanBurn(acct, amount) {
        const expectedBal = (await token.balanceOf(acct)).minus(amount);
        const expectedTotal = (await token.totalSupply()).minus(amount);
        return createDefaultTxTester()
            .doTx([token, "burnTokens", acct, amount, {from: comptroller}])
            .assertSuccess()
            .assertOnlyLog("TokensBurned", {
                account: acct,
                amount: amount,
                newTotalSupply: expectedTotal
            })
            .assertCallReturns([token, "balanceOf", acct], expectedBal)
            .start();
    }
});