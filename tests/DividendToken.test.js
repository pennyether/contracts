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
var unpayable;

describe('DividendToken', function(){
    before("Initialize DividendToken and UnpayableTokenHolder", async function(){
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
            .doNewTx(DividendToken, ["PennyEther", "PENNY"], {from: comptroller})
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
                unpayable = res.contract;
                plugins.addAddresses({unpayable: unpayable.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Is initialized correctly", async function(){
        it("token.comptroller() is correct", function(){
            return createDefaultTxTester()
                .assertCallReturns([token, "comptroller"], comptroller)
                .assertCallReturns([token, "name"], "PennyEther")
                .assertCallReturns([token, "symbol"], "PENNY")
                .start();
        });
    });

    describe(".mint() works", async function(){
        it("Cannot be called by anon", async function(){
            return createDefaultTxTester()
                .doTx([token, "mint", account1, 1000, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Can mint 1000 tokens for account1", function(){
            return assertCanMint(account1, 1000);
        });
        it("Can mint 2000 tokens for account2", function(){
            return assertCanMint(account2, 2000);
        });
        it("Can mint 100 tokens more for account1", function(){
            return assertCanMint(account1, 100);
        });
    });

    describe(".burn() works", async function(){
        it("Cannot be called by anon", async function(){
            return createDefaultTxTester()
                .doTx([token, "burn", account1, 100, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Cannot burn more tokens than account1 has", async function(){
            return createDefaultTxTester()
                .doTx([token, "burn", account1, 4000, {from: comptroller}])
                .assertInvalidOpCode()
                .start();
        });
        it("Can burn 100 tokens from account1", async function(){
            await assertCanBurn(account1, 100);
        });
        it("Can burn 2000 tokens from account2", async function(){
            await assertCanBurn(account2, 2000);
        });
        it("Can burn 1000 tokens from account1", async function(){
            await assertCanBurn(account1, 1000);
        });
    });
    
    describe("ERC20 Functionality", function(){
        before("Reset accounts.", function(){
            return resetAccounts();
        });

        describe(".transfer()", function(){
            it("Fails if not enough balance", function(){
                return createDefaultTxTester()
                    .doTx([token, "transfer", account2, 1001, {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works", function(){
                return assertCanTransfer(account1, account2, 500);
            });
        })
        describe(".approve() and .transferFrom()", function(){
            this.logInfo("Here we test account1 sending from account3 to account4.");
            it(".transferFrom() fails if no allowance", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferFrom", account3, account4, 1, {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            })
            it(".approve() works", function(){
                return createDefaultTxTester()
                    .doTx([token, "approve", account1, 9999, {from: account3}])
                    .assertSuccess()
                        .assertLog("Approval", {
                            owner: account3,
                            spender: account1,
                            amount: 9999
                        })
                    .assertCallReturns([token, "allowance", account3, account1], 9999)
                    .start();
            });
            it(".transferFrom() fails if not enough allowance", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferFrom", account3, account4, 10000, {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            });
            it(".transferFrom() fails if not enough balance", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferFrom", account3, account4, 3001, {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            });
            it(".transferFrom() works", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferFrom", account3, account4, 3000, {from: account1}])
                    .assertSuccess()
                        .assertLogCount(2)
                        .assertLog("AllowanceUsed", {
                            owner: account3,
                            spender: account1,
                            amount: 3000
                        })
                        .assertLog("Transfer", {
                            from: account3,
                            to: account4,
                            amount: 3000
                        })
                    .assertCallReturns([token, "allowance", account3, account1], 9999-3000)
                    .assertCallReturns([token, "balanceOf", account3], 0)
                    .assertCallReturns([token, "balanceOf", account4], 7000)
                    .start();
            });
        });
    });

    describe("ERC667 Functionality", function(){
        before("Reset accounts", function(){
            return resetAccounts();
        });

        describe(".transferAndCall()", function(){
            const DATA = "0x0123456789abcdef";
            it("Fails if not enough balance", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferAndCall", unpayable.address, 1001, DATA, {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works, and triggers tokenFallback()", function(){
                return createDefaultTxTester()
                    .startWatching([unpayable])
                    .doTx([token, "transferAndCall", unpayable.address, 1000, DATA, {from: account1}])
                    .assertSuccess()
                        .assertLog("Transfer", {
                            from: account1,
                            to: unpayable.address,
                            amount: 1000
                        })
                    .stopWatching()
                        .assertEvent(unpayable, "TokenFallback", {
                            token: token.address,
                            sender: account1,
                            amt: 1000,
                            data: DATA
                        })
                    .assertCallReturns([token, "balanceOf", account1], 0)
                    .assertCallReturns([token, "balanceOf", unpayable.address], 1000)
                    .start();
            });
        });
    });

    describe(".freeze() works", function(){
        before("Reset accounts", function(){
            return resetAccounts();
        });

        describe(".freeze(true)", function(){
            it("Not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([token, "freeze", true, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Callable by comptroller", function(){
               return createDefaultTxTester()
                    .doTx([token, "freeze", true, {from: comptroller}])
                    .assertSuccess()
                        .assertOnlyLog("Frozen")
                    .assertCallReturns([token, "isFrozen"], true)
                    .start(); 
            });
            it("Calling again does nothing", function(){
               return createDefaultTxTester()
                    .doTx([token, "freeze", true, {from: comptroller}])
                    .assertSuccess()
                        .assertLogCount(0)
                    .assertCallReturns([token, "isFrozen"], true)
                    .start();  
            });
        });
        describe(".transfer(), .transferFrom(), .transferAndCall() should not work", function(){
            it(".transfer() does not work", function(){
                return createDefaultTxTester()
                    .doTx([token, "transfer", account2, 100, {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            });
            it(".transferFrom() does not work", async function(){
                this.logInfo("First approve account3 to send on behalf of account1");
                await createDefaultTxTester()
                    .doTx([token, "approve", account3, 100, {from: account1}])
                    .assertSuccess()
                    .start();

                this.logInfo("Now try to send it.")
                return createDefaultTxTester()
                    .doTx([token, "transferFrom", account1, account2, 100, {from: account3}])
                    .assertInvalidOpCode()
                    .start();
            });
            it(".transferAndCall() does not work", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferAndCall", unpayable.address, 100,  "0x0", {from: account1}])
                    .assertInvalidOpCode()
                    .start();
            });
        });
        describe(".freeze(false)", function(){
            it("Not callable by anon", function(){
                return createDefaultTxTester()
                    .doTx([token, "freeze", false, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Callable by comptroller", function(){
               return createDefaultTxTester()
                    .doTx([token, "freeze", false, {from: comptroller}])
                    .assertSuccess()
                        .assertOnlyLog("UnFrozen")
                    .assertCallReturns([token, "isFrozen"], false)
                    .start(); 
            });
            it("Calling again does nothing", function(){
               return createDefaultTxTester()
                    .doTx([token, "freeze", false, {from: comptroller}])
                    .assertSuccess()
                        .assertLogCount(0)
                    .assertCallReturns([token, "isFrozen"], false)
                    .start();  
            });
        });
        describe(".transfer(), .transferFrom(), .transferAndCall() should all work", function(){
            it(".transfer() works", function(){
                return createDefaultTxTester()
                    .doTx([token, "transfer", account2, 100, {from: account1}])
                    .assertSuccess()
                    .start();
            });
            it(".transferFrom() works", async function(){
                this.logInfo("First approve account3 to send on behalf of account1");
                await createDefaultTxTester()
                    .doTx([token, "approve", account3, 100, {from: account1}])
                    .assertSuccess()
                    .start();

                this.logInfo("Now try to send it.")
                return createDefaultTxTester()
                    .doTx([token, "transferFrom", account1, account2, 100, {from: account3}])
                    .assertSuccess()
                    .start();
            });
            it(".transferAndCall() works", function(){
                return createDefaultTxTester()
                    .doTx([token, "transferAndCall", unpayable.address, 100,  "0x0", {from: account1}])
                    .assertSuccess()
                    .start();
            });
        });
    });

    describe("Dividends", async function(){
        this.logInfo("Dividends should be credited to accounts based on their balance.");

        before("Reset accounts.", function(){
            return resetAccounts();
        });

        describe("Initial deposit", function(){
            this.logInfo("This will send an amount to Token contract");
            this.logInfo("Account2 will collect dividends.");
            itCanReceiveDeposit(1e10);
            itCanGetOwedDividends("After receiving a deposit, owedDividends should be correct.");
            itCanCollectDividend(1, "Account2 should be able to collect owedDividends.");
            itCanGetOwedDividends("Owed dividends should return 0 for Account 1");    
        });
        describe("Another deposit", function(){
            this.logInfo("This will send another amount to Token contract");
            this.logInfo("Accounts 1 and 2 will collect.");
            itCanReceiveDeposit(2e11)
            itCanGetOwedDividends("Owed dividends should be incremented correctly.");
            itCanCollectDividend(1, "Account2 should collect amount from last dividend only.");
            itCanCollectDividend(2, "Account3 should collect amount from both dividends.");
            itCanCollectDividend(2, "Account3 should collect 0, since it just collected.");
            itCanGetOwedDividends("Owed dividends for account2 and account3 should be 0.");
        });

        collectAll(true);
    });

    describe("Dividends while minting and burning", async function(){
        this.logInfo("If the total supply changes, dividends still work properly.");

        before("Reset accounts", async function(){
            return resetAccounts();
        });

        itCanReceiveDeposit(1e10);
        itCanGetOwedDividends("Notice accounts dividends owed.");
        
        describe("Increasing totalSupply", function(){
            // Mint tokens, get deposit, show owed.
            it("Mint tokens for account4", function(){
                return assertCanMint(account4, 10000);
            });
            itCanReceiveDeposit(2e11);
            itCanGetOwedDividends("Amounts are incremented taking into account increased totalSupply");
        });
        
        describe("Decreasing totalSupply", function(){
            // Burn tokens, get deposit, show owed.
            it("Burn tokens for account1", function(){
                return assertCanBurn(account4, 10000);
            })
            itCanReceiveDeposit(1e12);
            itCanGetOwedDividends("Amounts are incremented taking into account decreased totalSupply");
        })

        collectAll(true);
    });

    describe("Dividends with .transfer()", async function(){
        this.logInfo("When tokens are transferred, the original holder should retain dividends.");
        this.logInfo("Further dividends should be distributed based on new token holdings.");

        before("Reset accounts.", function(){
            return resetAccounts();
        });

        itCanReceiveDeposit(1e10);
        itCanGetOwedDividends("Notice account1 has dividends owed.");
        it("Account1 transfers to Account2", async function(){
            return assertCanTransfer(account1, account2);
        });
        itCanGetOwedDividends("Owed dividends for account1 and account2 should be unchanged.");
        itCanReceiveDeposit(2e11);
        itCanGetOwedDividends("Account1 should not receive more owed dividends.");

        collectAll(true);
    });

    describe("Dividends with .transferFrom()", async function(){
        this.logInfo("When tokens are transferred, the original holder should retain dividends.");
        this.logInfo("Further dividends should be distributed based on new token holdings.");

        before("Reset accounts.", function(){
            return resetAccounts();
        });

        itCanReceiveDeposit(1e10);
        itCanGetOwedDividends("Notice account1 has dividends owed.")
        it("Account1 transfer to Account2", async function(){
            this.logInfo("Approve account3 to send on behalf of account1");
            await createDefaultTxTester()
                .doTx([token, "approve", account3, 1000, {from: account1}])
                .assertSuccess().start();

            this.logInfo("Next, do the transfer");
            await createDefaultTxTester()
                .doTx([token, "transferFrom", account1, account2, 1000, {from: account3}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account1],0)
                .assertCallReturns([token, "balanceOf", account2],3000)
                .start();
        });

        itCanReceiveDeposit(2e11);
        itCanGetOwedDividends("Account1 should get no more dividends. Account2 should get a lot more.");

        collectAll(true);
    });

    describe("Dividends with .transferAndCall()", async function(){
        this.logInfo("When tokens are transferred, the original holder should retain dividends.");
        this.logInfo("Further dividends should be distributed based on new token holdings.");

        before("Reset accounts.", function(){
            return resetAccounts();
        });

        itCanReceiveDeposit(1e10);
        itCanGetOwedDividends("Notice account1 has dividends owed.")
        it("Account1 transfer to Unpayable", async function(){
            await createDefaultTxTester()
                .doTx([token, "transferAndCall", unpayable.address, 1000, "0x0", {from: account1}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", account1], 0)
                .assertCallReturns([token, "balanceOf", unpayable.address], 1000)
                .start();
        });

        itCanReceiveDeposit(2e11);
        itCanGetOwedDividends("Account1 should get no more dividends.");
        it("UnpayableTokenHolder unable to collect dividends", async function(){
            this.logInfo("UnpayableTokenHolder show throw on its fallback fn.");
            await createDefaultTxTester()
                .doTx([unpayable, "collectDividends"])
                .assertInvalidOpCode()
                .assertCallReturns([token, "getOwedDividends", unpayable.address], {not: 0})
                .assertCallReturns([token, "balanceOf", unpayable.address], 1000)
                .start();
        });

        // false means not all dividends should be collected (unpayable never collects)
        collectAll(false);
    });


    // These functions keep track of expected dividends, and do assertions against them.
    const trackedAccounts = [account1, account2, account3, account4];
    var expTotalDivs = new BigNumber(0);
    var expOwedDivs = trackedAccounts.map(() => new BigNumber(0));

    async function resetAccounts(){
        // for all accounts:
        //   mint/burn balance to 0, and collect
        // then mint 1k, 2k, 3k, 4k to accounts 1-4
        const all = trackedAccounts.concat(unpayable.address);
        await Promise.all(
            all.map(async function(acct){
                const balance = await token.balanceOf(acct);
                if (balance.gt(0)) {
                    await token.burn(acct, balance, {from: comptroller});
                }
                const owed = await token.getOwedDividends(acct);
                if (owed.gt(0)){
                    await token.collectOwedDividends({from: acct});
                }
            })
        );
        await Promise.all(
            trackedAccounts.map(async function(acct, i){
                await token.mint(acct, (i+1)*1000, {from: comptroller});
                const balance = await token.balanceOf(acct);
                const owed = await token.getOwedDividends(acct);
                console.log(`Account #${i+1}: Owed: ${owed} Balance: ${balance}`);
            })
        );
        expOwedDives = trackedAccounts.map(() => new BigNumber(0));
    }

    function collectAll(assertAllCollected) {
        after("Everyone can collect correctly", async function(){
            trackedAccounts.forEach((acct, i) => itCanCollectDividend(i));
            if (assertAllCollected) {
                it(`TotalCollected == TotalDividends`, async function(){
                    const expDivsCollected = await token.dividendsTotal();
                    return createDefaultTxTester()
                        .assertCallReturns([token, "dividendsCollected"], expDivsCollected, "returns dividendsTotal()")
                        .start();
                });
            }
        });
    }

    async function itCanReceiveDeposit(amt) {
        amt = new BigNumber(amt);

        // expectDividends calculates expOwedDivs and expTotalDivs
        async function expectDividends(amt) {
            const totalSupply = await token.totalSupply();
            expTotalDivs = expTotalDivs.plus(amt);
            await Promise.all(trackedAccounts.map((acc, i) => {
                return token.balanceOf(trackedAccounts[i]).then((numTokens)=>{
                    expOwedDivs[i] = expOwedDivs[i]
                        .plus(numTokens.mul(amt).div(totalSupply));
                });
            }));
        }

        it(`Can receive deposit of ${amt.div(1e18)} ETH`, async function(){
            const totalSupply = await token.totalSupply()
            const per1000 = amt.div(1e9).div(totalSupply).mul(1000);
            this.logInfo(`This should add ${per1000} Gwei per 1000 tokens.`);
            await expectDividends(amt);
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: nonAccount, value: amt}])
                .assertSuccess()
                    .assertOnlyLog("DividendReceived", {sender: nonAccount, amount: amt})
                .assertCallReturns([token, "dividendsTotal"], expTotalDivs)
                .start();
        });
    }

    async function itCanGetOwedDividends(msg) {
        it(".getOwedDividends() works", async function(){
            if (msg) this.logInfo(msg)

            const tester = createDefaultTxTester();
            trackedAccounts.forEach((acc, i)=>{
                const expected = expOwedDivs[i].floor();
                tester.assertCallReturns([token, "getOwedDividends", acc], expected);
            })
            return tester.start();
        });
    }

    async function itCanCollectDividend(accountNum, msg) {
        it(`account${accountNum+1} collects correct amount.`, async function(){
            if (msg) this.logInfo(msg);

            const account = trackedAccounts[accountNum];
            const expected = expOwedDivs[accountNum].floor();
            const prevDivCollected = (await token.dividendsCollected())
            this.logInfo(`account${accountNum} should be owed ${expected} Wei.`);
            return createDefaultTxTester()
                .assertCallReturns([token, "getOwedDividends", account], expected)
                .startLedger([account])
                .doTx([token, "collectOwedDividends", {from: account}])
                .assertSuccess()
                .stopLedger()
                    .assertLog("CollectedDividends", {
                        account: account,
                        amount: expected
                    })
                    .assertDeltaMinusTxFee(account, expected)
                .doFn(() => expOwedDivs[accountNum] = new BigNumber(0))
                .assertCallReturns([token, "getOwedDividends", account], 0)
                .assertCallReturns([token, "dividendsCollected"], prevDivCollected.plus(expected))
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

    async function assertCanMint(acct, amount) {
        const expectedBal = (await token.balanceOf(acct)).plus(amount);
        const expectedTotal = (await token.totalSupply()).plus(amount);
        return createDefaultTxTester()
            .doTx([token, "mint", acct, amount, {from: comptroller}])
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
        const expectedTotalBurned = (await token.totalBurned()).plus(amount);
        return createDefaultTxTester()
            .doTx([token, "burn", acct, amount, {from: comptroller}])
            .assertSuccess()
            .assertOnlyLog("TokensBurned", {
                account: acct,
                amount: amount,
                newTotalSupply: expectedTotal
            })
            .assertCallReturns([token, "balanceOf", acct], expectedBal)
            .assertCallReturns([token, "totalSupply"], expectedTotal)
            .assertCallReturns([token, "totalBurned"], expectedTotalBurned)
            .start();
    }
});