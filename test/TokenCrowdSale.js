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
const nonAccount = accounts[7];

describe('TokenCrowdSale', function(){
    var token;
    var tokenCrowdSale;
    var decimals;

    before("Initialize TokenCrowdSale", async function(){
        tokenCrowdSale = await TokenCrowdSale.new();
        token = Token.at(await tokenCrowdSale.token());
        decimals = (new BigNumber(10)).pow(await token.decimals());

        const addresses = {
            owner: accounts[1],
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            account5: account5,
            nonAccount: nonAccount,
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
        var expectedTotalDividends = new BigNumber(0);
        var expectedDividends1 = new BigNumber(0);
        var expectedDividends2 = new BigNumber(0);
        var expectedDividends3 = new BigNumber(0);
        var expectedDividends4 = new BigNumber(0);
        const totalSupply = await token.totalSupply();
        async function disperseDividends(amt) {
            expectedTotalDividends = expectedTotalDividends.plus(amt);
            const balance1 = await token.balanceOf(account1);
            expectedDividends1 = expectedDividends1.plus(balance1.mul(amt).div(totalSupply));
            const balance2 = await token.balanceOf(account2);
            expectedDividends2 = expectedDividends2.plus(balance2.mul(amt).div(totalSupply));
            const balance3 = await token.balanceOf(account3);
            expectedDividends3 = expectedDividends3.plus(balance3.mul(amt).div(totalSupply));
            const balance4 = await token.balanceOf(account4);
            expectedDividends4 = expectedDividends4.plus(balance4.mul(amt).div(totalSupply));
        }

        it("Deposit 6e15", async function(){
            const amt = 6e15;
            await disperseDividends(amt);
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: nonAccount, value: amt}])
                .assertSuccess()
                .assertCallReturns([token, "totalDividends"], expectedTotalDividends)
                .start();
        });
        it(".getCollectableDividends() works", async function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                .start();
        });
        it("account1 should get 1/6 of dividends", async function(){
            return createDefaultTxTester()
                .startLedger([account1])
                .doTx([token, "collectDividends", {from: account1}])
                .assertSuccess()
                .stopLedger()
                    .assertDeltaMinusTxFee(account1, expectedDividends1)
                .doFn(() => expectedDividends1 = new BigNumber(0))
                .assertCallReturns([token, "getCollectableDividends", account1], 0)
                .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                .start();
        });
        it("Deposit 12e15", async function(){
            const amt = 12e15;
            await disperseDividends(amt);
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: nonAccount, value: amt}])
                .assertSuccess()
                .assertCallReturns([token, "totalDividends"], expectedTotalDividends)
                .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                .start();
        });
        it("account1 should get 2e15 (not 3e15)", async function(){
            return createDefaultTxTester()
                .startLedger([account1])
                .doTx([token, "collectDividends", {from: account1}])
                .assertSuccess()
                .stopLedger()
                    .assertDeltaMinusTxFee(account1, expectedDividends1)
                .doFn(() => expectedDividends1 = new BigNumber(0))
                .assertCallReturns([token, "getCollectableDividends", account1], 0)
                .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                .start();
        });
        it("account2 should get 5e15", async function(){
            return createDefaultTxTester()
                .startLedger([account2])
                .doTx([token, "collectDividends", {from: account2}])
                .assertSuccess()
                .stopLedger()
                    .assertDeltaMinusTxFee(account2, expectedDividends2)
                .doFn(() => expectedDividends2 = new BigNumber(0))
                .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                .assertCallReturns([token, "getCollectableDividends", account2], 0)
                .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                .start();
        });
        it("account2 should get 0 now.", async function(){
            return createDefaultTxTester()
                .startLedger([account2])
                .doTx([token, "collectDividends", {from: account2}])
                .assertSuccess()
                .stopLedger()
                    .assertLostTxFee(account2)
                .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
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
                    .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                    .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                    .start();
            });
            it("Deposit another 6e16", async function(){
                const amt = 6e15;
                await disperseDividends(6e15);
                return createDefaultTxTester()
                    .doTx([token, "sendTransaction", {from: nonAccount, value: amt}])
                    .assertSuccess()
                    .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                    .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                    .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                    .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                    .start();
            });
            it("Deposit another 6e16", async function(){
                const amt = 6e15;
                await disperseDividends(6e15);
                return createDefaultTxTester()
                    .doTx([token, "sendTransaction", {from: nonAccount, value: 6e15}])
                    .assertSuccess()
                    .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                    .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                    .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                    .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                    .start();
            });
            it("After a transfer from account4 to account5, same remains", async function(){
                const amt = await token.balanceOf(account4);
                return createDefaultTxTester()
                    .doTx([token, "transfer", account5, amt, {from: account4}])
                    .assertCallReturns([token, "getCollectableDividends", account1], expectedDividends1)
                    .assertCallReturns([token, "getCollectableDividends", account2], expectedDividends2)
                    .assertCallReturns([token, "getCollectableDividends", account3], expectedDividends3)
                    .assertCallReturns([token, "getCollectableDividends", account4], expectedDividends4)
                    .start(); 
            });
        });
    });
});