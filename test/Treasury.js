var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");

var createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
var testUtil = createDefaultTxTester().plugins.testUtil;
var Ledger = createDefaultTxTester().plugins.Ledger;
var BigNumber = require("bignumber.js");



describe('Treasury', function(){
    var accounts = web3.eth.accounts;
    var registry;
    var treasury;
    var dummyMainController = accounts[0];
    var addresses = {};

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
            .assertState(treasury, "getMainController", dummyMainController)
            .start();
    });

    it("should accept funds", function(){
       return createDefaultTxTester()
            .doTx(() => testUtil.transfer(accounts[0], treasury.address, 500000))
            .assertSuccess()
            .assertBalance(treasury, 500000, "Treasury got some wei")
            .start();
    });

    it(".fundMainController() is not callable by random accounts", function(){
        return createDefaultTxTester()
            .doTx(() => treasury.fundMainController(1, {from: accounts[1]}))
            .assertInvalidOpCode()
            .doTx(() => treasury.fundMainController(1, {from: accounts[2]}))
            .assertInvalidOpCode()
            .start();
    });

    describe(".fundMainController() works correctly", function(){
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
                .assertOneLog("TransferSuccess", {recipient: dummyMainController, value: 12345})
            .start().swallow();
    });

    describe(".fundMainController() when asking for too much", function(){
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
                .assertOneLog("NotEnoughFunds", {recipient: dummyMainController, value: 1000000})
            .start().swallow();
    });
});