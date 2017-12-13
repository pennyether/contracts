const TokenCrowdSale = artifacts.require("TokenCrowdSale");
const Token = artifacts.require("Token");
const UnpayableTokenHolder = artifacts.require("UnpayableTokenHolder");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const accounts = web3.eth.accounts;
const owner = accounts[1];
const account1 = accounts[2];
const account2 = accounts[3];
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
            random: random,
            token: token.address,
            tokenCrowdSale: tokenCrowdSale.address,
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
        it("token.owner() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "owner"], tokenCrowdSale.address)
                .start();
        });
        it("token.isMinting is true", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "isMinting"], true)
                .start();
        });
    })
    describe(".buyTokens()", async function(){
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
        it(".buyTokens() if called from same user", async function(){
            const value = new BigNumber(.02e18);
            const curTokens = await token.balanceOf(account1);
            const newTokens = value.mul(tokensPerEth).mul(decimals).div(1e18);
            const totalTokens = curTokens.plus(newTokens);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account1}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account1], totalTokens)
                .start(); 
        });
        it(".buyTokens() works for tiny value", function(){
            const value = new BigNumber(1);
            const expectedTokens = value.mul(tokensPerEth).mul(decimals).div(1e18);
            return createDefaultTxTester()
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account2}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account2], expectedTokens)
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
                .doTx([tokenCrowdSale, "buyTokens", {value: value, from: account2}])
                .assertInvalidOpCode()
                .start();
        });
    });
});