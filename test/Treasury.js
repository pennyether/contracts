var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var TxTester = require("../js/tx-tester.js");
var Ledger = TestUtil.Ledger;
var BigNumber = require("bignumber.js");

contract('Treasury', function(accounts){
    var txTester = function(){ return TxTester(); }
    var treasury;
    var registry;
    var dummyMainController;

    before("Set up registry and treasury", async function(){
        dummyMainController = accounts[5];
        registry = await Registry.new();
        await registry.register("MAIN_CONTROLLER", dummyMainController);
        treasury = await Treasury.new(registry.address);
    });

    it("should point to the dummyPac", async function(){
        assert.equal(await treasury.getMainController(), dummyMainController, "Treasury points to correct MainController");
    });

    it.only("should accept funds", async function(){
        var amt = new BigNumber(50000);
        await TestUtil.transfer(accounts[0], treasury.address, amt);
        assert.strEqual(TestUtil.getBalance(treasury.address), amt, "Treasury got some wei");
    });

    it("fundMainController is not callable by randos", async function(){
        await txTester()
            .do(() => treasury.fundMainController(1, {from: accounts[0]}))
            .assertInvalidOpCode();
        
        await txTester()
            .do(() => treasury.fundMainController(1, {from: accounts[1]}))
            .assertInvalidOpCode();
    });

    it("transfers funds, logs correctly", function(){
        return txTester()
            .watch([treasury, dummyMainController])
            .watchEventsOf([treasury, registry])
            .do(() => treasury.fundMainController(12345, {from: dummyMainController}))
            .logBalance(treasury)
            .stopWatching()
            .assertSuccess()
            .assertOneLog("TransferSuccess", {recipient: dummyMainController, value: 12345})
            .assertDeltaMinusTxFee(dummyMainController, 12345, "dummyMainController gained 12345 minus txFee")
            .assertDelta(treasury.address, -12345, "treasury lost funds");
    });

    it("returns true on success", async function(){
        assert.equal(
            await treasury.fundMainController.call(1, {from: dummyMainController})
            , true, "Should return true on success"
        );
    });

    it("logs error if funds requested is too large", async function(){
        await txTester()
            .watch([treasury.address, dummyMainController])
            .do(() => treasury.fundMainController(100000, {from: dummyMainController}))
            .stopWatching()
            .assertSuccess()
            .assertOneLog("NotEnoughFunds", {recipient: dummyMainController, value: 100000})
            .assertLostTxFee(dummyMainController)
            .assertDelta(treasury.address, 0);
    });

    it("returns false if funds requested is too large", async function(){
        assert.equal(
            await treasury.fundMainController.call(100000, {from: dummyMainController})
            , false, "Should return true on success"
        );
    });

    xit("logs error if funds cannot be transferred to recipient (eg, not payable)", async function(){
        // todo: create NotPayable contract and try to send to it.
    });
});