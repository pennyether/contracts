const TokenCrowdSale = artifacts.require("TokenCrowdSale");
const Token = artifacts.require("Token");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('TokenCrowdSale', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[1];
    const account1 = accounts[2];
    const account2 = accounts[3];
    const account3 = accounts[4];
    const account4 = accounts[5];
    const account5 = accounts[6];
    var token;
    var tokenCrowdSale;
    var decimals;

    before("Initialize TokenCrowdSale", async function(){
        tokenCrowdSale = await TokenCrowdSale.new();
        token = Token.at(await tokenCrowdSale.token());
        decimals = (new BigNumber(10)).pow(await token.decimals());

        const addresses = {
            owner: owner,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            account5: account5,
            token: token.address,
            tokenCrowdSale: tokenCrowdSale.address
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
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
        it("Stop minting", async function(){
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "stopSale"])
                .assertSuccess()
                .start();
        });
    });
    describe("Dividends work", async function(){
        it("Deposit 1e15", async function(){
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: account4, value: 6e15}])
                .assertSuccess()
                .start();
        });
        it("account1 should get 1/6 of dividends", async function(){
            return createDefaultTxTester()
                .startLedger([account1])
                .doTx([token, "collectDividends", {from: account1}])
                .assertSuccess()
                .stopLedger()
                .assertDeltaMinusTxFee(account1, new BigNumber(1e15))
                .start();
        });
        it("Deposit 1e15", async function(){
           return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: account4, value: 6e15}])
                .assertSuccess()
                .start();
        });
        it("account1 should get 1e15 again.", async function(){
            return createDefaultTxTester()
                .startLedger([account1])
                .doTx([token, "collectDividends", {from: account1}])
                .assertSuccess()
                .stopLedger()
                .assertDeltaMinusTxFee(account1, new BigNumber(1e15))
                .start();
        });
        it("account2 should get 2e15 twice... 4e15", async function(){
            return createDefaultTxTester()
                .startLedger([account2])
                .doTx([token, "collectDividends", {from: account2}])
                .assertSuccess()
                .stopLedger()
                .assertDeltaMinusTxFee(account2, new BigNumber(4e15))
                .start(); 
        });
        it("account2 should get 0 now.", async function(){
            return createDefaultTxTester()
                .startLedger([account2])
                .doTx([token, "collectDividends", {from: account2}])
                .assertSuccess()
                .stopLedger()
                .assertLostTxFee(account2)
                .start(); 
        });
        describe("Works when transfer happens", async function(){
            it("Transfer from account3 to account4.", async function(){
                const amt = await token.balanceOf(account3);
                return createDefaultTxTester()
                    .doTx([token, "transfer", account4, amt, {from: account3}])
                    .assertSuccess()
                    .assertCallReturns([token, "balanceOf", account3], 0)
                    .assertCallReturns([token, "balanceOf", account4], amt)
                    .assertCallReturns([token, "getCollectableDividends", account3], 6e15)
                    .assertCallReturns([token, "getCollectableDividends", account4], 0)
                    .start();
            });
            it("Deposit another 1e16", async function(){
                return createDefaultTxTester()
                    .doTx([token, "sendTransaction", {from: account4, value: 6e15}])
                    .assertSuccess()
                    .start();
            });
            it("Deposit another 1e16", async function(){
                return createDefaultTxTester()
                    .doTx([token, "sendTransaction", {from: account4, value: 6e15}])
                    .assertSuccess()
                    .start();
            });
            it("account1 should have 2e15, account4 6e15", async function(){
                return createDefaultTxTester()
                    .assertCallReturns([token, "getCollectableDividends", account1], 2e15)
                    .assertCallReturns([token, "getCollectableDividends", account4], 6e15)
                    .start();
            });
            it("After a transfer from account4 to account5, same remains", async function(){
                const amt = await token.balanceOf(account4);
                return createDefaultTxTester()
                    .doTx([token, "transfer", account5, amt, {from: account4}])
                    .assertCallReturns([token, "getCollectableDividends", account1], 2e15)
                    .assertCallReturns([token, "getCollectableDividends", account4], 6e15)
                    .start(); 
            });
        });
    });
});