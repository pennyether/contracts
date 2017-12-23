const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("Treasury");
const Comptroller = artifacts.require("Comptroller");
const DividendToken = artifacts.require("DividendToken");
const DividendTokenLocker = artifacts.require("DividendTokenLocker");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('Comptroller', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[1];
    const admin = accounts[2];
    const dummyMainController = accounts[3];
    const account1 = accounts[4];
    const account2 = accounts[5];
    const account3 = accounts[6];
    const anyone = accounts[6];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    var comptroller;
    var token;
    var locker;
    var registry;
    var treasury;

    before("Set up registry, treasury, and create comptroller.", async function(){
        registry = await Registry.new();
        treasury = await Treasury.new(registry.address);
        comptroller = await Comptroller.new({from: owner});
        token = DividendToken.at(await comptroller.token());
        locker = DividendTokenLocker.at(await comptroller.locker());
        await registry.register("MAIN_CONTROLLER", dummyMainController);
        await registry.register("ADMIN", admin);
        await registry.register("OWNER", owner);

        const addresses = {
        	comptroller: comptroller.address,
        	token: token.address,
        	locker: locker.address,
            registry: registry.address,
            treasury: treasury.address,
            owner: owner,
            admin: admin,
            dummyMainController: dummyMainController,
            account1: account1,
            account2: account2,
            account3: account3,
            anyone: anyone,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester()
            .nameAddresses(addresses)
            .start();
    });
    describe("Set up Treasury", function(){
    	it("Call .initializeToken and .initializeComptroller", function(){
    		return createDefaultTxTester()
    			.doTx([treasury, "initToken", token.address, {from: owner}])
    			.assertSuccess()
    			.doTx([treasury, "initComptroller", comptroller.address, {from: owner}])
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
    			.assertCallReturns([comptroller, "owner"], owner)
    			.assertCallReturns([comptroller, "locker"], locker.address)
    			.assertCallReturns([comptroller, "token"], token.address)
    			.assertCallReturns([comptroller, "tokensPerWei"], 1000)
    			.assertCallReturns([comptroller, "treasury"], NO_ADDRESS)
                .assertCallReturns([token, "balanceOf", locker.address], 1)
    			.start();
    	})
    	it(".buyTokens() doesn't work", function(){
			return createDefaultTxTester()
				.doTx([comptroller, "buyTokens", {from: account3, value: 1e12}])
				.assertInvalidOpCode()
				.start();
		});
		describe(".initTreasury", function(){
			it("Not callable from non-admin", function(){
				return createDefaultTxTester()
					.doTx([comptroller, "initTreasury", treasury.address, {from: anyone}])
					.assertInvalidOpCode()
					.start();
			});
			it("Must be an actual treasury", function(){
				return createDefaultTxTester()
					.doTx([comptroller, "initTreasury", anyone, {from: owner}])
					.assertInvalidOpCode()
					.start();
			});
			it("Works", function(){
				return createDefaultTxTester()
					.doTx([comptroller, "initTreasury", treasury.address, {from: owner}])
					.assertSuccess()
					.assertCallReturns([comptroller, "treasury"], treasury.address)
					.start();
			});
		})
    });
    describe("Before sale", function(){
        it("Owner gets all dividends before is started", function(){
            const AMT = new BigNumber(1e12);
            return createDefaultTxTester()
                .startLedger([token])
                .doTx([token, "sendTransaction", {value: AMT, from: anyone}])
                .stopLedger()
                .assertDelta(token, AMT)
                .assertCallReturns([token, "getCollectableDividends", locker.address], AMT)
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
        it(".initSale() not callable by anyone", function(){
            return createDefaultTxTester()
                .doTx([comptroller, "initSale", {from: anyone}])
                .assertInvalidOpCode()
                .start();
        });
        it(".initSale works from owner", function(){
           return createDefaultTxTester()
                .doTx([comptroller, "initSale", {from: owner}])
                .assertSuccess()
                .assertCallReturns([comptroller, "isSaleStarted"], true)
                .start(); 
        });
        it(".initSale not callable again", function(){
            return createDefaultTxTester()
                .doTx([comptroller, "initSale", {from: owner}])
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
    	it("Account1 buys 15 tokens", async function(){
    		return assertBuysTokens(account1, 1.5e16)
    	});
    	it("Account2 buys 2500 tokens", async function(){
    		return assertBuysTokens(account2, 2.5e18);
    	});
    })
    describe(".burnTokens()", async function(){
    	it("Doesn't work if you have no tokens.", async function(){
    		return createDefaultTxTester()
    			.doTx([comptroller, "burnTokens", 1e16, {from: account3}])
    			.assertInvalidOpCode()
    			.start();
    	});
    	it("Burns 2000 of account2's tokens", async function(){
    		return assertBurnsTokens(account2, 2000e18);
    	});
        it("Burns all 15 of account1's tokens, even when 20 passed", function(){
            return assertBurnsTokens(account1, 20e18);
        });
        it("Fund something, so balance is less than bankroll", async function(){
            const amt = new BigNumber(1e12);
            const bankroll = await treasury.bankroll();
            const balance = testUtil.getBalance(treasury);
            console.log(`Bankroll: ${bankroll}, balance ${balance}.`);
            return createDefaultTxTester()
                .startLedger([treasury, dummyMainController])
                .doTx([treasury, "fundMainController", amt, "NOTHING", {from: dummyMainController}])
                .assertSuccess()
                .stopLedger()
                    .assertDelta(treasury, amt.mul(-1))
                    .assertDeltaMinusTxFee(dummyMainController, amt)
                .doFn(async function(){
                    const balance = testUtil.getBalance(treasury);
                    const bankroll = await treasury.bankroll();
                    console.log(`Bankroll: ${bankroll}, balance ${balance}.`);
                })
                .start();
        });
        it("Only burns some of account2's 500 tokens", async function(){
            return assertBurnsTokens(account2, 3000e18);
        });
        it("Deposit something, so account2 can burn.", async function(){
            return createDefaultTxTester()
                .doTx([treasury, "sendTransaction", {from: anyone, value: 1e18}])
                .assertSuccess()
                .start();
        });
        it("Can burn the rest of account2's tokens.", async function(){
            return assertBurnsTokens(account2, 3000e18);
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
			.startLedger([comptroller, treasury, owner, acct])
            .startWatching([treasury, token])
			.doTx([comptroller, "buyTokens", {from: acct, value: value}])
			.assertSuccess()
			.stopLedger()
				.assertNoDelta(comptroller)
				.assertDelta(treasury, value.mul(.8))
				.assertDelta(owner, value.mul(.2))
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
			.startLedger([comptroller, treasury, owner, acct])
            .startWatching([treasury, token])
			.doTx([comptroller, "burnTokens", numTokens, {from: acct}])
			.assertSuccess()
			.stopLedger()
				.assertNoDelta(comptroller)
				.assertDelta(treasury, numWei.mul(-1))
				.assertDelta(owner, 0)
				.assertDeltaMinusTxFee(acct, numWei)
            .stopWatching()
                .assertOnlyEvent(treasury, "BankrollChanged", {
                    oldValue: prevBankroll,
                    newValue: expectedBankroll
                })
                .assertEventCount(token, 2)
                .assertEvent(token, "TokensBurnt", {
                    account: acct,
                    amount: expectedNumTokens,
                })
                .assertEvent(token, "TokensBurnt", {
                    account: locker.address,
                    amount: expectedNumTokens.div(5),
                })
			.assertCallReturns([treasury, "bankroll"], expectedBankroll)
			.assertCallReturns([token, "balanceOf", acct], expectedTokens)
			.assertCallReturns([token, "balanceOf", locker.address], expectedLockerTokens)
			.start();
    }
});