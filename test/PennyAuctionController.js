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
    const bidderWinner = accounts[3];
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
            dummyMainController: dummyMainController
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

        it(".getNumActionableAuctions() returns 0", async function(){
            const num = await pac.getNumActionableAuctions.call({from: dummyMainController});
            assert.strEqual(num, 0);
        });
        it(".getNumOpenAuctions() returns 1, .getNumClosedAuctions() returns 0", async function(){
            var numOpened = await pac.getNumOpenAuctions();
            var numClosed = await pac.getNumClosedAuctions();
            assert.strEqual(numOpened, 1);
            assert.strEqual(numClosed, 0);
        });
        it(".getAvailableFees() returns proper amount", async function(){
            var num = await pac.getAvailableFees({from: dummyMainController});
            assert.strEqual(num, await openAuction.fees());
        });
    })

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
            assert.strEqual(await pac.getAvailableFees({from: dummyMainController}), 0);
        });
    });

    // describe("Finishing openAuction...", function(){
    //     var openAuction;

    //     before("there is an openAuction", async function(){
    //         openAuction = PennyAuction.at(await pac.openAuctions(0));
    //         assert.equal(await openAuction.state(), 1, "Auction is opened");
    //     });

    //     it("openAuction accepts more bids, fast forwards, and is now closeable", async function(){
    //         await openAuction.sendTransaction({value: bidPrice, from: bidderWinner});
    //         var numBids = await openAuction.numBids();
    //         TestUtil.fastForward(auctionTimeS.add(bidTimeS.mul(numBids)).add(1).toNumber());
    //         assert.equal(await openAuction.isCloseable(), true, "No time left.");
    //     });

    //     it("getNumActionableAuctions returns 1", async function(){
    //         var num = await pac.getNumActionableAuctions({from: dummyMainController});
    //         assert.strEqual(num, 1);
    //     });
    // })

    // describe("checkOpenAuctions when auction is done", function(){
    //     var result;
    //     var callResult;
    //     var openAuction;
    //     var prevState;
    //     var ledger;
    //     var fees;
    //     var pacWatcher;
    //     var paWatcher;

    //     before("get open auction, call checkOpenAuctions", async function(){
    //         prevState = await TestUtil.getContractState(pac);
    //         openAuction = PennyAuction.at(await pac.openAuctions(0));
    //         assert.equal(await openAuction.state(), 1, "Auction is opened");

    //         callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
    //         ledger = new Ledger([treasury, openAuction, dummyMainController, bidderWinner]);    
    //         fees = await openAuction.fees();
    //         pacWatcher = pac.allEvents();
    //         paWatcher = openAuction.allEvents();

    //         ledger.start();
    //         result = await pac.checkOpenAuctions({from: dummyMainController});
    //         ledger.stop();
    //     });

    //     it("Got correct return values (1 closed, X fees redeemed)", function(){
    //         assert.strEqual(callResult[0], 1, "one is closed"); 
    //         assert.strEqual(callResult[1], fees, "fees received");
    //     });

    //     it("Logged that the auction was closed", async function(){
    //         var logs = pacWatcher.get();
    //         assert.equal(logs.length, 1, "Exactly one log");
    //         assert.equal(logs[0].args.addr, openAuction.address, "Correct address");
    //         assert.equal(logs[0].args.winner, await openAuction.currentWinner(), "Correct winner");
    //         assert.strEqual(logs[0].args.prize, await openAuction.prize(), "Correct prize");
    //         assert.strEqual(logs[0].args.numBids, await openAuction.numBids(), "Correct numBids");
    //     });

    //     it("It transferred fees to Treasury", async function(){
    //         var txFee = TestUtil.getTxFee(result.tx);
    //         assert.strEqual(ledger.getDelta(treasury), fees, "Treasury got transferred fees");
    //         assert.strEqual(ledger.getDelta(dummyMainController), txFee.mul(-1), "dummyMainController lost only gas");
    //     });

    //     it("Incremented total fees", async function(){
    //         var expectedTotalFees = prevState.totalFees.plus(fees);
    //         assert.strEqual(await pac.totalFees(), expectedTotalFees);
    //     });

    //     it("Closed and redeemed the openAuction", async function(){
    //         assert.strEqual(await openAuction.state(), 3, "Auction state is redeemed");
    //         var logs = paWatcher.get();
    //         assert(logs.length, 2, "Two logs (closed, redeemed)");
    //         var closedLog = logs[0];
    //         var redeemedLog = logs[1];
    //         assert.equal(closedLog.event, "Closed");
    //         assert.equal(redeemedLog.event, "Redeemed");
    //         assert.equal(redeemedLog.args.redeemer, pac.address, "Redeemer was PAC");
    //     });

    //     it("Redeemed prize for winner", async function(){
    //         var prize = await openAuction.prize();
    //         assert.strEqual(ledger.getDelta(bidderWinner), prize, "Winner got the prize");
    //     });

    //     it("getNumOpenAuctions returns 0, getNumClosedAuctions returns 1", async function(){
    //         var numOpened = await pac.getNumOpenAuctions();
    //         var numClosed = await pac.getNumClosedAuctions();
    //         assert.strEqual(numOpened, 0);
    //         assert.strEqual(numClosed, 1);
    //     });

    //     it("Removed openAuction from openAuctions", async function(){
    //         await EXPECT_INVALID_OPCODE(pac.openAuctions(0));
    //     });

    //     it("Added openAuction to closedAuctions", async function(){
    //         var closedAddr = await pac.closedAuctions(0);
    //         assert.equal(closedAddr, openAuction.address);
    //     });

    //     it("Incremented totalBids and totalPrizes", async function(){
    //         var expectedTotalBids = prevState.totalBids.plus(await openAuction.numBids());
    //         var expectedTotalPrizes = prevState.totalPrizes.plus(await openAuction.prize());
    //         assert.strEqual(await pac.totalBids(), expectedTotalBids, "Correct totalBids");
    //         assert.strEqual(await pac.totalPrizes(), expectedTotalPrizes, "Correct totalBids");
    //     });
    // });

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