const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("Treasury");
const MockComptroller = artifacts.require("MockComptroller");
const TestBankrollable = artifacts.require("TestBankrollable");
const Ledger = artifacts.require("Ledger");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const ONE_WEEK_S = 60*60*24*7 + 1;

describe('Treasury', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[1];
    const admin = accounts[2];
    const anon = accounts[3];
    const notBankrollable = accounts[4];
    const dummyToken = accounts[5];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    var registry;
    var treasury;
    var mockComptroller;
    var br;


    before("Set up registry and treasury", async function(){
        const addresses = {
            owner: owner,
            admin: admin,
            anon: anon,
            notBankrollable: notBankrollable,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create Registry, and register ADMIN");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon})
            .assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register", "ADMIN", admin, {from: owner}])
            .assertSuccess()
            .start();

        this.logInfo("Create Treasury, register it");
        await createDefaultTxTester()
            .doNewTx(Treasury, [registry.address, owner], {from: anon})
            .assertSuccess()
            .withTxResult((txRes, plugins)=>{
                treasury = txRes.contract;
                plugins.addAddresses({treasury: treasury});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register", "TREASURY", treasury.address, {from: owner}])
            .assertSuccess()
            .start();

        this.logInfo("Create mockComptroller, pointing to Treasury");
        await createDefaultTxTester()
            .doNewTx(MockComptroller, [], {from: anon})
            .assertSuccess()
            .withTxResult(async function(txRes, plugins){
                mockComptroller = txRes.contract;
                plugins.addAddresses({
                    mockComptroller: mockComptroller
                });
            }).start();

        this.logInfo("Create Bankrollable contract");
        await createDefaultTxTester()
            .doNewTx(TestBankrollable, [registry.address], {from: anon})
            .assertSuccess()
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
                this.logInfo("Valid typeIds are 0, 1, 2, 3. 4 is not valid.")
                return createDefaultTxTester()
                    .doTx([treasury, "createRequest", 4, 0, 0, "foo", {from: admin}])
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
                it("Not callable on invalid id", function(){
                   return createDefaultTxTester()
                        .doTx([treasury, "executeRequest", INVALID_ID, {from: anon}])
                        .assertInvalidOpCode()
                        .start(); 
                });
                it(".executeRequest() works, callable by anyone", function(){
                    return assertExecutesRequest(request1Id, false, "Not enough capital.");
                });
                it("Not callable again", function(){
                    return createDefaultTxTester()
                        .doTx([treasury, "executeRequest", request1Id, {from: anon}])
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
            this.logInfo("This tests against an attack where a malicious Admin creates");
            this.logInfo(" so many requests that they cannot all possibly be cancelled.");
            this.logInfo("To prevent this situation, there is a limit to how many Requests");
            this.logInfo(" can be in a 'Pending' state.");
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
            return assertAddsCapital(anon, 10e9);
        });
        describe(".executeSendCapital()", function(){
            it("fails if target doesnt have .getTreasury()", function(){
                this.logInfo("In this example, we try to send bankroll to a regular account.");
                this.logInfo("This should fail, as it does not implement Bankrollable.");
                return assertExecutesSendCapital(notBankrollable, 1e9, false, "Bankrollable does not have correct Treasury.");
            });
            it("fails if not enough capital", function(){
                return assertExecutesSendCapital(br, 11e9, false, "Not enough capital.");
            });
            it("fails if target has invalid .getTreasury()", async function(){
                this.logInfo("First, change registry TREASURY");
                const invalidTreasury = (new BigNumber(treasury.address).minus(1));
                await createDefaultTxTester()
                    .doTx([registry, "register", "TREASURY", invalidTreasury, {from: owner}])
                    .assertSuccess().start();

                this.logInfo("");
                this.logInfo("Now br's .getTreasury() points to wrong treasury.");
                await assertExecutesSendCapital(br, 5e9, false, "Bankrollable does not have correct Treasury.");
                
                this.logInfo("");
                this.logInfo("Reset registry TREASURY");
                await createDefaultTxTester()
                    .doTx([registry, "register", "TREASURY", treasury.address, {from: owner}])
                    .assertSuccess().start();
            });
            it("works", async function(){
                return assertExecutesSendCapital(br, 5e9, true, "Sent bankroll to target.");
            });
            it("works again", async function(){
               return assertExecutesSendCapital(br, 1e9, true, "Sent bankroll to target."); 
            });
        });
        describe(".executeRecallCapital()", function(){
            it("fails if target doesnt implement .removeBankroll", function(){
                return runRequest("RecallCapital", anon, 1e18, -1);
            });
            it("works", function(){
                return assertExecutesRecallCapital(br, 1e9, true, "Received bankoll back from target."); 
            });
            it("removes mapping if all bankroll is recalled", function(){
                this.logInfo("Here we request way more back than we put in.")
                this.logInfo("It should work, but only send back the remainder.");
                this.logInfo("Since no more is being bankrolled, mapping should be removed.");
                return assertExecutesRecallCapital(br, 50e9, true, "Received bankoll back from target."); 
            });
            it("nothing happens if called again", function(){
                return assertExecutesRecallCapital(br, 10e9, true, "Received bankoll back from target."); 
            });
        });
        describe(".executeDistributeCapital()", function(){
            it("fails if not enough capital", function(){
                return assertExecutesDistributeCapital(10e18, false, "Not enough capital.");
            });
            it("works", function(){
                return assertExecutesDistributeCapital(1e9, true, "Capital moved to profits."); 
            });
        });
        describe("send and recall capital from many different contracts", function(){
            this.logInfo("This tests that the doubly linked list works correctly.");

            const brs = [];
            before("Create several bankrollable contracts", async function(){
                const obj = {};
                for (var i=0; i<5; i++) {
                    let index = i;
                    const name = `tempBankrollable${index}`;
                    this.logInfo(`Creating ${name}...`);
                    await createDefaultTxTester()
                        .doNewTx(TestBankrollable, [registry.address], {from: anon})
                        .withTxResult((txRes, plugins)=>{
                            br = txRes.contract;
                            obj[name] = br;
                            brs[i] = br;
                        }).start();
                }
                return createDefaultTxTester().addAddresses(obj).start();
            });

            it("Send to #0", function(){
                return assertExecutesSendCapital(brs[0], 1000, true, null, true);
            });
            it("Send to #1", function(){
                return assertExecutesSendCapital(brs[1], 1001, true, null, true);
            });
            it("Send to #2", function(){
                return assertExecutesSendCapital(brs[2], 1002, true, null, true);
            });
            it("Send to #3", function(){
                return assertExecutesSendCapital(brs[3], 1003, true, null, true);
            });
            it("Recall from #0", function(){
                return assertExecutesRecallCapital(brs[0], 1000, true, null, true);
            });
            it("Recall from #2", function(){
                return assertExecutesRecallCapital(brs[2], 1002, true, null, true);
            });
            it("Recall from #3", function(){
                return assertExecutesRecallCapital(brs[3], 1003, true, null, true);
            });
            it("Send to #4", function(){
                return assertExecutesSendCapital(brs[4], 1004, true, null, true);
            });
            it("Recall from #1", function(){
                return assertExecutesRecallCapital(brs[1], 1001, true, null, true);
            });
            it("Recall from #4", function(){
                return assertExecutesRecallCapital(brs[4], 1004, true, null, true);
            });
        });
    })

    describe("Before Setting Token", function(){
        describe("Can receive profits (but not issue dividend)", function(){
            it("Can receive profits", async function(){
                return assertReceivesProfits(anon, 1e5);
            });
            it(".profitsSendable() returns 0 (no comptroller)", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "profitsSendable"], 0)
                    .start();
            });
            it("Cannot issue dividend (no comptroller)", function(){
                return assertCannotIssueDividend("Comptroller not yet set.");
            });
        })
        it(".executeRaiseCapital() works", async function(){
            return assertExecutesRaiseCapital(1e9, true, "Capital target raised.");
        });
    });

    describe("Setting Comptroller", function(){
        describe(".initComptroller()", function(){
            before("Set-up comptroller", async function(){
                await mockComptroller.setToken(dummyToken, {from: anon});
                await mockComptroller.setTreasury(treasury.address, {from: anon});
            });
            it("Cannot be set by anon", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", mockComptroller.address, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            })
            it("Cannot be set by admin", async function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", mockComptroller.address, {from: admin}])
                    .assertInvalidOpCode()
                    .start();
            })
            it("Cannot be set to bad comptroller", async function(){
                this.logInfo("We set mockComptroller's .treasury() to something random.");
                this.logInfo("Treasury should reject comptroller.");
                await mockComptroller.setTreasury(anon, {from: anon});
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", mockComptroller.address, {from: owner}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works", async function(){
                this.logInfo("We set mockComptroller's .treasury() to treasury.");
                this.logInfo("Treasury should accept comptroller now.");
                await mockComptroller.setTreasury(treasury.address, {from: anon});
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", mockComptroller.address, {from: owner}])
                    .assertSuccess()
                    .assertOnlyLog("ComptrollerSet", {
                        time: null,
                        comptroller: mockComptroller.address,
                        token: dummyToken
                    })
                    .assertCallReturns([treasury, "comptroller"], mockComptroller.address)
                    .start();
            });
            it("Cannot be set again", function(){
                return createDefaultTxTester()
                    .doTx([treasury, "initComptroller", mockComptroller.address, {from: owner}])
                    .assertInvalidOpCode()
                    .start();
            });
        });
    });

    describe("Before CrowdSale", function(){
        it(".profitsSendable() returns 0 (CrowdSale not yet completed)", function(){
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "profitsSendable"], 0)
                    .start();
            });
        it("Cannot issue dividend", function(){
            return assertCannotIssueDividend("CrowdSale not yet completed.");
        });
    });

    describe("Simulate CrowdSale", async function(){
        it("End mockComptroller's CrowdSale (sets wasSaleEnded to true)", function(){
            return createDefaultTxTester()
                .doTx([mockComptroller, "endCrowdSale", {from: anon}])
                .assertSuccess()
                .assertCallReturns([mockComptroller, "wasSaleEnded"], true)
                .start();
        });
    });

    describe("After CrowdSale", function(){
        describe(".issueDividend() now works", function(){
            before("Get some profits", function(){
                return assertReceivesProfits(anon, 1e5);
            });
            it(".profitsSendable() returns correct value", async function(){
                const profits = await treasury.profits();
                return createDefaultTxTester()
                    .assertCallReturns([treasury, "profitsSendable"], profits)
                    .start();
            })
            it(".issueDividend() works", function(){
                return assertIssuesDividend();
            });
            it(".issueDividend() does not work again", function(){
                return assertCannotIssueDividend("No profits to send.");
            });
        });

        describe("Can still add, send, and recall capital", function(){
            it(".addCapital() works", function(){
                return assertAddsCapital(anon, 1e9);
            });
            it(".executeSendCapital() works", function(){
                return assertExecutesSendCapital(br, 1e9, true, "Sent bankroll to target.");
            });
            it(".executeRecallCapital() works", function(){
                return assertExecutesRecallCapital(br, 5e10, true, "Received bankoll back from target.");
            });
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

    async function assertCreatesRequest(type, target, value, msg, silence) {
        if (target.address) target = target.address;

        const allowed = ["SendCapital", "RecallCapital", "RaiseCapital", "DistributeCapital"];
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

        console.log(`Creating "${type} Request to ${target} with value ${value}...`);
        return createDefaultTxTester()
            .doTx(params)
            .silence(!!silence)
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
            .assertCallReturns([treasury, "pendingRequestIds", expNumPending.minus(1)], expId)
            .start();
    }

    async function assertCancelsRequest(account, id) {
        const REASON = "Some cancellation reason.";
        const expObj = await getRequest(id);
        expObj.dateCancelled = {not: 0};
        expObj.cancelledMsg = REASON;
        const expNumPending = (await treasury.numPendingRequests()).minus(1);
        const expNumCancelled = (await treasury.numCancelledRequests()).plus(1);

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
            .assertCallReturns([treasury, "numCancelledRequests"], expNumCancelled)
            .assertCallReturns([treasury, "cancelledRequestIds", expNumCancelled.minus(1)], id)
            .start();
    }

    async function assertExecutesRequest(id, expSuccess, expExecuteMsg, silence) {
        if (expSuccess === -1) {
            console.log("Note: Executing is expected to fail.");
            return createDefaultTxTester()
                .doTx([treasury, "executeRequest", id, {from: anon}])
                .assertInvalidOpCode()
                .start();
        }

        const expObj = await getRequest(id);
        expObj.dateExecuted = {not: 0};
        expObj.executedSuccessfully = expSuccess;
        expObj.executedMsg = expExecuteMsg;
        const expNumPending = (await treasury.numPendingRequests()).minus(1);
        const expNumCompleted = (await treasury.numCompletedRequests()).plus(1);

        return createDefaultTxTester()
            .doTx([treasury, "executeRequest", id, {from: anon}])
            .silence(!!silence)
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
            .assertCallReturns([treasury, "numCompletedRequests"], expNumCompleted)
            .assertCallReturns([treasury, "completedRequestIds", expNumCompleted.minus(1)], id)
            .start();
    }

    async function assertTimesOutRequest(account, id) {
        const expObj = await getRequest(id);
        expObj.dateCancelled = {not: 0};
        expObj.cancelledMsg = "Request timed out.";
        const expNumPending = (await treasury.numPendingRequests()).minus(1);
        const expNumCancelled = (await treasury.numCancelledRequests()).plus(1);

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
            .assertCallReturns([treasury, "numCancelledRequests"], expNumCancelled)
            .assertCallReturns([treasury, "cancelledRequestIds", expNumCancelled.minus(1)], id)
            .start();
    }

    async function runRequest(type, target, value, expSuccess, expMsg, silence) {
        console.log("First, create request.");
        await assertCreatesRequest(type, target, value, "Msg", silence);
        const rId = await treasury.curRequestId();
        
        console.log("");
        console.log("Next, fast-forward so we can execute it.");
        await testUtil.fastForward(ONE_WEEK_S);
        
        console.log("");
        console.log("Execute it and test results.");
        await assertExecutesRequest(rId, expSuccess, expMsg || null, silence);
    }

    // todo: update this to test getBankrolledMappings()
    const EXP_BANKROLLED_MAPPINGS = [];

    function addExpBankrolled(target, amt) {
        const entry = EXP_BANKROLLED_MAPPINGS.find(m => m[0]==target);
        if (!entry) {
            console.log("Bankrollable mapping should be added.");
            EXP_BANKROLLED_MAPPINGS.unshift([target, amt]);
        } else {
            console.log("Bankrollable mapping should be increased.");
            entry[1] = entry[1].plus(amt);
        }
    }
    function removeExpBankrolled(target, amt) {
        const entry = EXP_BANKROLLED_MAPPINGS.find(m => m[0]==target);
        var amtToBeRemoved;
        if (!entry) {
            console.log(`Bankrollable mapping doesn't exist.`);
            amtToBeRemoved = new BigNumber(0);
        } else if (entry[1].gt(amt)) {
            console.log(`Bankrollable mapping should decrease by ${amt}`)
            amtToBeRemoved = amt;
            entry[1] = entry[1].minus(amt);
        } else {
            console.log(`Bankrollable mapping should be deleted. Only ${amtToBeRemoved} to be recalled.`);
            amtToBeRemoved = entry[1];
            const index = EXP_BANKROLLED_MAPPINGS.indexOf(entry);
            EXP_BANKROLLED_MAPPINGS.splice(index, 1);
        }
        return amtToBeRemoved;
    }
    function getExpBrMapping() {
        const addrs = EXP_BANKROLLED_MAPPINGS.map(m => m[0]);
        const amts = EXP_BANKROLLED_MAPPINGS.map(m => m[1]);
        return [addrs, amts];
    }

    async function assertExecutesSendCapital(bankrollable, amt, expSuccess, expMsg, silenceRun) {
        if (bankrollable.address) bankrollable = bankrollable.address;
        amt = new BigNumber(amt);
        const expAmt = expSuccess ? amt : new BigNumber(0);
        const expCapital = (await treasury.capital()).minus(expAmt);
        const expCapAllocated = (await treasury.capitalAllocated()).plus(expAmt);
        
        const txTester = createDefaultTxTester()
            .startWatching([treasury])
            .startLedger([bankrollable, treasury])
            .doFn(()=>{
                return runRequest("SendCapital", bankrollable, amt, expSuccess, expMsg, silenceRun);
            })
            .stopLedger()
            .stopWatching();

        if (expSuccess==true){
            addExpBankrolled(bankrollable, amt);
            txTester
                .assertEvent(treasury, "ExecutedSendCapital", {
                    time: null,
                    bankrollable: bankrollable,
                    amount: amt
                })
                .assertEvent(treasury, "CapitalRemoved", {
                    time: null,
                    recipient: bankrollable,
                    amount: amt
                });
        }

        const ledger = Ledger.at(await treasury.capitalLedger());
        return txTester
            .assertDelta(treasury, expAmt.mul(-1))
            .assertDelta(bankrollable, expAmt)
            .assertCallReturns([treasury, "capital"], expCapital)
            .assertCallReturns([treasury, "capitalAllocated"], expCapAllocated)
            .assertCallReturns([ledger, "balances"], getExpBrMapping())
            //.assertCallReturns([treasury, "capitalAllocation"], getExpBrMapping())
            .doFn(assertIsBalanced)
            .start();
    }

    async function assertExecutesRecallCapital(bankrollable, amt, expSuccess, expMsg, silenceRun) {
        if (bankrollable.address) bankrollable = bankrollable.address;
        amt = new BigNumber(amt);
        const expAmt = expSuccess ? removeExpBankrolled(bankrollable, amt) : 0;
        const expCapital = (await treasury.capital()).plus(expAmt);
        const expCapAllocated = (await treasury.capitalAllocated()).minus(expAmt);

        const txTester = createDefaultTxTester()
            .startWatching([treasury])
            .startLedger([bankrollable, treasury])
            .doFn(()=>{
                return runRequest("RecallCapital", bankrollable, amt, expSuccess, expMsg, silenceRun);
            })
            .stopWatching()
                .assertEvent(treasury, "ExecutedRecallCapital", {
                    time: null,
                    bankrollable: bankrollable,
                    amount: expAmt
                });

        if (expAmt.gt(0)) {
            txTester
                .assertEvent(treasury, "CapitalAdded", {
                    time: null,
                    sender: bankrollable,
                    amount: expAmt
                });
        }

        const ledger = Ledger.at(await treasury.capitalLedger());
        return txTester
            .stopLedger()
                .assertDelta(treasury, expAmt)
                .assertDelta(bankrollable, expAmt.mul(-1))
            .assertCallReturns([treasury, "capital"], expCapital)
            .assertCallReturns([treasury, "capitalAllocated"], expCapAllocated)
            .assertCallReturns([ledger, "balances"], getExpBrMapping())
            //.assertCallReturns([treasury, "capitalAllocation"], getExpBrMapping())
            .doFn(assertIsBalanced)
            .start();
    }

    async function assertExecutesRaiseCapital(amt, expSuccess, expMsg) {
        amt = new BigNumber(amt);
        const expIncrease = expSuccess ? amt : new BigNumber(0);
        const expCapitalTarget = (await treasury.capitalRaisedTarget()).plus(expIncrease);
        const expCapitalNeeded = (await treasury.capitalNeeded()).plus(expIncrease);

        return createDefaultTxTester()
            .startLedger([treasury])
            .doFn(()=>{
                return runRequest("RaiseCapital", NO_ADDRESS, amt, expSuccess, expMsg)
            })
            .stopLedger()
                .assertNoDelta(treasury)
            .assertCallReturns([treasury, "capitalRaisedTarget"], expCapitalTarget)
            .assertCallReturns([treasury, "capitalNeeded"], expCapitalNeeded)
            .doFn(assertIsBalanced)
            .start();
    }

    async function assertExecutesDistributeCapital(amt, expSuccess, expMsg) {
        amt = new BigNumber(amt);
        const expIncrease = expSuccess ? amt : new BigNumber(0);
        const expCapital = (await treasury.capital()).minus(expIncrease);
        const expProfits = (await treasury.profits()).plus(expIncrease);

        return createDefaultTxTester()
            .startLedger([treasury])
            .doFn(()=>{
                return runRequest("DistributeCapital", NO_ADDRESS, amt, expSuccess, expMsg)
            })
            .stopLedger()
                .assertNoDelta(treasury)
            .assertCallReturns([treasury, "capital"], expCapital, `Decreases by ${amt}`)
            .assertCallReturns([treasury, "profits"], expProfits, `Increases by ${amt}`)
            .doFn(assertIsBalanced)
            .start();   
    }

    /////////////////////////////////////////////////////////////


    /////////////////////////////////////////////////////////////
    ////////// OTHER HELPERS ////////////////////////////////////
    /////////////////////////////////////////////////////////////

    async function assertAddsCapital(account, amt) {
        amt = new BigNumber(amt);
        const isRaised = account == mockComptroller.address;
        const expCapital = (await treasury.capital()).plus(amt);
        const expCapitalRaised = (await treasury.capitalRaised()).plus(isRaised ? amt : 0);
        const expLogs = [["CapitalAdded",{
            time: null,
            sender: account,
            amount: amt
        }]];
        if (isRaised) {
            console.log("This should trigger CapitalRaised event.")
            expLogs.push(["CapitalRaised", {
                time: null,
                amount: amt,
            }]);
        }

        const txTester = createDefaultTxTester()
            .doTx([treasury, "addCapital", {value: amt, from: account}])
            .assertSuccess()
            .assertLogCount(expLogs.length);

        expLogs.forEach(l=>{
            txTester.assertLog(l[0], l[1]);
        });

        return txTester
            .assertCallReturns([treasury, "capital"], expCapital)
            .assertCallReturns([treasury, "capitalRaised"], expCapitalRaised)
            .doFn(assertIsBalanced)
            .start();
    }

    async function assertReceivesProfits(account, amt) {
        amt = new BigNumber(amt);
        const expProfits = (await treasury.profits()).plus(amt);
        const expProfitsTotal = (await treasury.profitsTotal()).plus(amt);
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
            .assertCallReturns([treasury, "profits"], expProfits)
            .assertCallReturns([treasury, "profitsTotal"], expProfitsTotal)
            .doFn(assertIsBalanced)
            .start();
    }

    async function assertCannotIssueDividend(expMsg) {
        const expProfits = await treasury.profits();
        const expProfitsSent = await treasury.profitsSent();
        return createDefaultTxTester()
            .wait(500)
            .startLedger([treasury])
            .doTx([treasury, "issueDividend", {from: anon}])
            .assertSuccess()
                .assertOnlyLog("DividendFailure", {
                    time: null,
                    msg: expMsg
                })
            .stopLedger()
                .assertNoDelta(treasury)
            .assertCallReturns([treasury, "profits"], expProfits)
            .assertCallReturns([treasury, "profitsSent"], expProfitsSent)
            .start();
    }

    async function assertIssuesDividend() {
        const profits = await treasury.profits();
        const expProfitsSent = (await treasury.profitsSent()).plus(profits);
        const expProfitsTotal = expProfitsSent;

        console.log(`Note: Current profits are: ${profits}`);
        return createDefaultTxTester()
            .wait(100)
            .startLedger([anon, treasury, dummyToken])
            .doTx([treasury, "issueDividend", {from: anon}])
            .assertSuccess()
                .assertOnlyLog("DividendSuccess", {
                    time: null,
                    token: dummyToken,
                    amount: profits
                })
            .stopLedger()
                .assertDelta(treasury, profits.mul(-1))
                .assertDelta(dummyToken, profits)
            .assertCallReturns([treasury, "profitsSent"], expProfitsSent)
            .assertCallReturns([treasury, "profitsTotal"], expProfitsTotal)
            .doFn(assertIsBalanced)
            .start();
    }

    async function assertIsBalanced() {
        const balance = testUtil.getBalance(treasury);
        const capital = await treasury.capital();
        const profits = await treasury.profits();
        const expBalance = capital.plus(profits);
        assert(balance.equals(expBalance), `balance (${balance}), should be ${expBalance}`);
        console.log("✓ balance == (capital + profits)");
    }
});