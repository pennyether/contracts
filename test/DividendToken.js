const Token = artifacts.require("DividendToken");
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
const anybody = accounts[6];
const nonAccount = accounts[7];
var token;
var unpayableTokenHolder;

describe('Token', function(){
    before("Initialize TokenCrowdSale", async function(){
        token = await Token.new({from: comptroller});
        unpayableTokenHolder = await UnpayableTokenHolder.new();

        const addresses = {
            comptroller: comptroller,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            anybody: anybody,
            nonAccount: nonAccount,
            token: token.address,
            unpayableTokenHolder: unpayableTokenHolder.address
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Is initialized correctly", async function(){
        it("token.comptroller() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "comptroller"], comptroller)
                .start();
        });
    });
    describe(".mintTokens() works", async function(){
        it("Cannot be called by anybody", async function(){
            return createDefaultTxTester()
                .doTx([token, "mintTokens", account1, 1000, {from: anybody}])
                .assertInvalidOpCode()
                .start();
        });
        it("Can be called by comptroller", async function(){
            await assertCanMint(account1, 1000);
            await assertCanMint(account2, 2000);
            await assertCanMint(account3, 3000);
            await assertCanMint(account4, 4000);
        });
    });
    describe(".burnTokens works", async function(){
        it("Cannot be called by anybody", async function(){
            return createDefaultTxTester()
                .doTx([token, "burnTokens", account4, 4000, {from: anybody}])
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
        })
    });
    describe("Dividends work", async function(){
        itCanReceiveDeposit(6e12);
        itCanGetCollectableDividends();
        itCanCollectDividend(1);
        itCanGetCollectableDividends();
        itCanReceiveDeposit(12e13)
        itCanGetCollectableDividends();
        itCanCollectDividend(1);
        itCanCollectDividend(2);
        itCanCollectDividend(2);
        itCanGetCollectableDividends();
    });
    describe("Transfering works", async function(){
        itCanReceiveDeposit(6e14);
        itCanGetCollectableDividends();
        it("account3 cannot transfer more than it has.", async function(){
            return assertCannotTransferTooMuch(account3, account4);
        })
        it("account3 can transfer to account4.", async function(){
            return assertCanTransfer(account3, account4);
        });
        itCanGetCollectableDividends();
        itCanReceiveDeposit(6e15);
        itCanGetCollectableDividends();
    });
    describe(".collectDividends() when account is unpayable", async function(){
        it("Transfer from account4 to unpayableTokenHolder", function(){
            return assertCanTransfer(account4, unpayableTokenHolder.address);
        });
        itCanReceiveDeposit(6e16);
        it(".collectDividends() throws if cannot send", async function(){
            const unpayableAddress = unpayableTokenHolder.address;
            const amount = await token.getCollectableDividends(unpayableAddress);
            assert(amount.gt(0), `${amount} should be > 0`);
            return createDefaultTxTester()
                .assertCallReturns([token, "getCollectableDividends", unpayableAddress], amount)
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
    var expectedDividends = trackedAccounts.map(()=>new BigNumber(0));
    async function itCanReceiveDeposit(amt) {
        amt = new BigNumber(amt);

        // expectDividends calculates expectedDividends and expectedTotalDividends
        async function expectDividends(amt) {
            const totalSupply = await token.totalSupply();
            expectedTotalDividends = expectedTotalDividends.plus(amt);
            await Promise.all(trackedAccounts.map((acc, i) => {
                return token.balanceOf(trackedAccounts[i]).then((numTokens)=>{
                    expectedDividends[i] = expectedDividends[i]
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

    async function itCanGetCollectableDividends() {
        it(".getCollectableDividends() works", async function(){
            const tester = createDefaultTxTester();
            trackedAccounts.forEach((acc, i)=>{
                const expected = expectedDividends[i].floor();
                tester.assertCallReturns([token, "getCollectableDividends", acc], expected);
            })
            return tester.start();
        });
    }

    async function itCanCollectDividend(accountNum) {
        it(`account${accountNum+1} collects correct amount.`, function(){
            const account = trackedAccounts[accountNum];
            const expected = expectedDividends[accountNum].floor();
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
                .doFn(() => expectedDividends[accountNum] = new BigNumber(0))
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
            .assertOnlyLog("TokensBurnt", {
                account: acct,
                amount: amount,
                newTotalSupply: expectedTotal
            })
            .assertCallReturns([token, "balanceOf", acct], expectedBal)
            .start();
    }
});