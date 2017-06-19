var Registry = artifacts.require("Registry");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var EXPECT_ONE_LOG = TestUtil.expectOneLog;
var BigNumber = require("bignumber.js");

var initialPrize = new BigNumber(.5e18);       // half an eth
var bidPrice     = new BigNumber(.01e18);      // tenth of eth
var bidTimeS     = new BigNumber(600);         // 10 minutes
var bidFeePct    = new BigNumber(60);
var auctionTimeS = new BigNumber(60*60*12);    // 12 hours

contract('PennyAuctionFactory', function(accounts){
    var paf;
    var dummyTreasury;
    var dummyPac;
    var registry;

    before("Set up registry and create PAF", async function(){
        dummyTreasury = accounts[1];
        dummyPac = accounts[2];
        registry = await Registry.new();
        await registry.register("TREASURY", accounts[1]);
        await registry.register("PENNY_AUCTION_CONTROLLER", accounts[2]);
        paf = await PennyAuctionFactory.new(registry.address);
    });

    it("should point to the dummyPac and dummyTreasury", async function(){
        assert.equal(await paf.getPennyAuctionController(), dummyPac, "PAF points to correct PAC");
        assert.equal(await paf.getTreasury(), dummyTreasury, "PAF points to correct Treasury");
    });

    it("should correnctly instantiate an auction", async function(){
        // create a new registry with dummy treasury and pac
        var res = await paf.createAuction(
            initialPrize, 
            bidPrice,
            bidTimeS,
            bidFeePct,
            auctionTimeS,
            {from: dummyPac, gas: 2000000}
        );

        await EXPECT_ONE_LOG(res, "AuctionCreated", {
            addr: null,
            initialPrize: initialPrize,
            bidPrice: bidPrice,
            bidTimeS: bidTimeS,
            bidFeePct: bidFeePct,
            auctionTimeS: auctionTimeS
        });

        // ensure the state of the penny auction is correct
        var auction = PennyAuction.at(res.logs[0].args.addr);
        var state = await TestUtil.getContractState(auction);
        assert.equal(state.admin, dummyPac, "Admin is set to dummyPac");
        assert.equal(state.collector, dummyTreasury, "Treasury is set to dummyTreasury");
        assert.strEqual(state.initialPrize, initialPrize, "Correct initialPrize");
        assert.strEqual(state.bidPrice, bidPrice, "Correct bidPrice");
        assert.strEqual(state.bidTimeS, bidTimeS, "Correct bidTimeS");
        assert.strEqual(state.bidFeePct, bidFeePct, "Correct bidFeePct");
        assert.strEqual(state.auctionTimeS, auctionTimeS, "Correct auctionTimeS");
    });
});