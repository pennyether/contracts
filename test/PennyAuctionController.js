var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");
var PennyAuctionController = artifacts.require("PennyAuctionController");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;

const INITIAL_PRIZE  = new BigNumber(.05e18);
const BID_PRICE      = new BigNumber(.001e18);
const BID_TIME_S     = new BigNumber(600);
const BID_FEE_PCT    = new BigNumber(60);
const AUCTION_TIME_S = new BigNumber(60*60*12);

const MAX_OPEN_AUCTIONS = 2;
const MAX_INITIAL_PRIZE = INITIAL_PRIZE;

const accounts = web3.eth.accounts;

describe('PennyAuctionController', function(){
    var registry;
    var treasury;
    var pac;
    var paf;
    var dummyMainController = accounts[5];

    const bidder1 = accounts[1];
    const bidder2 = accounts[2];
    const auctionWinner = accounts[3];
    const notMainController = accounts[4];

    before("Set up registry and treasury", async function(){
        registry = await Registry.new();
        treasury = await Treasury.new(registry.address);
        pac = await PennyAuctionController.new(registry.address, MAX_OPEN_AUCTIONS, MAX_INITIAL_PRIZE);
        paf = await PennyAuctionFactory.new(registry.address);
        await registry.register("TREASURY", treasury.address);
        await registry.register("MAIN_CONTROLLER", dummyMainController);
        await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
        await registry.register("PENNY_AUCTION_FACTORY", paf.address);
        const addresses = {
            registry: registry.address,
            treasury: treasury.address,
            pac: pac.address,
            paf: paf.address,
            dummyMainController: dummyMainController,
            auctionWinner: auctionWinner
        };
        createDefaultTxTester().plugins.nameAddresses(addresses);
        console.log("Addresses:", addresses);
    });

    it("should be instantiated with proper settings", async function(){
        return createDefaultTxTester()
            .assertStateAsString(pac, "maxOpenAuctions", MAX_OPEN_AUCTIONS)
            .assertStateAsString(pac, "maxInitialPrize", MAX_INITIAL_PRIZE)
            .assertStateAsString(pac, "getMainController", dummyMainController)
            .start();
    });
    
    describe(".setSettings()", function(){
        it("cannot be changed by randos", async function(){
            return createDefaultTxTester()
                .doTx(() => pac.setSettings(5, 10e18, {from: notMainController}))
                .assertInvalidOpCode()
                .start();
        });
        it("can be called by MainController", async function(){
            const newMoa = new BigNumber(5);
            const newMip = new BigNumber(10e18);
            await createDefaultTxTester()
                .doTx(() => pac.setSettings(newMoa, newMip, {from: dummyMainController}))
                .assertStateAsString(pac, "maxOpenAuctions", newMoa)
                .assertStateAsString(pac, "maxInitialPrize", newMip)
                .start();
            await pac.setSettings(MAX_OPEN_AUCTIONS, MAX_INITIAL_PRIZE, {from: dummyMainController});
        });
    });

    describe(".startNewAuction()", function(){
        it("it should not start a new auction from randos", async function(){
            return createDefaultTxTester()
                .doTx(() => pac.startNewAuction(
                    INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S, 
                    {from: accounts[3], value: INITIAL_PRIZE}
                ))
                .assertInvalidOpCode()
                .start();
        });
        it("it should return false and refund if wrong amount sent", async function(){
            // do call, have ledger watch
            await createDefaultTxTester()
                .startLedger([dummyMainController, treasury])
                .doTx(() => pac.startNewAuction(
                    INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S,
                    {from: dummyMainController, value: INITIAL_PRIZE.plus(1)}
                ))
                .stopLedger()
                .assertOnlyErrorLog("Value must equal initialPrize")
                .assertLostTxFee(dummyMainController)
                .assertNoDelta(treasury.address)
                .start();

            // make sure call returns correctly as well
            var res = await pac.startNewAuction.call(
                INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S,
                {from: dummyMainController, value: INITIAL_PRIZE.plus(1)}
            );
            assert.strEqual(res[0], false, "Returns false");
            console.log("✓ .call returns false");
        });
        it("returns false, refunds, and errors if too many auctions open", async function(){
            console.log("setting maxOpenAuctions to 0...");
            await pac.setSettings(0, MAX_INITIAL_PRIZE, {from: dummyMainController});
            
            await createDefaultTxTester()
                .startLedger([dummyMainController, treasury])
                .doTx(() => pac.startNewAuction(
                    INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S, 
                    {from: dummyMainController, value: INITIAL_PRIZE}
                ))
                .stopLedger()
                .assertOnlyErrorLog("Too many auctions open")
                .assertLostTxFee(dummyMainController)
                .assertNoDelta(treasury)
                .start();
            
            // make sure call returns correctly as well
            var res = await pac.startNewAuction.call(
                INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S, 
                {from: dummyMainController, value: INITIAL_PRIZE}
            );
            console.log("✓ .call returns false");

            console.log(`setting maxOpenAuctions back to ${MAX_OPEN_AUCTIONS}...`);
            await pac.setSettings(MAX_OPEN_AUCTIONS, MAX_INITIAL_PRIZE, {from: dummyMainController});
        });
        it("correctly starts an auction", async function(){
            const res = await pac.startNewAuction.call(
                INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S, 
                {from: dummyMainController, value: INITIAL_PRIZE}
            );
            console.log("✓ .call returns true");

            const txRes = await createDefaultTxTester()
                .startLedger([dummyMainController, pac])
                .startWatching([paf])
                .doTx(() => pac.startNewAuction(
                    INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S, 
                    {from: dummyMainController, value: INITIAL_PRIZE}
                ))
                .stopLedger()
                .stopWatching()
                .assertDeltaMinusTxFee(dummyMainController, INITIAL_PRIZE.mul(-1))
                .assertNoDelta(pac)
                .assertOnlyLog("AuctionStarted", {
                    addr: null,
                    time: null,
                    initialPrize: INITIAL_PRIZE,
                    bidPrice: BID_PRICE,
                    bidTimeS: BID_TIME_S,
                    bidFeePct: BID_FEE_PCT,
                    auctionTimeS: AUCTION_TIME_S
                })
                .assertOnlyEvent(paf, "AuctionCreated", {
                    addr: null,
                    initialPrize: INITIAL_PRIZE,
                    bidPrice: BID_PRICE,
                    bidTimeS: BID_TIME_S,
                    auctionTimeS: AUCTION_TIME_S
                })
                .getTxResult()
                .start();

            const openAuction = PennyAuction.at(txRes.logs[0].args.addr);
            createDefaultTxTester().plugins.nameAddresses({openAuction: openAuction}, false);
            console.log(`Created auction @ ${openAuction.address}`);

            assert.strEqual(await pac.openAuctions(0), openAuction.address);
            console.log("✓ correct address in .openAuctions array");
        });
    });

    describe("The open auction works", async function(){
        const openAuction = PennyAuction.at(await pac.openAuctions(0));
        before("there is an openAuction", async function(){
            assert.strEqual(await openAuction.state(), 1, "Auction is OPENED");
        });

        it("openAuction is set up correctly", async function(){
            const openAuction = PennyAuction.at(await pac.openAuctions(0));
            await createDefaultTxTester()
                .assertStateAsString(openAuction, "admin", pac.address)
                .assertStateAsString(openAuction, "collector", treasury.address)
                .assertStateAsString(openAuction, "state", 1, "is OPENED")
                .assertStateAsString(openAuction, "prize", INITIAL_PRIZE)
                .assertStateAsString(openAuction, "bidPrice", BID_PRICE)
                .assertStateAsString(openAuction, "bidTimeS", BID_TIME_S)
                .assertStateAsString(openAuction, "bidFeePct", BID_FEE_PCT)
                .assertStateAsString(openAuction, "auctionTimeS", AUCTION_TIME_S)
                .assertBalance(openAuction, INITIAL_PRIZE)
                .start();
        });
        it("openAuction accepts bids...", async function(){
            await openAuction.sendTransaction({value: BID_PRICE, from: bidder1});
            await openAuction.sendTransaction({value: BID_PRICE, from: bidder2});
            await openAuction.sendTransaction({value: BID_PRICE, from: bidder1});
            const fees = BID_PRICE.mul(BID_FEE_PCT.div(100)).mul(3);
            await createDefaultTxTester()
                .assertStateAsString(openAuction, "numBids", 3)
                .assertStateAsString(openAuction, "fees", fees)
                .assertStateAsString(openAuction, "currentWinner", bidder1)
                .start()
        });
    });

    describe("Misc helper functions", async function(){
        const openAuction = PennyAuction.at(await pac.openAuctions(0));
        before("there is an openAuction", async function(){
            assert.strEqual(await openAuction.state(), 1, "Auction is OPENED");
        });

        it(".getNumActionableAuctions() returns 0", async function(){
            const num = await pac.getNumActionableAuctions();
            assert.strEqual(num, 0);
        });
        it(".getNumOpenAuctions() returns 1, .getNumClosedAuctions() returns 0", async function(){
            var numOpened = await pac.getNumOpenAuctions();
            var numClosed = await pac.getNumClosedAuctions();
            assert.strEqual(numOpened, 1);
            assert.strEqual(numClosed, 0);
        });
        it(".getAvailableFees() returns proper amount", async function(){
            var num = await pac.getAvailableFees();
            assert.strEqual(num, await openAuction.fees());
        });
    });

    describe(".checkOpenAuctions()", async function(){
        const openAuction = PennyAuction.at(await pac.openAuctions(0));
        before("there is an openAuction", async function(){
            assert.equal(await openAuction.state(), 1, "Auction is OPENED");
        });

        it("not callable by randos", async function(){
            await createDefaultTxTester()
                .doTx(() => pac.checkOpenAuctions({from: notMainController}))
                .assertInvalidOpCode()
                .start();
        });
        it("Gets the correct return value (0 closed, X fees redeemed)", async function(){
            const fees = await openAuction.fees();
            const callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
            assert.strEqual(callResult[0], 0);
            assert.strEqual(callResult[1], fees);
        });
        it("works correctly", async function(){
            const fees = await openAuction.fees();
            const prize = await openAuction.prize();
            return createDefaultTxTester()
                .startLedger([treasury, openAuction, dummyMainController])
                .doTx(() => pac.checkOpenAuctions({from: dummyMainController}))
                .stopLedger()
                .assertSuccess()
                .assertDelta(treasury, fees, "gained fees")
                .assertDelta(openAuction, fees.mul(-1), "lost fees")
                .assertLostTxFee(dummyMainController, "lost txFee")
                .assertStateAsString(pac, "totalFees", fees, "incremented totalFees")
                .assertStateAsString(openAuction, "fees", 0, "no fees left to redeem")
                .assertBalance(openAuction, prize, "equal to prize")
                .start()
        })           
        it("Open Auction is still in openAuctions array", async function(){
            assert.equal(await pac.openAuctions(0), openAuction.address, "Auction is opened");
        });
        it("getAvailableFees is 0", async function(){
            assert.strEqual(await pac.getAvailableFees(), 0);
        });
    });

    describe("Finishing openAuction...", async function(){
        const openAuction = PennyAuction.at(await pac.openAuctions(0));
        before("there is an openAuction", async function(){
            assert.equal(await openAuction.state(), 1, "Auction is opened");
        });

        it("openAuction accepts more bids, fast forwards, and is now closeable", async function(){
            const testUtil = createDefaultTxTester().plugins.testUtil;
            await openAuction.sendTransaction({value: BID_PRICE, from: auctionWinner});

            const numBids = await openAuction.numBids();
            const getTimeRemaining = await openAuction.getTimeRemaining();
            testUtil.fastForward((await openAuction.getTimeRemaining()).plus(1));
            assert.equal(await openAuction.isCloseable(), true, "should be closeable");
        });
    });

    describe("Misc helper functions", async function(){
        const openAuction = PennyAuction.at(await pac.openAuctions(0));
        before("openAuction has no time left", async function(){
            assert.strEqual((await openAuction.getTimeRemaining()), 0, "should have no time left");    
        });
        
        it(".getNumActionableAuctions() returns 1", async function(){
            const num = await pac.getNumActionableAuctions.call();
            assert.strEqual(num, 1);
        });
        it(".getNumOpenAuctions() returns 1, .getNumClosedAuctions() returns 0", async function(){
            var numOpened = await pac.getNumOpenAuctions();
            var numClosed = await pac.getNumClosedAuctions();
            assert.strEqual(numOpened, 1);
            assert.strEqual(numClosed, 0);
        });
        it(".getAvailableFees() returns proper amount", async function(){
            var num = await pac.getAvailableFees();
            assert.strEqual(num, await openAuction.fees());
        });
    });

    describe(".checkOpenAuctions() when auction is done", async function(){
        const openAuction = PennyAuction.at(await pac.openAuctions(0));
        before("openAuction has no time left", async function(){
            assert.strEqual((await openAuction.getTimeRemaining()), 0, "should have no time left");    
        });
        
        it(".checkOpenAuctions call returns (1 completed, X fees redeemed)", async function(){
            const fees = await openAuction.fees();
            const res = await pac.checkOpenAuctions.call({from: dummyMainController});
            console.log("result is:", res);
            assert.strEqual(res[0], 1, "one redeemed");
            assert.strEqual(res[1], fees, "fees redeemed");
        });
        it("works correctly", async function(){
            const prize = await openAuction.prize();
            const numBids = await openAuction.numBids();
            const fees = await openAuction.fees();
            const prevFees = await pac.totalFees();
            const prevPrizes = await pac.totalPrizes();
            await createDefaultTxTester()
                .startLedger([treasury, openAuction, dummyMainController, auctionWinner])
                .startWatching([openAuction])
                .doTx(() => pac.checkOpenAuctions({from: dummyMainController}))
                .stopLedger()
                .stopWatching()
                .assertSuccess()
                .assertDelta(treasury, fees, "got fees")
                .assertLostTxFee(dummyMainController)
                .assertDelta(auctionWinner, prize, "got prize")
                .assertOnlyLog("AuctionCompleted", {
                    addr: openAuction.address,
                    winner: auctionWinner,
                    prize: prize,
                    numBids, numBids
                })
                .assertEvent(openAuction, "Closed")
                .assertEvent(openAuction, "Redeemed", {
                    time: null,
                    redeemer: pac.address,
                    recipient: auctionWinner,
                    amount: prize
                })
                .assertStateAsString(pac, "totalFees", prevFees.plus(fees))
                .assertStateAsString(pac, "totalPrizes", prevPrizes.plus(prize))
                .assertStateAsString(pac, "getNumOpenAuctions", 0)
                .assertStateAsString(pac, "getNumClosedAuctions", 1)
                .assertStateAsString(pac, "getNumActionableAuctions", 0)
                .start();
        });
    })

    // describe("more checkOpenAuctions tests", async function(){
    //     var pac;
    //     var maxOpenAuctions = new BigNumber(5);
    //     var auction1;
    //     var auction2;
    //     var auction3;
    //     var auction4;
    //     var auction5;
        
    //     before("create new pac", async function(){
    //         pac = await PennyAuctionController.new(registry.address, maxOpenAuctions, maxInitialPrize);
    //         registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
    //     });
    //     it("Honors maxOpenAuctions", async function(){
    //         // note the auctionTimeS order... 1, 4, 2, 3, 5
    //         await pac.startNewAuction(
    //             initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
    //             {from: dummyMainController, value: initialPrize}
    //         );
    //         await pac.startNewAuction(
    //             initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(120000), 
    //             {from: dummyMainController, value: initialPrize}
    //         );
    //         await pac.startNewAuction(
    //             initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(180000), 
    //             {from: dummyMainController, value: initialPrize}
    //         );
    //         await pac.startNewAuction(
    //             initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(60000), 
    //             {from: dummyMainController, value: initialPrize}
    //         );
    //         await pac.startNewAuction(
    //             initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(240000), 
    //             {from: dummyMainController, value: initialPrize}
    //         );
    //         await EXPECT_ERROR_LOG(pac.startNewAuction(
    //             initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
    //             {from: dummyMainController, value: initialPrize}
    //         ), "Too many auctions open");

    //         assert.strEqual(await pac.getNumOpenAuctions(), 5, "5 open auctions");
    //         auction1 = PennyAuction.at(await pac.openAuctions(0));
    //         auction2 = PennyAuction.at(await pac.openAuctions(1));
    //         auction3 = PennyAuction.at(await pac.openAuctions(2));
    //         auction4 = PennyAuction.at(await pac.openAuctions(3));
    //         auction5 = PennyAuction.at(await pac.openAuctions(4));
    //     });
    //     it("has correct array values", async function(){
    //         assert.equal(auction1.address, await pac.openAuctions(0), "auction1 is open[0]");
    //         assert.equal(auction2.address, await pac.openAuctions(1), "auction2 is open[1]");
    //         assert.equal(auction3.address, await pac.openAuctions(2), "auction3 is open[2]");
    //         assert.equal(auction4.address, await pac.openAuctions(3), "auction4 is open[3]");
    //         assert.equal(auction5.address, await pac.openAuctions(4), "auction5 is open[4]");
    //     });

    //     describe("After closing the first auction", function(){
    //         before("bid and close first auction", async function(){
    //             await auction1.sendTransaction({from: bidder1, value: bidPrice});
    //             await auction1.sendTransaction({from: bidder2, value: bidPrice});
    //             await auction1.sendTransaction({from: bidder1, value: bidPrice});
    //             await TestUtil.fastForward((await auction1.getTimeRemaining()).plus(1).toNumber());
    //             await auction1.close();
    //         });

    //         it("redeems prize and fees for an auction that is already closed.", async function(){
    //             var expectedFees = await auction1.fees();
    //             var callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
    //             var numClosed = callResult[0];
    //             var numFees = callResult[1];
    //             assert.strEqual(numClosed, 1, "Expected 1 auction to be closed");
    //             assert.strEqual(numFees, expectedFees, "Expected fees to be redeemed for 3 bids")

    //             await pac.checkOpenAuctions({from: dummyMainController});
    //         });

    //         it("redeemed the auction", async function(){
    //             assert.strEqual(await auction1.state(), 3, "Auction is redeemed");
    //         });

    //         it("has proper number of activeAuctions and closedAuctions", async function(){
    //             assert.strEqual(await pac.getNumOpenAuctions(), 4);
    //             assert.strEqual(await pac.getNumClosedAuctions(), 1);
    //         });

    //         it("has correct values in the arrays", async function(){
    //             assert.equal(auction1.address, await pac.closedAuctions(0), "auction1 is closed[0]");

    //             assert.equal(auction2.address, await pac.openAuctions(0), "auction2 is open[0]");
    //             assert.equal(auction3.address, await pac.openAuctions(1), "auction3 is open[1]");
    //             assert.equal(auction4.address, await pac.openAuctions(2), "auction4 is open[2]");
    //             assert.equal(auction5.address, await pac.openAuctions(3), "auction5 is open[3]");
    //         });
    //     });

    //     describe("After closing and redeeming the fourth auction", async function(){
    //         before("bid, close, redeem auction4", async function(){
    //             assert.strEqual(await pac.getNumOpenAuctions(), 4);
    //             await auction4.sendTransaction({from: bidder1, value: bidPrice});
    //             await auction4.sendTransaction({from: bidder2, value: bidPrice});
    //             await auction4.sendTransaction({from: bidder1, value: bidPrice});
    //             await TestUtil.fastForward((await auction4.getTimeRemaining()).plus(1).toNumber());
    //             await auction4.close();
    //             await auction4.redeem({from: bidder1});
    //             assert.strEqual(await auction4.state(), 3, "auction4 is redeemed");
    //         });

    //         it("Redeems fees for fourth auction", async function(){
    //             var expectedFees = await auction4.fees();
    //             var callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
    //             var numClosed = callResult[0];
    //             var numFees = callResult[1];

    //             assert.strEqual(numClosed, 1, "Expected one auction to be closed");
    //             assert.strEqual(numFees, expectedFees, "Expected fees to be redeemed for 3 bids");
    //             await pac.checkOpenAuctions({from: dummyMainController});
    //         });

    //         it("has proper number of activeAuctions and closedAuctions", async function(){
    //             assert.strEqual(await pac.getNumOpenAuctions(), 3, "3 auctions open");
    //             assert.strEqual(await pac.getNumClosedAuctions(), 2, "2 auctions closed");
    //         });

    //         it("shifted array of active auctions", async function(){
    //             assert.equal(auction1.address, await pac.closedAuctions(0), "auction1 is closed[0]");
    //             assert.equal(auction4.address, await pac.closedAuctions(1), "auction4 is closed[1]");

    //             assert.equal(auction2.address, await pac.openAuctions(0), "auction2 is open[0]");
    //             assert.equal(auction3.address, await pac.openAuctions(1), "auction3 is open[1]");
    //             assert.equal(auction5.address, await pac.openAuctions(2), "auction5 is open[2]");
    //         });
    //     });

    // });

});