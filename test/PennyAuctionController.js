var Registry = artifacts.require("Registry");
var Treasury = artifacts.require("Treasury");
var PennyAuctionController = artifacts.require("PennyAuctionController");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory");
var PennyAuction = artifacts.require("PennyAuction");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var Ledger = TestUtil.Ledger;
var BigNumber = require("bignumber.js");

var EXPECT_INVALID_OPCODE = TestUtil.expectInvalidOpcode;
var maxOpenAuctions = new BigNumber(2);
var maxInitialPrize = new BigNumber(.05e18);

var initialPrize = maxInitialPrize.div(2);
var bidPrice     = initialPrize.div(10);
var bidTimeS     = new BigNumber(600);          // 10 minutes
var bidFeePct    = new BigNumber(60);
var auctionTimeS = new BigNumber(60*60*12);     // 12 hours

contract('PennyAuctionController', function(accounts){
    var registry;
    var treasury;
    var pac;
    var paf;
    var dummyMainController = accounts[5];

    var bidder1 = accounts[0];
    var bidder2 = accounts[1];
    var bidderWinner = accounts[3];

    before("Set up registry and treasury", async function(){
        registry = await Registry.new();
        treasury = await Treasury.new(registry.address);
        pac = await PennyAuctionController.new(registry.address, maxOpenAuctions, maxInitialPrize);
        paf = await PennyAuctionFactory.new(registry.address);
        await registry.register("TREASURY", treasury.address);
        await registry.register("MAIN_CONTROLLER", dummyMainController);
        await registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
        await registry.register("PENNY_AUCTION_FACTORY", paf.address);
    });
    
    describe("Instantiation", function(){
        it("should be instantiated with proper settings", async function(){
            var state = await TestUtil.getContractState(pac);
            assert.strEqual(maxOpenAuctions, state.maxOpenAuctions, "maxOpenAuctions is correct");
            assert.strEqual(maxInitialPrize, state.maxInitialPrize, "maxInitialPrize is correct");
        });

        it("should point to the correct things", async function(){
            assert.equal(await pac.getPennyAuctionFactory(), paf.address, "PAC points to correct PAF");
            assert.equal(await pac.getMainController(), dummyMainController, "PAC points to correct MainController");
        });

        it("settings cannot be changed by randos", async function(){
            await EXPECT_INVALID_OPCODE(pac.setSettings(5, 10e18));
        });

        it("settings can be changed by MainController", async function(){
            var newMoa = new BigNumber(5);
            var newMip = new BigNumber(10e18);
            await pac.setSettings(newMoa, newMip, {from: dummyMainController});
            assert.strEqual(await pac.maxOpenAuctions(), newMoa);
            assert.strEqual(await pac.maxInitialPrize(), newMip);
            await pac.setSettings(maxOpenAuctions, maxInitialPrize, {from: dummyMainController});
        });
    });

    describe("Controls on starting an auction", function(){
        it("it should not start a new auction from randos", async function(){
            await EXPECT_INVALID_OPCODE(
                pac.startNewAuction(
                    initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                    {from: accounts[3], value: initialPrize}
                )
            );
        });

        it("should not start without passing correct value", async function(){
            await EXPECT_INVALID_OPCODE(
                pac.startNewAuction(
                    initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                    {from: dummyMainController, value: 1}
                )
            );
            await EXPECT_INVALID_OPCODE(
                pac.startNewAuction(
                    initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                    {from: dummyMainController, value: initialPrize.minus(1)}
                )
            ); 
        });

        it("should not start an auction whose prize is too large", async function(){
            await EXPECT_INVALID_OPCODE(
                pac.startNewAuction(
                    initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                    {from: dummyMainController, value: maxInitialPrize.plus(1)}
                )
            );
        });
    });

    describe("Starting an auction", async function(){
        var ledger = new Ledger([dummyMainController]);
        var result;
        var pafWatcher;
        var pacWatcher;

        it("startNewAuction call should work", async function(){
            pafWatcher = paf.allEvents();
            pacWatcher = pac.allEvents();
            ledger.start();
            result = await pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                {from: dummyMainController, value: initialPrize}
            );
            ledger.stop();
        });

        it("should have transferred funds from MainController", async function(){
            // make sure the correct funds were transferred
            var assumedLoss = initialPrize.add(TestUtil.getTxFee(result.tx)).mul(-1);
            assert.strEqual(ledger.getDelta(dummyMainController), assumedLoss, "It costed MainController some wei.");
        });

        it("should have cause PAF to trigger an AuctionCreated event", function(){
            // make sure the PAF event happened
            assert.equal(pafWatcher.get().length, 1, "PAF had one event");
            var pafEvent = pafWatcher.get()[0];
            assert.equal(pafEvent.event, "AuctionCreated", "PAF AuctionCreated event happened");
            assert.strEqual(pafEvent.args.initialPrize, initialPrize, "PAF correct initialPrize");
            assert.strEqual(pafEvent.args.bidPrice, bidPrice, "PAF correct bidPrice");
            assert.strEqual(pafEvent.args.bidTimeS, bidTimeS, "PAF correct bidTimeS");
            assert.strEqual(pafEvent.args.bidFeePct, bidFeePct, "PAF correct bidFeePct");
            assert.strEqual(pafEvent.args.auctionTimeS, auctionTimeS, "PAF correct auctionTimeS");
        });

        it("pac should have triggered an AuctionStarted event", function(){
            // mke sure the PAC event happened
            assert.equal(pacWatcher.get().length, 1, "PAC had an event");
            var pacEvent = pacWatcher.get()[0];
            var pafEvent = pafWatcher.get()[0];
            assert.equal(pacEvent.event, "AuctionStarted", "PAC AuctionStarted event happened");
            // make sure it has the correct stuff in it
            assert.equal(pacEvent.args.addr, pafEvent.args.addr, "PennyAuction addresses are equal");
            assert.strEqual(pacEvent.args.initialPrize, initialPrize, "Correct prize logged");
            assert.strEqual(pacEvent.args.bidPrice, bidPrice, "Correct bidPrice logged");
            assert.strEqual(pacEvent.args.bidTimeS, bidTimeS, "Correct bidTimeS logged");
            assert.strEqual(pacEvent.args.bidFeePct, bidFeePct, "Correct bidFeePct logged");
            assert.strEqual(pacEvent.args.auctionTimeS, auctionTimeS, "Correct auctionTimeS logged");
        });

        it("correct address in openAuctions array", async function(){
            var pacEventAddr = pacWatcher.get()[0].args.addr;
            var addr = await pac.openAuctions(0);
            assert.equal(addr, pacEventAddr, "matches address of openAuction");
        });
    });

    describe("The open auction works", function(){
        var openAuction;

        before("there is an openAuction", async function(){
            openAuction = PennyAuction.at(await pac.openAuctions(0));
            assert.equal(await openAuction.state(), 1, "Auction is opened");
        });

        it("the openAuction should have the correct settings, and be started", async function(){
            var state = await TestUtil.getContractState(openAuction);

            assert.strEqual(state.state, 1, "State is 1 (opened)");
            assert.equal(state.admin, pac.address, "PAC is the admin");
            assert.equal(state.collector, treasury.address, "Treasury is the collector");
            assert.strEqual(state.initialPrize, initialPrize, "Correct initialPrize");
            assert.strEqual(state.bidPrice, bidPrice, "Correct bidPrice")
            assert.strEqual(state.bidTimeS, bidTimeS, "Correct bidTimeS");
            assert.strEqual(state.bidFeePct, bidFeePct, "Correct bidFeePct");
            assert.strEqual(state.auctionTimeS, auctionTimeS, "Correct auctionTimeS");
        });

        it("openAuction accepts bids...", async function(){
            await openAuction.sendTransaction({value: bidPrice, from: bidder1});
            await openAuction.sendTransaction({value: bidPrice, from: bidder2});
            await openAuction.sendTransaction({value: bidPrice, from: bidder1});
            var state = await TestUtil.getContractState(openAuction);
            assert.strEqual(state.numBids, 3, "Three bids");
            assert.strEqual(state.fees, bidPrice.mul(bidFeePct.div(100)).mul(3), "Three bid fees");
            assert.strEqual(state.currentWinner, bidder1, "bidder1 is current winner");
        });
    });

    describe("checkOpenAuctions", function(){
        var openAuction;

        before("there is an openAuction", async function(){
            openAuction = PennyAuction.at(await pac.openAuctions(0));
            assert.equal(await openAuction.state(), 1, "Auction is opened");
        });

        it("getNumActionableAuctions returns 0", async function(){
            var num = await pac.getNumActionableAuctions({from: dummyMainController});
            assert.strEqual(num, 0);
        });

        it("getNumOpenAuctions returns 1, getNumClosedAuctions returns 0", async function(){
            var numOpened = await pac.getNumOpenAuctions();
            var numClosed = await pac.getNumClosedAuctions();
            assert.strEqual(numOpened, 1);
            assert.strEqual(numClosed, 0);
        });

        it("getAvailableFees returns proper amount", async function(){
            var num = await pac.getAvailableFees({from: dummyMainController});
            assert.strEqual(num, await openAuction.fees());
        });

        it("only MainController can call checkOpenAuctions", async function(){
            await EXPECT_INVALID_OPCODE(pac.checkOpenAuctions({from: bidder1}));
        });

        describe("When calling checkOpenAuctions", function(){
            var callResult;
            var result;
            var ledger;
            var fees;

            before("do call", async function(){
                ledger = new Ledger([treasury.address, openAuction.address, dummyMainController]);    
                fees = await openAuction.fees();
                callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
                ledger.start();
                result = await pac.checkOpenAuctions({from: dummyMainController});
                ledger.stop();
            })
            
            // this happend in before
            it("Gets called from MainController", function(){});

            it("Gets the correct return value (0 closed, X fees redeemed)", function(){
                assert.strEqual(callResult[0], 0);
                assert.strEqual(callResult[1], fees);
            });

            it("It transferred fees to Treasury", async function(){
                var txFee = TestUtil.getTxFee(result.tx);
                assert.strEqual(ledger.getDelta(treasury.address), fees, "Treasury got transferred fees");
                assert.strEqual(ledger.getDelta(openAuction.address), fees.mul(-1), "Auction lost fees");
                assert.strEqual(ledger.getDelta(dummyMainController), txFee.mul(-1), "dummyMainController lost only gas");
            });

            it("Incremented totalFees", async function(){
                assert.strEqual(await pac.totalFees(), fees, "Correct total fees");
            });

            it("Open Auction's balance is now that of the prize", async function(){
                // make sure auction still has correct balance
                var state = await TestUtil.getContractState(openAuction);
                assert.strEqual(state.prize, TestUtil.getBalance(openAuction.address), "Auction has correct balance");
                assert.strEqual(state.fees, 0, "No fees");
            });
                        
            it("Open Auction is still in openAuctions array", async function(){
                assert.equal(await pac.openAuctions(0), openAuction.address, "Auction is opened");
            });

            it("getAvailableFees is 0", async function(){
                assert.strEqual(await pac.getAvailableFees({from: dummyMainController}), 0);
            });
        });
    });

    describe("Finishing openAuction...", function(){
        var openAuction;

        before("there is an openAuction", async function(){
            openAuction = PennyAuction.at(await pac.openAuctions(0));
            assert.equal(await openAuction.state(), 1, "Auction is opened");
        });

        it("openAuction accepts more bids, fast forwards, and is now closeable", async function(){
            await openAuction.sendTransaction({value: bidPrice, from: bidderWinner});
            var numBids = await openAuction.numBids();
            TestUtil.fastForward(auctionTimeS.add(bidTimeS.mul(numBids)).add(1).toNumber());
            assert.equal(await openAuction.isCloseable(), true, "No time left.");
        });

        it("getNumActionableAuctions returns 1", async function(){
            var num = await pac.getNumActionableAuctions({from: dummyMainController});
            assert.strEqual(num, 1);
        });
    })

    describe("checkOpenAuctions when auction is done", function(){
        var result;
        var callResult;
        var openAuction;
        var prevState;
        var ledger;
        var fees;
        var pacWatcher;
        var paWatcher;

        before("get open auction, call checkOpenAuctions", async function(){
            prevState = await TestUtil.getContractState(pac);
            openAuction = PennyAuction.at(await pac.openAuctions(0));
            assert.equal(await openAuction.state(), 1, "Auction is opened");

            callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
            ledger = new Ledger([treasury.address, openAuction.address, dummyMainController, bidderWinner]);    
            fees = await openAuction.fees();
            pacWatcher = pac.allEvents();
            paWatcher = openAuction.allEvents();

            ledger.start();
            result = await pac.checkOpenAuctions({from: dummyMainController});
            ledger.stop();
        });

        it("Got correct return values (1 closed, X fees redeemed)", function(){
            assert.strEqual(callResult[0], 1, "one is closed"); 
            assert.strEqual(callResult[1], fees, "fees received");
        });

        it("Logged that the auction was closed", async function(){
            var logs = pacWatcher.get();
            assert.equal(logs.length, 1, "Exactly one log");
            assert.equal(logs[0].args.addr, openAuction.address, "Correct address");
            assert.equal(logs[0].args.winner, await openAuction.currentWinner(), "Correct winner");
            assert.strEqual(logs[0].args.prize, await openAuction.prize(), "Correct prize");
            assert.strEqual(logs[0].args.numBids, await openAuction.numBids(), "Correct numBids");
        });

        it("It transferred fees to Treasury", async function(){
            var txFee = TestUtil.getTxFee(result.tx);
            assert.strEqual(ledger.getDelta(treasury.address), fees, "Treasury got transferred fees");
            assert.strEqual(ledger.getDelta(dummyMainController), txFee.mul(-1), "dummyMainController lost only gas");
        });

        it("Incremented total fees", async function(){
            var expectedTotalFees = prevState.totalFees.plus(fees);
            assert.strEqual(await pac.totalFees(), expectedTotalFees);
        });

        it("Closed and redeemed the openAuction", async function(){
            assert.strEqual(await openAuction.state(), 3, "Auction state is redeemed");
            var logs = paWatcher.get();
            assert(logs.length, 2, "Two logs (closed, redeemed)");
            var closedLog = logs[0];
            var redeemedLog = logs[1];
            assert.equal(closedLog.event, "Closed");
            assert.equal(redeemedLog.event, "RedeemAttempted");
            assert.equal(redeemedLog.args.redeemer, pac.address, "Redeemer was PAC");
            assert.equal(redeemedLog.args.successful, true);
        });

        it("Redeemed prize for winner", async function(){
            var prize = await openAuction.prize();
            assert.strEqual(ledger.getDelta(bidderWinner), prize, "Winner got the prize");
        });

        it("getNumOpenAuctions returns 0, getNumClosedAuctions returns 1", async function(){
            var numOpened = await pac.getNumOpenAuctions();
            var numClosed = await pac.getNumClosedAuctions();
            assert.strEqual(numOpened, 0);
            assert.strEqual(numClosed, 1);
        });

        it("Removed openAuction from openAuctions", async function(){
            await EXPECT_INVALID_OPCODE(pac.openAuctions(0));
        });

        it("Added openAuction to closedAuctions", async function(){
            var closedAddr = await pac.closedAuctions(0);
            assert.equal(closedAddr, openAuction.address);
        });

        it("Incremented totalBids and totalPrizes", async function(){
            var expectedTotalBids = prevState.totalBids.plus(await openAuction.numBids());
            var expectedTotalPrizes = prevState.totalPrizes.plus(await openAuction.prize());
            assert.strEqual(await pac.totalBids(), expectedTotalBids, "Correct totalBids");
            assert.strEqual(await pac.totalPrizes(), expectedTotalPrizes, "Correct totalBids");
        });
    });

    describe("more checkOpenAuctions tests", async function(){
        var pac;
        var maxOpenAuctions = new BigNumber(5);
        var auction1;
        var auction2;
        var auction3;
        var auction4;
        var auction5;
        
        before("create new pac", async function(){
            pac = await PennyAuctionController.new(registry.address, maxOpenAuctions, maxInitialPrize);
            registry.register("PENNY_AUCTION_CONTROLLER", pac.address);
        });
        it("Honors maxOpenAuctions", async function(){
            // note the auctionTimeS order... 1, 4, 2, 3, 5
            await pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                {from: dummyMainController, value: initialPrize}
            );
            await pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(120000), 
                {from: dummyMainController, value: initialPrize}
            );
            await pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(180000), 
                {from: dummyMainController, value: initialPrize}
            );
            await pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(60000), 
                {from: dummyMainController, value: initialPrize}
            );
            await pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS.plus(240000), 
                {from: dummyMainController, value: initialPrize}
            );
            await EXPECT_INVALID_OPCODE(pac.startNewAuction(
                initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS, 
                {from: dummyMainController, value: initialPrize}
            ));

            assert.strEqual(await pac.getNumOpenAuctions(), 5, "5 open auctions");
            auction1 = PennyAuction.at(await pac.openAuctions(0));
            auction2 = PennyAuction.at(await pac.openAuctions(1));
            auction3 = PennyAuction.at(await pac.openAuctions(2));
            auction4 = PennyAuction.at(await pac.openAuctions(3));
            auction5 = PennyAuction.at(await pac.openAuctions(4));
        });
        it("has correct array values", async function(){
            assert.equal(auction1.address, await pac.openAuctions(0), "auction1 is open[0]");
            assert.equal(auction2.address, await pac.openAuctions(1), "auction2 is open[1]");
            assert.equal(auction3.address, await pac.openAuctions(2), "auction3 is open[2]");
            assert.equal(auction4.address, await pac.openAuctions(3), "auction4 is open[3]");
            assert.equal(auction5.address, await pac.openAuctions(4), "auction5 is open[4]");
        });

        describe("After closing the first auction", function(){
            before("bid and close first auction", async function(){
                await auction1.sendTransaction({from: bidder1, value: bidPrice});
                await auction1.sendTransaction({from: bidder2, value: bidPrice});
                await auction1.sendTransaction({from: bidder1, value: bidPrice});
                await TestUtil.fastForward((await auction1.getTimeRemaining()).plus(1).toNumber());
                await auction1.close();
            });

            it("redeems prize and fees for an auction that is already closed.", async function(){
                var expectedFees = await auction1.fees();
                var callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
                var numClosed = callResult[0];
                var numFees = callResult[1];
                assert.strEqual(numClosed, 1, "Expected 1 auction to be closed");
                assert.strEqual(numFees, expectedFees, "Expected fees to be redeemed for 3 bids")

                await pac.checkOpenAuctions({from: dummyMainController});
            });

            it("redeemed the auction", async function(){
                assert.strEqual(await auction1.state(), 3, "Auction is redeemed");
            });

            it("has proper number of activeAuctions and closedAuctions", async function(){
                assert.strEqual(await pac.getNumOpenAuctions(), 4);
                assert.strEqual(await pac.getNumClosedAuctions(), 1);
            });

            it("has correct values in the arrays", async function(){
                assert.equal(auction1.address, await pac.closedAuctions(0), "auction1 is closed[0]");

                assert.equal(auction2.address, await pac.openAuctions(0), "auction2 is open[0]");
                assert.equal(auction3.address, await pac.openAuctions(1), "auction3 is open[1]");
                assert.equal(auction4.address, await pac.openAuctions(2), "auction4 is open[2]");
                assert.equal(auction5.address, await pac.openAuctions(3), "auction5 is open[3]");
            });
        });

        describe("After closing and redeeming the fourth auction", async function(){
            before("bid, close, redeem auction4", async function(){
                assert.strEqual(await pac.getNumOpenAuctions(), 4);
                await auction4.sendTransaction({from: bidder1, value: bidPrice});
                await auction4.sendTransaction({from: bidder2, value: bidPrice});
                await auction4.sendTransaction({from: bidder1, value: bidPrice});
                await TestUtil.fastForward((await auction4.getTimeRemaining()).plus(1).toNumber());
                await auction4.close();
                await auction4.redeem({from: bidder1});
                assert.strEqual(await auction4.state(), 3, "auction4 is redeemed");
            });

            it("Redeems fees for fourth auction", async function(){
                var expectedFees = await auction4.fees();
                var callResult = await pac.checkOpenAuctions.call({from: dummyMainController});
                var numClosed = callResult[0];
                var numFees = callResult[1];

                assert.strEqual(numClosed, 1, "Expected one auction to be closed");
                assert.strEqual(numFees, expectedFees, "Expected fees to be redeemed for 3 bids");
                await pac.checkOpenAuctions({from: dummyMainController});
            });

            it("has proper number of activeAuctions and closedAuctions", async function(){
                assert.strEqual(await pac.getNumOpenAuctions(), 3, "3 auctions open");
                assert.strEqual(await pac.getNumClosedAuctions(), 2, "2 auctions closed");
            });

            it("shifted array of active auctions", async function(){
                assert.equal(auction1.address, await pac.closedAuctions(0), "auction1 is closed[0]");
                assert.equal(auction4.address, await pac.closedAuctions(1), "auction4 is closed[1]");

                assert.equal(auction2.address, await pac.openAuctions(0), "auction2 is open[0]");
                assert.equal(auction3.address, await pac.openAuctions(1), "auction3 is open[1]");
                assert.equal(auction5.address, await pac.openAuctions(2), "auction5 is open[2]");
            });
        });

    });

});