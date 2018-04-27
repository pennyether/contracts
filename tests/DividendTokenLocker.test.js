const DividendTokenLocker = artifacts.require("DividendTokenLocker");
const DividendToken = artifacts.require("DividendToken");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const accounts = web3.eth.accounts;
const dummyComptroller = accounts[1];
const owner = accounts[2];
const anon = accounts[3];
var token, locker;

const VESTING_AMT = new BigNumber(6e18);
const VESTING_DAYS = new BigNumber(600);
var TODAY;  // the day that .startVesting() is called

describe('DividendTokenLocker', function(){
    before("Initialize DividendToken and DividendTokenLocker", async function(){
        const addresses = {
            dummyComptroller: dummyComptroller,
            owner: owner,
            anon: anon
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a DividendToken, owned by comptroller.");
        await createDefaultTxTester()
            .doNewTx(DividendToken, [], {from: dummyComptroller})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                token = res.contract;
                plugins.addAddresses({dividendToken: token.address});
            }).start();

        this.logInfo("Create a DividendTokenLocker");
        await createDefaultTxTester()
            .doNewTx(DividendTokenLocker, [token.address, owner], {from: dummyComptroller})
            .assertSuccess()
            .assertOnlyLog("Created",{
                comptroller: dummyComptroller,
                token: token.address,
                owner: owner
            })
            .withTxResult((res, plugins)=>{
                locker = res.contract;
                plugins.addAddresses({locker: locker.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Initial values", function(){
        it("Has proper addresses", function(){
            return createDefaultTxTester()
                .assertCallReturns([locker, "comptroller"], dummyComptroller)
                .assertCallReturns([locker, "token"], token.address)
                .assertCallReturns([locker, "owner"], owner)
                .start();
        });
        it("Has empty vesting params", function(){
            return createDefaultTxTester()
                .assertCallReturns([locker, "vestingAmt"], 0)
                .assertCallReturns([locker, "vestingStartDay"], 0)
                .assertCallReturns([locker, "vestingDays"], 0)
                .start();
        });
        it(".tokensUnvested() should be 0, since nothing is vesting", function(){
            return createDefaultTxTester()
                .assertCallReturns([locker, "tokensUnvested"], 0)
                .start();
        })
    });

    describe(".startVesting()", function(){
        before("Mint some tokens for TokenLocker", function(){
            return createDefaultTxTester()
                .doTx([token, "mint", locker.address, VESTING_AMT, {from: dummyComptroller}])
                .assertSuccess()
                .assertCallReturns([token, "balanceOf", locker.address], VESTING_AMT)
                .start();
        });
        it("Cannot be called by anon", function(){
            return createDefaultTxTester()
                .doTx([locker, "startVesting", VESTING_AMT, VESTING_DAYS, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Cannot be called by owner", function(){
            return createDefaultTxTester()
                .doTx([locker, "startVesting", VESTING_AMT, VESTING_DAYS, {from: owner}])
                .assertInvalidOpCode()
                .start();
        });
        it("Can be called by comptroller", function(){
            return createDefaultTxTester()
                .doTx([locker, "startVesting", VESTING_AMT, VESTING_DAYS, {from: dummyComptroller}])
                .assertSuccess()
                .assertOnlyLog("VestingStarted", {
                    numTokens: VESTING_AMT,
                    vestingDays: VESTING_DAYS
                })
                .withTxResult((res, plugins)=>{
                    TODAY = today();
                })
                .assertCallReturns([locker, "vestingAmt"], VESTING_AMT)
                .assertCallReturns([locker, "vestingDays"], VESTING_DAYS)
                .assertCallReturns([locker, "vestingStartDay"], ()=>TODAY)
                .start();
        });
    });

    describe(".transfer() should not be callable by anon", function(){
        return createDefaultTxTester()
            .doTx([locker, "transfer", anon, 1e18, {from: anon}])
            .assertInvalidOpCode()
            .start();
    });

    describe("Make sure vesting works", function(){
        it("Initially, nothing can be transferred", function(){
            return assertCanTransfer(anon, 1e18);
        });
        it("Fast forward 1 day", function(){
            testUtil.fastForward(24*60*60);
        });
        it("Can transfer 1 days worth of vested tokens", function(){
            return assertCanTransfer(anon, 1e18);
        });
        it("Fast forward 3 days", function(){
            testUtil.fastForward(3*24*60*60);
        });
        it("Can transfer 3 days worth of vested tokens", function(){
            return assertCanTransfer(anon, 1e18);
        });
    });

    describe("Adding additional tokens to balance", function(){
        this.logInfo("If additional tokens are transferred to locker");
        this.logInfo("They should be transferrable, regardless of vesting.");
        it("Transfer as many vested tokens as possible", function(){
            return assertCanTransfer(anon, 10e18);
        });
        it("Mint another 1e18 tokens to locker", function(){
            return createDefaultTxTester()
                .doTx([token, "mint", locker.address, 1e18, {from: dummyComptroller}])
                .assertSuccess()
                .start();
        });
        it("Can now transfer .5e18 tokens", function(){
            return assertCanTransfer(anon, .5e18);
        });
        it("FastForward 1 day", function(){
            testUtil.fastForward(1*24*60*60);
        });
        it("Should now transfer .5e18 + 1-day-vested", function(){
            return assertCanTransfer(anon, 10e18);
        });
    });

    describe(".collectDividends()", function(){
        const DIV_AMT = new BigNumber(1e18);
        it("Send dividend to DividendToken", function(){
            return createDefaultTxTester()
                .doTx([token, "sendTransaction", {from: anon, value: DIV_AMT}])
                .assertSuccess()
                .start();
        });
        it("Should not be callable by anon", function(){
            return createDefaultTxTester()
                .doTx([locker, "collect", {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Should collect its share of dividends", async function(){
            const balance = await token.balanceOf(locker.address);
            const totalSupply = await token.totalSupply();
            const expAmt = DIV_AMT.div(totalSupply).mul(balance).floor();
            const pct = balance.div(totalSupply).mul(100).toFixed(2);
            this.logInfo(`Locker owns ${pct}% of tokens.`);
            this.logInfo(`Should send ${expAmt} Eth to owner`);

            return createDefaultTxTester()
                .startLedger([owner, token])
                .doTx([locker, "collect", {from: owner}])
                .stopLedger()
                .assertSuccess()
                .assertOnlyLog("Collected", {
                    recipient: owner,
                    amount: expAmt
                })
                .assertDeltaMinusTxFee(owner, expAmt)
                .assertDelta(token, expAmt.mul(-1))
                .start();
        });
    });

    async function assertCanTransfer(to, amt) {
        amt = new BigNumber(amt);
        // assert vesting is correct
        const startDay = await locker.vestingStartDay();
        const vestingAmt = await locker.vestingAmt();
        const vestingDays = await locker.vestingDays();
        
        // compute expAmtVested and expMinBalance
        console.log(`today: ${today()}`);
        const balance = await token.balanceOf(locker.address);
        const daysElapsed = BigNumber.min(today().minus(startDay), vestingDays);
        const expVested = vestingAmt.mul(daysElapsed).div(vestingDays);
        const expUnvested = vestingAmt.minus(expVested);
        const expAvailable = BigNumber.max(balance.minus(expUnvested), 0);

        // compute how many tokens _should_ be transferred
        const expAmt = expAvailable.gt(amt)
            ? amt
            : expAvailable;
        // compute expToBalance
        const expToBalance = (await token.balanceOf(to)).plus(expAmt);

        // print useful info
        console.log(`Has vested for ${daysElapsed} days.`);
        console.log(`Vested: ${t(expVested)}`);
        console.log(`Unvested: ${t(expUnvested)}`)
        console.log(`Available: ${t(expAvailable)}`);
        console.log("");
        if (expAmt.lt(amt)) {
            console.log(`Should not be able to transfer all: ${t(amt)}`);
        }
        console.log(`Should transfer: ${t(expAmt)}`);

        return createDefaultTxTester()
            .doTx([locker, "transfer", to, amt, {from: owner}])
            .assertSuccess()
            .assertOnlyLog("Transferred", {
                recipient: to,
                numTokens: expAmt
            })
            .assertCallReturns([token, "balanceOf", locker.address], balance.minus(expAmt))
            .assertCallReturns([token, "balanceOf", to], expToBalance)
            .assertCallReturns([locker, "tokensVested"], expVested)
            .assertCallReturns([locker, "tokensUnvested"], expUnvested)
            .assertCallReturns([locker, "tokensAvailable"], expAvailable.minus(expAmt))
            .start();
    }
    function t(amt){
        return `${amt.div(1e18).toFixed(5)} Tokens`;
    }
    function today() {
        return (new BigNumber(testUtil.getBlockTime())).div(24*60*60).floor();
    }
});