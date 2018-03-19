const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("NewTreasury");
const Comptroller = artifacts.require("Comptroller");
const DividendToken = artifacts.require("DividendToken");
const TestBankrollable = artifacts.require("TestBankrollable");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const ONE_WEEK_S = 60*60*24*7 + 1;

describe('Treasury', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[2];
    const admin = accounts[3];
    const anon = accounts[4];
    const investor1 = accounts[5];
    const investor2 = accounts[6];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    var registry;
    var treasury;
    var comptroller;
    var token;
    var br;

    const DAILY_LIMIT = new BigNumber(1000000);

    before("Set up registry and treasury", async function(){
        const addresses = {
            owner: owner,
            admin: admin,
            anon: anon,
            investor1: investor1,
            investor2: investor2,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create Registry, and register ADMIN");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register", "ADMIN", admin, {from: owner}])
            .assertSuccess()
            .start();

        this.logInfo("Create Treasury, linked to registry");
        await createDefaultTxTester()
            .doNewTx(Treasury, [registry.address], {from: anon})
            .withTxResult((txRes, plugins)=>{
                treasury = txRes.contract;
                plugins.addAddresses({treasury: treasury});
            }).start();

        this.logInfo("Create Comptroller, get Token Object");
        await createDefaultTxTester()
            .doNewTx(Comptroller, [owner, treasury.address], {from: anon})
            .withTxResult(async function(txRes, plugins){
                comptroller = txRes.contract;
                token = DividendToken.at(await comptroller.token());
                plugins.addAddresses({comptroller: comptroller, token: token});
            }).start();

        this.logInfo("Create Bankrollable contract");
        await createDefaultTxTester()
            .doNewTx(TestBankrollable, [registry.address], {from: anon})
            .withTxResult((txRes, plugins)=>{
                br = txRes.contract;
                plugins.addAddresses({bankrollable: br});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Initially", function(){
        it("Should have correct addresses", function(){
            return createDefaultTxTester()
                .assertBalance(treasury, 0)
                .assertCallReturns([treasury, "getAdmin"], admin)
                .assertCallReturns([treasury, "token"], NO_ADDRESS)
                .assertCallReturns([treasury, "comptroller"], NO_ADDRESS)
                .assertCallReturns([treasury, "getOwner"], owner)
                .start();
        });
    });

    describe("Requester", function(){
        describe(".createRequest()", function(){
            it("Cannot be called by non-admin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "createRequest", 0, 0, 0, "foo", {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Fails if invalid typeId", function(){
                this.logInfo("Valid typeIds are 0, 1, and 2. 3 is not valid.")
                return createDefaultTxTester()
                    .doTx([treasury, "createRequest", 3, 0, 0, "foo", {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works otherwise", function(){
                this.logInfo("This demonstrates the above calls would otherwise succeed.");
                return createDefaultTxTester()
                    .doTx([treasury, "createRequest", 0, 0, 0, "foo", {from: admin}])
                    .assertSuccess()
                    .start();
            })
            it("Works (full test)", function(){
                return assertCreatesRequest("SendCapital", NO_ADDRESS, 0, "Test Message");
            });
        });

        describe(".cancelRequest()", function(){
            var ID;
            const TYPE = "SendCapital";
            const CANCEL_REASON = "Some reason.";

            before("Create SendCapital request", async function(){
                await assertCreatesRequest("SendCapital", NO_ADDRESS, 1, "Send 1 Wei to nobody.");
                ID = await treasury.curRequestId();
            });
            it("Fails if not admin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "cancelRequest", ID, CANCEL_REASON, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Fails on invalid ID", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "cancelRequest", 100, CANCEL_REASON, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works", function(){
                return assertCancelsRequest(admin, ID);
            });
            it("Cannot be called again", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "cancelRequest", ID, CANCEL_REASON, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
        });

        describe("Executing / Cancelling / Timing out", function(){
            const INVALID_ID = 100;
            var request1Id;
            var request2Id;
            var request3Id;

            before("Create three requests, fast forward a week.", async function(){
                this.logInfo("");
                this.logInfo("Create first request. This will execute.");
                await assertCreatesRequest("SendCapital", NO_ADDRESS, 1, "Send 1 Wei to nobody.");
                request1Id = await treasury.curRequestId();

                this.logInfo("");
                this.logInfo("Create second request. We will cancel it.");
                await assertCreatesRequest("SendCapital", NO_ADDRESS, 1, "Send 1 Wei to nobody.");
                request2Id = await treasury.curRequestId();

                this.logInfo("");
                this.logInfo("Create third request. We will time it out.");
                await assertCreatesRequest("SendCapital", NO_ADDRESS, 1, "Send 1 Wei to nobody.");
                request3Id = await treasury.curRequestId();

                this.logInfo("");
                this.logInfo("Fast forward 1 week.");
                return testUtil.fastForward(ONE_WEEK_S);
            });

            describe(".executeRequest()", function(){
                it("Not callable from anon", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "executeRequest", request1Id, {from: anon}])
                        .assertInvalidOpCode()
                        .start();
                });
                it("Not callable on invalid id", function(){
                   return createDefaultTxTester()
                        .doTx([treasury, "executeRequest", INVALID_ID, {from: admin}])
                        .assertInvalidOpCode()
                        .start(); 
                });
                it(".executeRequest() works.", function(){
                    return assertExecutesRequest(request1Id, false, "Not enough capital.");
                });
                it("Not callable again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "executeRequest", request1Id, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                });
            })
            describe(".cancelRequest()", function(){
                it(".cancelRequest() works after WAITING_TIME", function(){
                    return assertCancelsRequest(admin, request2Id)
                });
                it(".executeRequest() fails.", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "executeRequest", request2Id, {from: admin}])
                        .assertInvalidOpCode()
                        .start();
                });
            });
            describe(".executeRequest() fails after another week.", function(){
                it("Fast forward another week", function(){
                    return testUtil.fastForward(ONE_WEEK_S);
                });
                it(".executeRequest() results in cancellation.", function(){
                    return assertTimesOutRequest(admin, request3Id);
                });
            });
        });

        describe("Cannot create too many requests", async function(){
            const max = await treasury.MAX_PENDING_REQUESTS()
            const curPending = await treasury.numPendingRequests();
            const numToCreate = max.minus(curPending);
            const startId = (await treasury.curRequestId()).plus(1);
            const params = [treasury, "createRequest", 0, 0, 0, "", {from: admin}];

            before("Create max amount of requests.", async function(){
                for (var i=0; i<numToCreate; i++) {
                    this.logInfo(`Creating ${i+1} of ${numToCreate}...`);
                    const txTester = createDefaultTxTester();
                    if (i>0) txTester.silence();
                    await txTester.doTx(params).assertSuccess().start();
                }
            });
            it("Should not be able to create another", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "createRequest", 0, 0, 0, "", {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Cancel them all", async function(){
               for (var i=0; i<numToCreate; i++) {
                    this.logInfo(`Cancelling ${i+1} of ${numToCreate}...`);
                    await createDefaultTxTester()
                        .silence()
                        .doTx([treasury, "cancelRequest", startId.plus(i), "", {from: admin}])
                        .assertSuccess()
                        .start();
                } 
            })
        })
    });

    describe("Capital Management", function(){
        it(".addCapital() works", function(){
            return assertAddsCapital(anon, 1e9);
        });
        describe(".executeSendCapital()", function(){
            it("fails if invalid target", function(){
                // todo: get this to work.
                //return assertExecutesSendCapital(dummyComptroller, 1e9, false, "Target is not Bankrollable.");
                return assertExecutesSendCapital(investor1, 1e9, -1);
            })
            it("fails if not enough capital", function(){
                return assertExecutesSendCapital(br, 5e9, false, "Not enough capital.");
            });
            it("works", async function(){
                return assertExecutesSendCapital(br, 1e9, true, "Sent bankroll to target.");
            });
        });
    })

    describe("Before Setting Token", function(){
        describe("Can receive profits (but not distribute)", function(){
            it("Can receive profits", async function(){
                return assertReceivesProfits(anon, 1e5);
            });
            it("Cannot distribute (no token)", function(){
                return assertCannotDistribute("No address to distribute to.");
            });
        })
        describe("Can get bankroll back", function(){
            it(".executeRecallCapital() works", async function(){
                return assertExecutesRecallCapital(5e10, br, true, "Received bankoll back from target.");
            });
        });
        it(".executeRaiseCapital() fails", async function(){
            return assertExecutesRaiseCapital(1e9, -1);
        });
    });

    describe("Setting Comptroller and Token", function(){
        describe(".initComptroller()", function(){
            it("Cannot be set by anon", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", comptroller.address, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            })
            it("Cannot be set by admin", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", comptroller.address, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            })
            it("Works", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", comptroller.address, {from: owner}])
                    .assertSuccess()
                    .assertOnlyLog("ComptrollerSet", {
                        time: null,
                        comptroller: comptroller.address
                    })
                    .assertCallReturns([treasury, "comptroller"], comptroller.address)
                    .start();
            });
            it("Cannot be set again", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", comptroller.address, {from: owner}])
                    .assertInvalidOpCode()
                    .start();
            });
        })
        describe(".initToken()", function(){
            it("Cannot be set from anon", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initToken", token.address, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Cannot be set from admin", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initToken", token.address, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Can be set by owner", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initToken", token.address, {from: owner}])
                    .assertSuccess()
                        .assertOnlyLog("TokenSet", {
                            time: null,
                            token: token.address
                        })
                    .assertCallReturns([treasury, "token"], token.address)
                    .start();
            });
            it("Cannot be set again", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initToken", token.address, {from: owner}])
                    .assertInvalidOpCode()
                    .start();
            });
        });
    });

    describe(".executeRaiseCapital()", function(){
        it("Works now that there's a token set.", function(){
            return assertExecutesRaiseCapital(1e9, true, "Capital target raised.");
        });
    });

    describe("Simulate CrowdSale", function(){
        describe(".addReserve() callable by Comptroller", function(){

        });
        describe(".addCapital() callable by Comptroller", function(){

        });
    });

    describe("After CrowdSale", function(){
        describe("Can add and use capital", function(){
            it(".addCapital() works", function(){
                return assertAddsCapital(anon, 1e9);
            });
            it(".executeSendCapital() works", function(){
                return assertExecutesSendCapital(br, 1e9, true, "Sent bankroll to target.");
            });
        });

        describe(".distributeToToken() works", function(){
            before("Get some profits", function(){
                return assertReceivesProfits(anon, 1e5);
            });
            it(".distributeToToken() works", function(){
                return assertDistributes();
            });
            it(".distributeToToken() does not work again", function(){
                return assertCannotDistribute("No profits to distribute.");
            });
        });

        describe("Can get bankroll back", function(){
            it(".executeRecallCapital() works", function(){
                return assertExecutesRecallCapital(5e10, br, true, "Received bankoll back from target.");
            });
        });

        describe(".raiseCapital()", function(){
            it(".executeRaiseCapital() works", function(){
                return assertExecutesRaiseCapital(1e10, true, "Capital target raised.");
            });
            it("Investor1 can buy tokens", async function(){
                const remaining = await treasury.getAmountRaisable();
                const amt = remaining.div(2);
                return assertBuysTokens(investor1, amt);
            });
            it("Investor2 can buy the rest of the available tokens", async function(){
                const remaining = await treasury.getAmountRaisable();
                const amt = remaining.mul(5);
                return assertBuysTokens(investor2, amt); 
            })
        });
    });

    /////////////////////////////////////////////////////////////
    ////////// REQUEST HELPERS //////////////////////////////////
    /////////////////////////////////////////////////////////////

    const REQUEST_PROPS = [
        "id","typeId","target","value","executedSuccessfully",
        "dateCreated","dateCancelled","dateExecuted",
        "createdMsg","cancelledMsg","executedMsg"
    ];
    function requestFromObj(opts) {
        return REQUEST_PROPS.map((k, i) => {
            return opts[k]===undefined ? null : opts[k];
        });
    }
    async function getRequest(id) {
        const arr = await treasury.getRequest(id);
        const obj = {};
        REQUEST_PROPS.forEach((name, i) => obj[name] = arr[i]);
        return obj;
    }

    async function assertCreatesRequest(type, target, value, msg) {
        if (target.address) target = target.address;

        const allowed = ["SendCapital", "RecallCapital", "RaiseCapital"];
        const typeId = allowed.indexOf(type);
        if (typeId === -1)
            throw new Error(`invalid type: ${type}. Must be one of: ${allowed}`);

        const params = [treasury, "createRequest", typeId, target, value, msg, {from: admin}];
        const expId = (await treasury.curRequestId()).plus(1);
        const expNumPending = (await treasury.numPendingRequests()).plus(1);
        const expArr = requestFromObj({
            id: expId,
            requestType: typeId,
            target: target,
            value: value,
            executedSuccessfully: false,
            dateCreated: {not: 0},
            dateCancelled: null,
            dateExecuted: null,
            createdMsg: msg,
            cancelledMsg: "",
            executedMsg: "",            
        });

        return createDefaultTxTester()
            .doTx(params)
            .assertSuccess()
            .assertOnlyLog("RequestCreated", {
                time: null,
                id: expId,
                typeId: typeId,
                target: target,
                value: value,
                msg: msg
            })
            .assertCallReturns([treasury, "curRequestId"], expId)
            .assertCallReturns([treasury, "getRequest", expId], expArr)
            .assertCallReturns([treasury, "numPendingRequests"], expNumPending)
            .start();
    }

    async function assertCancelsRequest(account, id) {
        const REASON = "Some cancellation reason.";
        const expObj = await getRequest(id);
        expObj.dateCancelled = {not: 0};
        expObj.cancelledMsg = REASON;
        const expNumPending = (await treasury.numPendingRequests()).minus(1);

        return createDefaultTxTester()
            .doTx([treasury, "cancelRequest", id, REASON, {from: admin}])
            .assertSuccess()
            .assertOnlyLog("RequestCancelled", {
                time: null,
                id: id,
                typeId: expObj.typeId,
                target: expObj.target,
                msg: REASON
            })
            .assertCallReturns([treasury, "getRequest", id], requestFromObj(expObj))
            .assertCallReturns([treasury, "numPendingRequests"], expNumPending)
            .start();
    }

    async function assertExecutesRequest(id, expSuccess, expExecuteMsg) {
        if (expSuccess === -1) {
            console.log("Note: Executing is expected to fail.");
            return createDefaultTxTester()
                .doTx([treasury, "executeRequest", id, {from: admin}])
                .assertInvalidOpCode()
                .start();
        }

        const expObj = await getRequest(id);
        expObj.dateExecuted = {not: 0};
        expObj.executedSuccessfully = expSuccess;
        expObj.executedMsg = expExecuteMsg;
        const expNumPending = (await treasury.numPendingRequests()).minus(1);

        return createDefaultTxTester()
            .doTx([treasury, "executeRequest", id, {from: admin}])
            .assertSuccess()
            .assertLog("RequestExecuted", {
                time: null,
                id: id,
                typeId: expObj.typeId,
                target: expObj.target, 
                success: expSuccess,
                msg: expExecuteMsg
            })
            .assertCallReturns([treasury, "getRequest", id], requestFromObj(expObj))
            .assertCallReturns([treasury, "numPendingRequests"], expNumPending)
            .start();
    }

    async function assertTimesOutRequest(account, id) {
        const expObj = await getRequest(id);
        expObj.dateCancelled = {not: 0};
        expObj.cancelledMsg = "Request timed out.";
        const expNumPending = (await treasury.numPendingRequests()).minus(1);

        return createDefaultTxTester()
            .doTx([treasury, "executeRequest", id, {from: account}])
            .assertSuccess()
            .assertLog("RequestCancelled", {
                time: null,
                id: id,
                typeId: expObj.typeId,
                target: expObj.target,
                msg: "Request timed out."
            })
            .assertCallReturns([treasury, "getRequest", id], requestFromObj(expObj))
            .assertCallReturns([treasury, "numPendingRequests"], expNumPending)
            .start();
    }

    async function runRequest(type, target, value, expSuccess, expMsg) {
        console.log("First, create request.");
        await assertCreatesRequest(type, target, value, "Msg");
        const rId = await treasury.curRequestId();
        
        console.log("");
        console.log("Next, fast-forward so we can execute it.");
        await testUtil.fastForward(ONE_WEEK_S);
        
        console.log("");
        console.log("Execute it and test results.");
        await assertExecutesRequest(rId, expSuccess, expMsg);
    }

    async function assertExecutesSendCapital(target, amt, expSuccess, expMsg) {
        const AMT = new BigNumber(amt);
        const prevCap = await treasury.capital();
        const prevCapUtilized = await treasury.capitalUtilized();
        
        const txTester = createDefaultTxTester()
            .startWatching([treasury])
            .startLedger([target, treasury])
            .doFn(()=>{
                return runRequest("SendCapital", target, AMT, expSuccess, expMsg);
            })
            .stopLedger()
            .stopWatching();

        if (expSuccess==true){
            txTester
                .assertEvent(treasury, "ExecutedSendCapital", {
                    time: null,
                    bankrollable: br.address,
                    amount: AMT
                })
                .assertEvent(treasury, "CapitalRemoved", {
                    time: null,
                    recipient: br.address,
                    amount: AMT
                })
                .assertDelta(treasury, AMT.mul(-1))
                .assertDelta(target, AMT)
                .assertCallReturns([treasury, "capital"], prevCap.minus(AMT))
                .assertCallReturns([treasury, "capitalUtilized"], prevCapUtilized.plus(AMT));
        } else {
            txTester
                .assertNoDelta(treasury)
                .assertNoDelta(target)
                .assertCallReturns([treasury, "capital"], prevCap)
                .assertCallReturns([treasury, "capitalUtilized"], prevCapUtilized);
        }

        return txTester.start();
    }

    async function assertExecutesRecallCapital(amt, bankrollable, expSucces, expMsg) {
        amt = new BigNumber(amt);
        const bankrolled = await br.bankrolled(treasury.address);
        const prevCap = await treasury.capital();
        const prevCapUtilized = await treasury.capitalUtilized();
        var expAmount = amt;

        // See if it should return less than what we ask for.
        if (bankrolled.lt(amt)) {
            console.log("Note: Treasury has only bankrolled ${bankrolled}.")
            expAmount = bankrolled;
        }

        return createDefaultTxTester()
            .startWatching([treasury])
            .startLedger([br, treasury])
            .doFn(()=>{
                return runRequest("RecallCapital", br, amt, expSucces, expMsg);
            })
            .stopWatching()
                .assertEvent(treasury, "ExecutedRecallCapital", {
                    time: null,
                    bankrollable: br.address,
                    amount: expAmount
                })
                .assertEvent(treasury, "CapitalAdded", {
                    time: null,
                    sender: br.address,
                    amount: expAmount
                })
            .stopLedger()
                .assertDelta(treasury, expAmount)
                .assertDelta(br, expAmount.mul(-1))
            .assertCallReturns([treasury, "capital"], prevCap.plus(expAmount))
            .assertCallReturns([treasury, "capitalUtilized"], prevCapUtilized.minus(expAmount))
            .start();
    }

    async function assertExecutesRaiseCapital(amt, expSuccess, expMsg) {
        amt = new BigNumber(amt);
        const prevCapitalTarget = await treasury.capitalTarget();
        const prevAmountRaisable = await treasury.getAmountRaisable();

        const txTester = createDefaultTxTester()
            .startLedger([treasury])
            .doFn(()=>{
                return runRequest("RaiseCapital", NO_ADDRESS, amt, expSuccess, expMsg)
            })
            .stopLedger()
                .assertNoDelta(treasury);

        if (expSuccess == true) {
            txTester
                .assertCallReturns([treasury, "capitalTarget"], prevCapitalTarget.plus(amt))
                .assertCallReturns([treasury, "getAmountRaisable"], prevAmountRaisable.plus(amt.mul(2)));
        } else {
            txTester
                .assertCallReturns([treasury, "capitalTarget"], prevCapitalTarget)
                .assertCallReturns([treasury, "getAmountRaisable"], prevAmountRaisable);
        }
            
        return txTester.start();
    }

    /////////////////////////////////////////////////////////////


    /////////////////////////////////////////////////////////////
    ////////// OTHER HELPERS ////////////////////////////////////
    /////////////////////////////////////////////////////////////

    async function assertAddsCapital(account, amt) {
        amt = new BigNumber(amt);
        const expCapital = (await treasury.capital()).plus(amt);
        return createDefaultTxTester()
            .doTx([treasury, "addCapital", {value: amt, from: account}])
            .assertSuccess()
            .assertOnlyLog("CapitalAdded", {
                time: null,
                sender: account,
                amount: amt
            })
            .assertCallReturns([treasury, "capital"], expCapital)
            .start();
    }

    async function assertReceivesProfits(account, amt) {
        amt = new BigNumber(amt);
        const prevProfits = await treasury.currentProfits();
        return createDefaultTxTester()
            .startLedger([treasury, account])
            .doTx([treasury, "sendTransaction", {value: amt, from: account}])
            .assertSuccess()
                .assertOnlyLog("ProfitsReceived", {
                    time: null,
                    sender: account,
                    amount: amt
                })
            .stopLedger()
                .assertDelta(treasury, amt)
                .assertDeltaMinusTxFee(account, amt.mul(-1))
            .start();
    }

    function assertCannotDistribute(expMsg) {
        return createDefaultTxTester()
            .wait(500)
            .startLedger([treasury])
            .doTx([treasury, "distributeToToken", {from: anon}])
            .assertSuccess()
                .assertOnlyLog("DistributeFailure", {
                    time: null,
                    msg: expMsg
                })
            // .stopLedger()
                // .assertNoDelta(treasury)
            .start();
    }

    async function assertDistributes() {
        const profits = await treasury.currentProfits();
        const prevTotalDistributed = await treasury.totalDistributed;
        const prevTotalRewarded = await treasury.totalRewarded;
        const expReward = profits.mul(.001);

        console.log(`Note: Current profits are: ${profits}`);
        return createDefaultTxTester()
            .wait(100)
            .assertCallReturns([treasury, "getDistributeReward"], expReward)
            .startLedger([anon, treasury, token])
            .doTx([treasury, "distributeToToken", {from: anon}])
            .assertSuccess()
                .assertLogCount(2)
                .assertLog("DistributeSuccess", {
                    time: null,
                    token: token.address,
                    amount: profits.minus(expReward)
                })
                .assertLog("DistributeRewardPaid", {
                    time: null,
                    recipient: anon,
                    amount: expReward
                })
            .stopLedger()
                .assertDelta(treasury, profits.mul(-1))
                .assertDelta(token, profits.minus(expReward))
                .assertDeltaMinusTxFee(anon, expReward)
            .start();
    }

    async function assertBuysTokens(account, amt) {
        amt = new BigNumber(amt);
        const prevRaisable = await treasury.getAmountRaisable();
        const prevReserve = await treasury.reserve();
        const prevCapital = await treasury.capital();
        const prevCapitalRaised = await treasury.capitalRaised();
        const prevTokens = await token.balanceOf(account);

        var expAmt = amt;
        if (amt.gt(prevRaisable)) {
            console.log(`Note: Only ${prevRaisable} is raisable. Should get a refund.`);
            expAmt = prevRaisable;
        }

        const expReserve = expAmt.div(2).floor();
        const expCapital = expAmt.minus(expReserve);
        const expLogs = [
            ["ReserveAdded", {
                time: null,
                sender: account,
                amount: expReserve
            }],
            ["CapitalAdded", {
                time: null,
                sender: account,
                amount: expCapital
            }],
            ["CapitalRaised", {
                time: null,
                sender: account,
                amount: expCapital
            }]
        ];
        if (expAmt.lt(amt)) {
            expLogs.push(["CapitalRefunded", {
                time: null,
                recipient: account,
                amount: amt.minus(expAmt)
            }]);
        }

        const txTester = createDefaultTxTester()
            .startLedger([account, treasury])
            .doTx([treasury, "raiseCapital", {value: amt, from: account}])
            .assertSuccess()
            .assertLogCount(expLogs.length);

        expLogs.forEach(l => {
            txTester.assertLog(l[0], l[1]);
        })

        return txTester
            .stopLedger()
                .assertDelta(treasury, expAmt)
                .assertDeltaMinusTxFee(account, expAmt.mul(-1))
            .assertCallReturns([treasury, "reserve"], prevReserve.plus(expReserve))
            .assertCallReturns([treasury, "capital"], prevCapital.plus(expCapital))
            .assertCallReturns([treasury, "capitalRaised"], prevCapitalRaised.plus(expCapital))
            .assertCallReturns([treasury, "getAmountRaisable"], prevRaisable.minus(expAmt))
            .assertCallReturns([token, "balanceOf", account], prevTokens.plus(expAmt))
            .start();
    }

    async function assertIsBalanced() {
        const balance = testUtil.getBalance(treasury);
        const reserve = await treasury.reserve();
        const capital = await treasury.capital();
        const profits = await treasury.currentProfits();
        const expBalance = reserve.plus(capital).plus(profits);
        assert(balance.equals(expBalance), `balance (${balance}), should be ${expBalance}`);
        console.log("✓ balance == (reserve + capital + profits)");
    }
});