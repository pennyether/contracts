const Registry = artifacts.require("Registry");
const Treasury = artifacts.require("Treasury");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;

describe('Treasury', function(){
    const accounts = web3.eth.accounts;
    const dummyMainController = accounts[0];
    const addresses = {};
    var registry;
    var treasury;

    before("Set up registry and treasury", async function(){
        registry = await Registry.new();
        await registry.register("MAIN_CONTROLLER", dummyMainController);
        treasury = await Treasury.new(registry.address);
        createDefaultTxTester().plugins.nameAddresses({
            registry: registry,
            treasury: treasury,
            dummyMainController: dummyMainController,
        });
    });

    it("should point to dummyPac", function(){
        return createDefaultTxTester()
            .assertStateAsString(treasury, "getMainController", dummyMainController)
            .start();
    });

    it("should accept funds", function(){
       return createDefaultTxTester()
            .doTx(() => testUtil.transfer(accounts[0], treasury.address, 500000))
            .assertSuccess()
            .assertBalance(treasury, 500000, "Treasury got some wei")
            .start();
    });

    describe(".fundMainController()", function(){
        it("is not callable by random accounts", function(){
            return createDefaultTxTester()
                .doTx(() => treasury.fundMainController(1, {from: accounts[1]}))
                .assertInvalidOpCode()
                .doTx(() => treasury.fundMainController(1, {from: accounts[2]}))
                .assertInvalidOpCode()
                .start();
        });

        describe("works correctly", function(){
            createDefaultTxTester()
                .it("call returns true")
                    .doCall(() => treasury.fundMainController.call(1, {from: dummyMainController}))
                    .assertResultAsString(true)
                .it("executes transaction from dummyMainController", true)
                    .startLedger([treasury, dummyMainController])
                    .doTx(() => treasury.fundMainController(12345, {from: dummyMainController}))
                    .stopLedger()
                    .assertSuccess()
                .it("transfers correct amount")
                    .assertDeltaMinusTxFee(dummyMainController, 12345)
                    .assertDelta(treasury, -12345)
                .it("logs correctly")
                    .assertOnlyLog("TransferSuccess", {recipient: dummyMainController, value: 12345})
                .start().swallow();
        });

        describe("when asking for too much", function(){
            createDefaultTxTester()
                .it("call returns false", true)
                    .assertBalanceLessThan(treasury, 1000000)
                    .doCall(() => treasury.fundMainController.call(1000000, {from: dummyMainController}))
                    .assertResultAsString(false)
                .it("executes transaction from dummyMainController", true)
                    .startLedger([treasury.address, dummyMainController])
                    .doTx(() => treasury.fundMainController(1000000, {from: dummyMainController}))
                    .stopLedger()
                    .assertSuccess()
                .it("transfers no amount")
                    .assertDelta(treasury.address, 0)
                    .assertLostTxFee(dummyMainController)
                .it("logs 'NotEnoughFunds' with correct values")
                    .assertOnlyLog("NotEnoughFunds", {recipient: dummyMainController, value: 1000000})
                .start().swallow();
        });
    })
});