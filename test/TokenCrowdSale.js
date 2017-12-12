const TokenCrowdSale = artifacts.require("TokenCrowdSale");
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
const trackedAccounts = [account1, account2, account3, account4];

describe('TokenCrowdSale', function(){
    var token;
    var tokenCrowdSale;
    var decimals;

    before("Initialize TokenCrowdSale", async function(){
        tokenCrowdSale = await TokenCrowdSale.new({from: owner});
        token = Token.at(await tokenCrowdSale.token());
        decimals = (new BigNumber(10)).pow(await token.decimals());

        const addresses = {
            owner: accounts[1],
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            account5: account5,
            random: random,
            token: token.address,
            tokenCrowdSale: tokenCrowdSale.address
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Initialization worked", async function(){
        it("token.isMinting is true", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "isMinting"], true)
                .start();
        });
        it("token.crowdSale() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "crowdSale"], tokenCrowdSale.address)
                .start();
        });
        it("tokenCrowdSale.owner() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([tokenCrowdSale, "owner"], owner)
                .start();
        })
    })
    describe("Minting works as expected", async function(){
        it(".buyTokens() works", function(){
            const value = new BigNumber(.01e18);
            const expectedTokens = value.mul(2000).mul(decimals).div(1e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account1}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account1], expectedTokens)
                .start();
        });
        it(".buyTokens() works", function(){
            const value = new BigNumber(.02e18);
            const expectedTokens = value.mul(2000).mul(decimals).div(1e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account2}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account2], expectedTokens)
                .start(); 
        });
        it(".buyTokens() works", function(){
            const value = new BigNumber(.03e18);
            const expectedTokens = value.mul(2000).mul(decimals).div(1e18);
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
        it("Transfer from account3 to account4.", async function(){
            const amt = await token.balanceOf(account3);
            return createDefaultTxTester()
                .doTx([token, "transfer", account4, amt, {from: account3}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account3], 0)
                .assertCallReturns([token, "balanceOf", account4], amt)
                .start();
        });
        itCanGetCollectableDividends();
        itCanReceiveDeposit(6e15);
        itCanGetCollectableDividends();
    });

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
});