const Token = artifacts.require("DividendToken");
const UnpayableTokenHolder = artifacts.require("UnpayableTokenHolder");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const accounts = web3.eth.accounts;
const owner = accounts[1];
const account1 = accounts[2];
const account2 = accounts[3];
const account3 = accounts[4];
const account4 = accounts[5];
const nonOwner = accounts[6];
const nonAccount = accounts[7];
var token;
var unpayableTokenHolder;

describe('Token', function(){
    before("Initialize TokenCrowdSale", async function(){
        token = await Token.new({from: owner});
        unpayableTokenHolder = await UnpayableTokenHolder.new();

        const addresses = {
            owner: owner,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            nonOwner: nonOwner,
            nonAccount: nonAccount,
            token: token.address,
            unpayableTokenHolder: unpayableTokenHolder.address
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Is initialized correctly", async function(){
        it("token.owner() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "owner"], owner)
                .start();
        });
        it("token.isMinting is true", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "isMinting"], true)
                .start();
        });
    });
    describe(".mintTokens() works", async function(){
        it("Cannot be called by nonOwner", async function(){
            return createDefaultTxTester()
                .doTx([token, "mintTokens", account1, 1000, {from: nonOwner}])
                .assertInvalidOpCode()
                .start();
        });
        it(".buyTokens() works", function(){
            return createDefaultTxTester()
                .doTx([token, "mintTokens", account1, 1000, {from: owner}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account1], 1000)
                .doTx([token, "mintTokens", account2, 2000, {from: owner}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account2], 2000)
                .doTx([token, "mintTokens", account3, 3000, {from: owner}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account3], 3000)
                .start();
        });
    });
    describe(".stopMinting() works", async function(){
        it("Cannot be called by nonOwner", async function(){
            return createDefaultTxTester()
                .doTx([token, "stopMinting", {from: nonOwner}])
                .assertInvalidOpCode()
                .start();
        });
        it("Works", function(){
            return createDefaultTxTester()
                .doTx([token, "stopMinting", {from: owner}])
                .assertSuccess()
                .assertCallReturns([token, "isMinting"], false)
                .start();
        });
    })
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
    describe("Dividends fail gracefully if tokenHolder cannot get paid.", async function(){
        it("Transfer from account4 to unpayableTokenHolder", function(){
            return assertCanTransfer(account4, unpayableTokenHolder.address);
        });
        itCanReceiveDeposit(6e16);
        it(".collectDividends() fails gracefully", async function(){
            const unpayableAddress = unpayableTokenHolder.address;
            const amount = await token.getCollectableDividends(unpayableAddress);
            assert(amount.gt(0), `${amount} should be > 0`);
            return createDefaultTxTester()
                .assertCallReturns([token, "getCollectableDividends", unpayableAddress], amount)
                .startLedger([token, unpayableAddress])
                .startWatching([token])
                .doTx([unpayableTokenHolder, "collectDividends", token.address])
                .assertSuccess()
                .stopLedger()
                    .assertNoDelta(token)
                    .assertNoDelta(unpayableAddress)
                .stopWatching()
                    .assertOnlyEvent(token, "CollectDividendsFailure", {account: unpayableAddress})
                .assertCallReturns([token, "getCollectableDividends", unpayableAddress], amount)
                .start();
        })
    });
    describe("Voting works", function(){
        var expectedTotalVotes = new BigNumber(0);
        it("account1 can cast some votes", function(){
            return createDefaultTxTester()
                .doTx([token, "castVotes", 100, {from: account1}])
                .assertSuccess()
                .assertOnlyLog("VotesCast", {
                    sender: account1,
                    amount: 100,
                    oldTotalVotes: 0,
                    newTotalVotes: 100
                })
                .assertCallReturns([token, "numVotes", account1], 100)
                .assertCallReturns([token, "totalVotes"], 100)
                .start();
        });
        it("account1 can cast 0 votes", function(){
            return createDefaultTxTester()
                .doTx([token, "castVotes", 0, {from: account1}])
                .assertSuccess()
                .assertOnlyLog("VotesCast", {
                    sender: account1,
                    amount: 0,
                    oldTotalVotes: 100,
                    newTotalVotes: 0
                })
                .assertCallReturns([token, "numVotes", account1], 0)
                .assertCallReturns([token, "totalVotes"], 0)
                .start();
        });
        it("account1 can change their votes to all", async function(){
            const balance = await token.balanceOf(account1);
            expectedTotalVotes = expectedTotalVotes.plus(balance);
            return createDefaultTxTester()
                .doTx([token, "castVotes", 1e50, {from: account1}])
                .assertSuccess()
                .assertOnlyLog("VotesCast", {
                    sender: account1,
                    amount: expectedTotalVotes,
                    oldTotalVotes: 0,
                    newTotalVotes: expectedTotalVotes
                })
                .assertCallReturns([token, "numVotes", account1], balance)
                .assertCallReturns([token, "totalVotes"], expectedTotalVotes)
                .start();
        });
        it("account2 can cast some votes", async function(){
            const balance = await token.balanceOf(account1);
            const numVotes = balance.div(2);
            const expectedOldTotalVotes = expectedTotalVotes;
            expectedTotalVotes = expectedTotalVotes.plus(numVotes);
            return createDefaultTxTester()
                .doTx([token, "castVotes", numVotes, {from: account2}])
                .assertSuccess()
                .assertOnlyLog("VotesCast", {
                    sender: account2,
                    amount: numVotes,
                    oldTotalVotes: expectedOldTotalVotes,
                    newTotalVotes: expectedTotalVotes
                })
                .assertCallReturns([token, "numVotes", account2], numVotes)
                .assertCallReturns([token, "totalVotes"], expectedTotalVotes)
                .start();
        });
        // If account1 sends, and is left with less balance than votes
        // then its votes should be reduced to match its new balance.
        it("Transferring from account1 to account2 reduces votes.", async function(){
            const balance1 = await token.balanceOf(account1);
            const numVotes1 = await token.numVotes(account1);
            const numVotes2 = await token.numVotes(account2);
            assert(balance1.equals(numVotes1), "Account1 should have all their votes cast");
            const totalVotes = await token.totalVotes();
            const toTransfer = balance1.div(2);

            await assertCanTransfer(account1, account2, toTransfer);
            return createDefaultTxTester()
                .assertCallReturns([token, "numVotes", account1], numVotes1.minus(toTransfer))
                .assertCallReturns([token, "numVotes", account2], numVotes2)
                .assertCallReturns([token, "totalVotes"], totalVotes.minus(toTransfer))
                .start();
        });
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
            await Promise.all(
                trackedAccounts.map((acc, i) => {
                    return token.balanceOf(trackedAccounts[i]).then((numTokens)=>{
                        expectedDividends[i] = expectedDividends[i]
                            .plus(numTokens.mul(amt).div(totalSupply));
                    });
                })
            );
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
                tester.assertCallReturns([token, "getCollectableDividends", acc], expectedDividends[i]);
            })
            return tester.start();
        });
    }

    async function itCanCollectDividend(accountNum) {
        it(`account${accountNum+1} collects correct amount.`, function(){
            const account = trackedAccounts[accountNum];
            return createDefaultTxTester()
                .startLedger([account])
                .doTx([token, "collectDividends", {from: account}])
                .assertSuccess()
                .stopLedger()
                    .assertLog("CollectDividendsSuccess", {
                        account: account,
                        amount: expectedDividends[accountNum]
                    })
                    .assertDeltaMinusTxFee(account, expectedDividends[accountNum])
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
});