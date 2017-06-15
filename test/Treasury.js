var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var Ledger = TestUtil.Ledger;
var BigNumber = require("bignumber.js");

var EXPECT_INVALID_OPCODE = TestUtil.expectInvalidOpcode;

contract('Treasury', function(accounts){
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

    it("should accept funds", async function(){
        var amt = new BigNumber(12345);
        await TestUtil.transfer(accounts[0], treasury.address, amt);
        assert.strEqual(TestUtil.getBalance(treasury.address), amt, "Treasury got some wei");
    });

    it("fundMainController is only callable by main controller", async function(){
        await EXPECT_INVALID_OPCODE(treasury.fundMainController(1, {from: accounts[0]}));
        await EXPECT_INVALID_OPCODE(treasury.fundMainController(1, {from: accounts[1]}));
        await treasury.fundMainController(1, {from: dummyMainController});
    });

    it("transfers proper amount", async function(){
        var ledger = new Ledger([treasury.address, dummyMainController]);
        ledger.start();
        var result = await treasury.fundMainController(123, {from: dummyMainController});
        ledger.stop();
        var net = (new BigNumber(123)).minus(TestUtil.getTxFee(result.tx)); // subtract txfee
        assert.strEqual(ledger.getDelta(treasury.address), -123, "Treasury drained 123");
        assert.strEqual(ledger.getDelta(dummyMainController), net, "MainController netted 123");
    });

});