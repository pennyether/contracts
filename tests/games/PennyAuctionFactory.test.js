var Registry = artifacts.require("Registry");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;

const INITIAL_PRIZE  = new BigNumber(.05e18);
const BID_PRICE      = new BigNumber(.001e18);
const BID_INCR    = new BigNumber(BID_PRICE.mul(-.1));
const BID_ADD_BLOCKS = new BigNumber(2);
const INITIAL_BLOCKS = new BigNumber(5);
const AUCTION_DEF = [INITIAL_PRIZE, BID_PRICE, BID_INCR, BID_ADD_BLOCKS, INITIAL_BLOCKS];

const accounts = web3.eth.accounts;
const owner = accounts[1];
const dummyPac = accounts[2];
const anon = accounts[3];

describe('PennyAuctionFactory', async function(){
    var registry;
    var paf;
    
    before("Can be created", async function(){
        const addresses = {
            owner: owner,
            dummyPac: dummyPac,
            anon: anon
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();

        await createDefaultTxTester()
            .doNewTx(PennyAuctionFactory, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                paf = txRes.contract;
                plugins.addAddresses({paf: paf.address});
            }).start();
        
        await createDefaultTxTester()
            .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", dummyPac, {from: owner}])
                .assertSuccess()
            .assertCallReturns([paf, "getPennyAuctionController"], dummyPac)
            .start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe(".createAuction()", async function(){
        it("should fail when called by anon", function(){
            const settings = {from: anon, gas: 2000000, value: INITIAL_PRIZE};
            const callParams = [paf, "createAuction"].concat(AUCTION_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when not passed any ETH", function(){
            const settings = {from: dummyPac, gas: 2000000}; 
            const callParams = [paf, "createAuction"].concat(AUCTION_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when passed too little ETH", function(){
            const settings = {from: dummyPac, gas: 2000000, value: 1}; 
            const callParams = [paf, "createAuction"].concat(AUCTION_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when passed too much ETH", function(){
            const settings = {from: dummyPac, gas: 2000000, value: INITIAL_PRIZE.plus(1)};
            const callParams = [paf, "createAuction"].concat(AUCTION_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when passed invalid auction param (negative prize)", function(){
            return createDefaultTxTester()
                .doTx([paf, "createAuction",
                            -1, 
                            BID_PRICE,
                            BID_INCR,
                            BID_ADD_BLOCKS,
                            INITIAL_BLOCKS,
                            {from: dummyPac, gas: 2000000, value: INITIAL_PRIZE}
                ])
                .assertInvalidOpCode()
                .start(); 
        })

        it("works when called by PennyAuctionController", async function(){
            const settings = {from: dummyPac, gas: 2000000, value: INITIAL_PRIZE};
            const callParams = [paf, "createAuction"].concat(AUCTION_DEF, settings);
            const txRes = await createDefaultTxTester()
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("AuctionCreated", {
                    time: null,
                    addr: null,
                    collector: dummyPac,
                    initialPrize: INITIAL_PRIZE,
                    bidPrice: BID_PRICE,
                    bidIncr: BID_INCR,
                    bidAddBlocks: BID_ADD_BLOCKS,
                    initialBlocks: INITIAL_BLOCKS
                })
                .getTxResult()
                .start();

            const auction = PennyAuction.at(txRes.logs[0].args.addr);
            const block = txRes.receipt.blockNumber;
            createDefaultTxTester().nameAddresses({auction: auction.address}, false).start();
            console.log(`Created auction @ ${auction.address}`);

            await createDefaultTxTester()
                .assertCallReturns([auction, "collector"], dummyPac)
                .assertCallReturns([auction, "initialPrize"], INITIAL_PRIZE)
                .assertCallReturns([auction, "bidPrice"], BID_PRICE)
                .assertCallReturns([auction, "bidIncr"], BID_INCR)
                .assertCallReturns([auction, "bidAddBlocks"], BID_ADD_BLOCKS)
                .assertCallReturns([auction, "blockEnded"], INITIAL_BLOCKS.plus(block))
                .start();
        });
    });
});