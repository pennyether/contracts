const TokenCrowdSale = artifacts.require("TokenCrowdSale");
const UnpayableTokenHolder = artifacts.require("UnpayableTokenHolder");
const Token = artifacts.require("Token");

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
const account5 = accounts[6];
const random = accounts[7];

describe('TokenCrowdSale', function(){
    var token;
    var tokenCrowdSale;

    before("Initialize TokenCrowdSale", async function(){
        tokenCrowdSale = await TokenCrowdSale.new({from: owner});
        token = Token.at(await tokenCrowdSale.token());
        unpayableTokenHolder = await UnpayableTokenHolder.new();

        const addresses = {
            owner: accounts[1],
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            account5: account5,
            random: random,
            token: token.address,
            tokenCrowdSale: tokenCrowdSale.address,
            UnpayableTokenHolder: unpayableTokenHolder.address
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Initialization worked", async function(){
        it("tokenCrowdSale.owner() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([tokenCrowdSale, "owner"], owner)
                .start();
        });
        it("tokenCrowdSale.token() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([tokenCrowdSale, "token"], token.address)
                .start();
        });
        it("token.crowdSale() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "crowdSale"], tokenCrowdSale.address)
                .start();
        });
        it("token.isMinting is true", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "isMinting"], true)
                .start();
        });
    })
    describe("Minting works as expected", async function(){
        const tokensPerEth = await tokenCrowdSale.tokensPerEth();
        const decimals = (new BigNumber(10)).pow(await token.decimals());
        it(".buyTokens() works", function(){
            const value = new BigNumber(.01e18);
            const expectedTokens = value.mul(tokensPerEth).mul(decimals).div(1e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account1}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account1], expectedTokens)
                .start();
        });
        it(".buyTokens() works", function(){
            const value = new BigNumber(.02e18);
            const expectedTokens = value.mul(tokensPerEth).mul(decimals).div(1e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account2}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account2], expectedTokens)
                .start(); 
        });
        it(".buyTokens() works", function(){
            const value = new BigNumber(.03e18);
            const expectedTokens = value.mul(tokensPerEth).mul(decimals).div(1e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account3}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account3], expectedTokens)
                .start(); 
        });
        it("Token cannot receive dividends", async function(){
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: random, value: 1e18}])
                .assertInvalidOpCode()
                .start();
        });
    });
    describe("TokenCrowdSale.stopSale()", async function(){
        it("Cannot call .stopSale() from nonOwner", function(){
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "stopSale", {from: random}])
                .assertInvalidOpCode()
                .start();
        });
        it(".stopSale() works", async function(){
            return createDefaultTxTester()
                .startWatching([token])
                .doTx([tokenCrowdSale, "stopSale", {from: owner}])
                .assertSuccess()
                .assertCallReturns([token, "isMinting"], false)
                .stopWatching([token])
                    .assertOnlyEvent(token, "StoppedMinting")
                .start();
        });
        it("Cannot call .stopSale() again", async function(){
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "stopSale", {from: owner}])
                .assertInvalidOpCode()
                .start();
        })
        it("Cannot buyTokens", async function(){
            const value = new BigNumber(.04e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account4}])
                .assertInvalidOpCode()
                .start();
        });
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


    // These functions keep track of expected dividends, and do assertions against them.
    var expectedTotalDividends = new BigNumber(0);
    const trackedAccounts = [account1, account2, account3, account4];
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
                .doTx([token, "sendTransaction", {from: random, value: amt}])
                .assertSuccess()
                    .assertOnlyLog("DividendReceived", {sender: random, amount: amt})
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

    async function assertCanTransfer(from, to) {
        const amt = await token.balanceOf(from);
        return createDefaultTxTester()
            .doTx([token, "transfer", to, amt, {from: from}])
            .assertSuccess()
            .assertCallReturns([token, "balanceOf", from], 0)
            .assertCallReturns([token, "balanceOf", to], amt)
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