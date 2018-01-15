const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("Treasury");
const Comptroller = artifacts.require("Comptroller");
const DividendToken = artifacts.require("DividendToken");
const DividendTokenLocker = artifacts.require("DividendTokenLocker");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('Comptroller', function(){
    const accounts = web3.eth.accounts;
    const regOwner = accounts[1];
    const compOwner = accounts[2];
    const admin = accounts[4];
    const dummyMainController = accounts[5];
    const account1 = accounts[6];
    const account2 = accounts[7];
    const account3 = accounts[8];
    const anon = accounts[9];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const FIRST_DIV_AMT = new BigNumber(1e12);
    const SECOND_DIV_AMT = new BigNumber(2e12);
    var comptroller;
    var token;
    var locker;
    var registry;
    var treasury;

    before("Set up registry, treasury, and create comptroller.", async function(){
        registry = await Registry.new(regOwner, {from: anon});
        treasury = await Treasury.new(registry.address, {from: anon});
        comptroller = await Comptroller.new(compOwner, {from: anon});
        token = DividendToken.at(await comptroller.token());
        locker = DividendTokenLocker.at(await comptroller.locker());
        await registry.register("MAIN_CONTROLLER", dummyMainController, {from: regOwner});
        await registry.register("ADMIN", admin, {from: regOwner});

        const addresses = {
        	comptroller: comptroller.address,
        	token: token.address,
            locker: locker.address,
            registry: registry.address,
            treasury: treasury.address,
            regOwner: regOwner,
            compOwner: compOwner,
            admin: admin,
            dummyMainController: dummyMainController,
            account1: account1,
            account2: account2,
            account3: account3,
            anon: anon,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Set up Treasury", function(){
    	it("Call .initToken and .initComptroller on Treasury", function(){
    		return createDefaultTxTester()
    			.doTx([treasury, "initToken", token.address, {from: regOwner}])
    			.assertSuccess()
    			.doTx([treasury, "initComptroller", comptroller.address, {from: regOwner}])
    			.assertSuccess()
                .doTx([treasury, "setDailyFundLimit", 1e20, {from: admin}])
    			.assertCallReturns([treasury, "token"], token.address)
    			.assertCallReturns([treasury, "comptroller"], comptroller.address)
    			.start();
    	});
    });
    describe("Set up Comptroller", function(){
    	before("Is initalized correctly", function(){
    		return createDefaultTxTester()
    			.assertCallReturns([comptroller, "owner"], compOwner)
    			.assertCallReturns([comptroller, "locker"], locker.address)
    			.assertCallReturns([comptroller, "token"], token.address)
    			.assertCallReturns([comptroller, "tokensPerWei"], 1)
    			.assertCallReturns([comptroller, "treasury"], NO_ADDRESS)
                .assertCallReturns([token, "balanceOf", locker.address], 1)
    			.start();
    	})
    	it(".buyTokens() doesn't work (sale not started)", function(){
			return createDefaultTxTester()
				.doTx([comptroller, "buyTokens", {from: compOwner, value: 1e12}])
				.assertInvalidOpCode()
				.start();
		});
        it(".burnTokens() doesn't work (sale not started)", function(){
            return createDefaultTxTester()
                .doTx([comptroller, "burnTokens", {from: compOwner, value: 1e12}])
                .assertInvalidOpCode()
                .start();
        });
		describe(".initTreasury", function(){
			it("Not callable from anon", function(){
				return createDefaultTxTester()
					.doTx([comptroller, "initTreasury", treasury.address, {from: anon}])
					.assertInvalidOpCode()
					.start();
			});
			it("Address must have .comptroller() value", function(){
				return createDefaultTxTester()
					.doTx([comptroller, "initTreasury", anon, {from: compOwner}])
					.assertInvalidOpCode()
					.start();
			});
			it("Works", function(){
				return createDefaultTxTester()
					.doTx([comptroller, "initTreasury", treasury.address, {from: compOwner}])
					.assertSuccess()
					.assertCallReturns([comptroller, "treasury"], treasury.address)
					.start();
			});
            it("Not callable again", function(){
                return createDefaultTxTester()
                    .doTx([comptroller, "initTreasury", treasury.address, {from: compOwner}])
                    .assertInvalidOpCode()
                    .start();
            });
		});
    });
    describe("Before sale", function(){
        it("Owner gets all dividends before is started", function(){
            return createDefaultTxTester()
                .startLedger([token])
                .doTx([token, "sendTransaction", {value: FIRST_DIV_AMT, from: anon}])
                .stopLedger()
                .assertDelta(token, FIRST_DIV_AMT)
                .assertCallReturns([token, "getCollectableDividends", locker.address], FIRST_DIV_AMT)
                .start();
        })
        it("Nobody can buy tokens", async function(){
            try {
                await assertBuysTokens(account1, 1.5e16);
            } catch (e) { return; }
            throw new Error("Should not have been allowed to buy tokens.");
        });
        it(".isSaleStarted is false", function(){
            return createDefaultTxTester()
                .assertCallReturns([comptroller, "isSaleStarted"], false)
                .start();
        })
    });
    describe(".initSale()", function(){
        it("not callable by anon", function(){
            return createDefaultTxTester()
                .doTx([comptroller, "initSale", {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("works from owner", function(){
           return createDefaultTxTester()
                .doTx([comptroller, "initSale", {from: compOwner}])
                .assertSuccess()
                .assertCallReturns([comptroller, "isSaleStarted"], true)
                .start(); 
        });
        it("not callable again", function(){
            return createDefaultTxTester()
                .doTx([comptroller, "initSale", {from: compOwner}])
                .assertInvalidOpCode()
                .start();
        });
    });
    describe(".buyTokens()", async function(){
    	it("Doesn't work with small values", async function(){
    		return createDefaultTxTester()
    			.doTx([comptroller, "buyTokens", {from: account1, value: 1000}])
    			.assertInvalidOpCode()
    			.start();
    	});
    	it("Account1 buys .15 tokens", async function(){
    		return assertBuysTokens(account1, .15e18)
    	});
    	it("Account2 buys 2.5 tokens", async function(){
    		return assertBuysTokens(account2, 2.5e18);
    	});
    });
    describe("Dividends work", async function(){
        before("Deposit some to token", function(){
            return createDefaultTxTester()
                .startLedger([token])
                .doTx([token, "sendTransaction", {value: SECOND_DIV_AMT, from: anon}])
                .stopLedger()
                .assertDelta(token, SECOND_DIV_AMT)
                .start();
        });
        it("Everyone gets their share", async function(){
            const totalTokens = await token.totalSupply();
            const acct1Tokens = await token.balanceOf(account1);
            const acct2Tokens = await token.balanceOf(account2);
            const lockerTokens = await token.balanceOf(locker.address);
            const expAcct1Div = acct1Tokens.div(totalTokens).mul(SECOND_DIV_AMT).floor();
            const expAcct2Div = acct2Tokens.div(totalTokens).mul(SECOND_DIV_AMT).floor();
            const expLockerDiv = lockerTokens.div(totalTokens).mul(SECOND_DIV_AMT)
                                    .plus(FIRST_DIV_AMT).floor();
            return createDefaultTxTester()
                .assertCallReturns([token, "getCollectableDividends", account1], expAcct1Div)
                .assertCallReturns([token, "getCollectableDividends", account2], expAcct2Div)
                .assertCallReturns([token, "getCollectableDividends", locker.address], expLockerDiv)
                .start();
        });
    });
    describe("DividendTokenLocker", function(){
        it("Has expected state", function(){
            return createDefaultTxTester()
                .assertCallReturns([locker, "token"], token.address)
                .assertCallReturns([locker, "owner"], compOwner)
                .start();
        })
        it("Cannot collect from anon", function(){
            return createDefaultTxTester()
                .doTx([locker, "collect", {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Locker can collect", async function(){
            const expDivs = await token.getCollectableDividends(locker.address);
            const lockerBalance = await testUtil.getBalance(locker.address);
            return createDefaultTxTester()
                .startLedger([token, locker, compOwner])
                .doTx([locker, "collect", {from: compOwner}])
                .assertSuccess()
                .stopLedger()
                    .assertDelta(token, expDivs.mul(-1))
                    .assertDelta(locker, lockerBalance.mul(-1))
                    .assertDeltaMinusTxFee(compOwner, lockerBalance.plus(expDivs))
                .start();
        });
    })
    describe(".burnTokens()", async function(){
    	it("Doesn't work if you have no tokens.", async function(){
    		return createDefaultTxTester()
    			.doTx([comptroller, "burnTokens", 1e16, {from: account3}])
    			.assertInvalidOpCode()
    			.start();
    	});
    	it("Burns 2 of account2's tokens", async function(){
    		return assertBurnsTokens(account2, 2e18);
    	});
        it("Burns all .15 of account1's tokens, even when .20 passed", function(){
            return assertBurnsTokens(account1, .2e18);
        });
        it("Fund something, so balance is less than bankroll", async function(){
            const AMT = new BigNumber(1e12);
            const bankroll = await treasury.bankroll();
            const balance = testUtil.getBalance(treasury);
            console.log(`Bankroll: ${bankroll}, balance ${balance}.`);
            return createDefaultTxTester()
                .startLedger([treasury, dummyMainController])
                .doTx([treasury, "fundMainController", AMT, "NOTHING", {from: dummyMainController}])
                .assertSuccess()
                .stopLedger()
                    .assertDelta(treasury, AMT.mul(-1))
                    .assertDeltaMinusTxFee(dummyMainController, AMT)
                .doFn(async function(){
                    const balance = testUtil.getBalance(treasury);
                    const bankroll = await treasury.bankroll();
                    console.log(`Bankroll: ${bankroll}, balance ${balance}.`);
                })
                .start();
        });
        it("Only burns some of account2's .5 tokens", async function(){
            return assertBurnsTokens(account2, 1e18);
        });
        it("Deposit something, so account2 can burn.", async function(){
            return createDefaultTxTester()
                .doTx([treasury, "sendTransaction", {from: anon, value: 1e18}])
                .assertSuccess()
                .start();
        });
        it("Can burn the rest of account2's tokens.", async function(){
            return assertBurnsTokens(account2, 1e18);
        });
    })

    async function assertBuysTokens(acct, value) {
    	value = new BigNumber(value);
    	const tokensPerWei = await comptroller.tokensPerWei();
    	const numTokens = tokensPerWei.mul(value);
    	const prevAccTokens = await token.balanceOf(acct);
    	const prevLockerTokens = await token.balanceOf(locker.address);
    	const expectedTokens = prevAccTokens.plus(numTokens);
		const expectedLockerTokens = prevLockerTokens.plus(numTokens.div(5));
		const prevBankroll = await treasury.bankroll();
    	const expectedBankroll = prevBankroll.plus(value.mul(.8));
		return createDefaultTxTester()
			.startLedger([comptroller, treasury, locker, acct])
            .startWatching([treasury, token])
			.doTx([comptroller, "buyTokens", {from: acct, value: value}])
			.assertSuccess()
			.stopLedger()
				.assertNoDelta(comptroller)
				.assertDelta(treasury, value.mul(.8))
				.assertDelta(locker, value.mul(.2))
				.assertDeltaMinusTxFee(acct, value.mul(-1))
            .stopWatching()
                .assertOnlyEvent(treasury, "BankrollChanged", {
                    oldValue: prevBankroll,
                    newValue: expectedBankroll
                })
                .assertEventCount(token, 2)
                .assertEvent(token, "TokensMinted", {
                    account: acct,
                    amount: expectedTokens,
                })
                .assertEvent(token, "TokensMinted", {
                    account: locker.address,
                    amount: numTokens.div(5),
                })
            .assertCallReturns([treasury, "bankroll"], expectedBankroll)
			.assertCallReturns([token, "balanceOf", acct], expectedTokens)
			.assertCallReturns([token, "balanceOf", locker.address], expectedLockerTokens)
			.start();
    }

    async function assertBurnsTokens(acct, numTokens) {
        numTokens = new BigNumber(numTokens);
        const tokensPerWei = await comptroller.tokensPerWei();
        var expectedNumTokens = numTokens;
        // alter numTokens if not in user's balance
    	const prevAccTokens = await token.balanceOf(acct);
        if (prevAccTokens.lt(expectedNumTokens)){
            expectedNumTokens = prevAccTokens;
            console.log(`Account only has ${prevAccTokens} tokens.`);
            console.log(`Should only burn ${expectedNumTokens} tokens.`);
        }
        // alter further if treasury cannot afford
        var numWei = expectedNumTokens.div(tokensPerWei).mul(".8");
        const tBalance = testUtil.getBalance(treasury.address);
        if (tBalance.lt(numWei)) {
            numWei = tBalance;
            expectedNumTokens = numWei.mul(5).mul(tokensPerWei).div(4);
            console.log(`Treasury can't afford to burn all those tokens.`);
            console.log(`Should only burn ${numTokens} tokens instead.`);
        }
        console.log(`Should burn ${expectedNumTokens} tokens for ${numWei} wei.`);
    	const prevLockerTokens = await token.balanceOf(locker.address);
    	const expectedTokens = prevAccTokens.minus(expectedNumTokens);
    	const expectedLockerTokens = prevLockerTokens.minus(expectedNumTokens.div(5));
    	const prevBankroll = await treasury.bankroll();
    	const expectedBankroll = prevBankroll.minus(numWei);
		return createDefaultTxTester()
			.startLedger([comptroller, treasury, compOwner, acct])
            .startWatching([treasury, token])
			.doTx([comptroller, "burnTokens", numTokens, {from: acct}])
			.assertSuccess()
			.stopLedger()
				.assertNoDelta(comptroller)
				.assertDelta(treasury, numWei.mul(-1))
				.assertDelta(compOwner, 0)
				.assertDeltaMinusTxFee(acct, numWei)
            .stopWatching()
                .assertOnlyEvent(treasury, "BankrollChanged", {
                    oldValue: prevBankroll,
                    newValue: expectedBankroll
                })
                .assertEventCount(token, 2)
                .assertEvent(token, "TokensBurned", {
                    account: acct,
                    amount: expectedNumTokens,
                })
                .assertEvent(token, "TokensBurned", {
                    account: locker.address,
                    amount: expectedNumTokens.div(5),
                })
			.assertCallReturns([treasury, "bankroll"], expectedBankroll)
			.assertCallReturns([token, "balanceOf", acct], expectedTokens)
			.assertCallReturns([token, "balanceOf", locker.address], expectedLockerTokens)
			.start();
    }
});