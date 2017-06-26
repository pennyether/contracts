const PennyAuction = artifacts.require("./PennyAuction.sol");
const PennyAuctionBidder = artifacts.require("./helpers/PennyAuctionBidder.sol");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;

const INITIAL_PRIZE  = new BigNumber(.5e18);       // half an eth
const BID_PRICE      = new BigNumber(.01e18);      // tenth of eth
const BID_TIME_S     = new BigNumber(600);         // 10 minutes
const BID_FEE_PCT    = new BigNumber(60);
const AUCTION_TIME_S = new BigNumber(60*60*12);    // 12 hours

describe('PennyAuction', function() {
    var auction;
    const accounts = web3.eth.accounts;
    const admin = accounts[0];
    const collector = accounts[1];
    const bidder1 = accounts[2];
    const bidder2 = accounts[3];
    const bidder3 = accounts[4];
    const nonBidder = accounts[5];
    const addresses = {
        admin: admin,
        collector: collector,
        bidder1: bidder1,
        bidder2: bidder2,
        bidder3: bidder3,
        nonBidder: nonBidder
    };


    async function ensureNotOpenable() {
        return createDefaultTxTester()
            .doTx(() => auction.open({from: admin, value: initialPrize}))
            .assertInvalidOpCode()
            .start();
    }
    async function ensureNotBiddable(errorMsg) {
        return createDefaultTxTester()
            .startLedger([nonBidder, auction])
            .doTx(() => auction.sendTransaction({from: nonBidder, value: BID_PRICE}))
            .stopLedger()
            .assertSuccess()
            .assertErrorLog(errorMsg)
            .assertLostTxFee(nonBidder)
            .assertDelta(auction, 0)
            .start();
    }
    async function ensureNotCloseable(errorMsg) {
        assert.equal(await auction.isCloseable(), false, "Should not be closeable");
        var curState = await auction.state();
        return createDefaultTxTester()
            .doTx(() => auction.close())
            .assertSuccess()
            .assertErrorLog(errorMsg)
            .assertState(auction, "state", curState)
            .start();
    }
    async function ensureNotRedeemable(fromAccounts, errorMsg) {
        function tryAccount(account) {
            return createDefaultTxTester()
                .startLedger([auction, account])
                .doTx(() => auction.redeem(0, {from: account}))
                .stopLedger()
                .assertSuccess()
                .assertErrorLog(errorMsg)
                .assertLostTxFee(account, `${account} lost txFee`)
                .assertDelta(auction, 0, "auction lost no funds")
                .start();
        }
        for (var i = 0; i < fromAccounts.length; i++){
            await tryAccount(fromAccounts[i]);
        }
    }


    before("can be created", async function(){
        auction = await PennyAuction.new(admin, collector,
                            INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S);
        addresses.auction = auction;
        createDefaultTxTester().plugins.nameAddresses(addresses);
    });

    describe("After created, when pending:", function(){
        it("should have proper state", function(){
            return createDefaultTxTester()
                .assertStateAsString(auction, 'admin', admin)
                .assertStateAsString(auction, 'collector', collector)
                .assertStateAsString(auction, 'state', 0)
                .assertStateAsString(auction, 'initialPrize', INITIAL_PRIZE)
                .assertStateAsString(auction, 'bidPrice', BID_PRICE)
                .assertStateAsString(auction, 'bidTimeS', BID_TIME_S)
                .assertStateAsString(auction, 'bidFeePct', BID_FEE_PCT)
                .assertStateAsString(auction, 'auctionTimeS', AUCTION_TIME_S)
                .assertBalance(auction, 0)
                .start();
        });

        it("should not allow bidding", function(){
            return ensureNotBiddable("Cannot bid when auction is pending");
        });
    });

    describe(".open()...", function(){
        it("should not start from non-admin", function(){
            return createDefaultTxTester()
                .doTx(() => auction.open({from: bidder1, value: INITIAL_PRIZE}))
                .assertInvalidOpCode()
                .start();
        });

        it("should not start with wrong amount", function(){
            return createDefaultTxTester()
                .doTx(() => auction.open({from: admin, value: INITIAL_PRIZE.minus(1)}))
                .assertInvalidOpCode()
                .start();
        });

        describe("works correctly", async function(){
            createDefaultTxTester()
                .it("call succeeds")
                    .startLedger([admin, auction])
                    .doTx(() => auction.open({from: admin, value: INITIAL_PRIZE}))
                    .stopLedger()
                    .assertSuccess()
                .it("funds transferred successfully")
                    .assertDeltaMinusTxFee(admin, INITIAL_PRIZE.mul(-1))
                    .assertDelta(auction, INITIAL_PRIZE) 
                .it("'Started' event is correct", async function(){
                    const ctx = this;
                    const _ = ctx.plugins;
                    _.assertOneLog.call(ctx, "Started", {time: null})

                    const blocktime = (await _.getBlock.call(ctx)).timestamp;
                    const logTime = ctx.txRes.logs[0].args.time;
                    _.assertCloseTo.call(ctx,
                        logTime, blocktime, 1, "log time is within 1 second of blocktime");
                    ctx.blocktime = blocktime;
                })
                .it("has correct state", async function(){
                    var ctx = this;
                    const _ = ctx.plugins;
                    const blocktime = ctx.blocktime;
                    await _.assertStateAsString.call(ctx, auction, "state", 1,
                        "should be OPENED");
                    await _.assertStateAsString.call(ctx, auction, "currentWinner", collector,
                        "should be collector");
                    await _.assertStateCloseTo.call(ctx, auction, "timeOpened", blocktime, 1,
                        "should be close to blocktime");
                    await _.assertStateCloseTo.call(ctx,
                        auction, "timeClosed", AUCTION_TIME_S.add(blocktime), 1,
                        "should be blocktime plus AUCTION_TIME_S");
                })
                .start().swallow();
        });    
    });
    
    // describe("When Opened:", function(){
    //     before("ensure it is open", async function(){
    //         assert.strEqual(await auction.state(), 1);
    //     });

    //     it("should have a balance equal to the prize", async function(){
    //         assert.strEqual(TestUtil.getBalance(auction.address), initialPrize);
    //     });

    //     it("should not be able to be started again", async function(){
    //         await ensureNotOpenable();
    //     });

    //     it("should not allow prize to be redeemed", async function(){
    //         await ensureNotRedeemable([admin, await auction.currentWinner()], "Not callable in current state");
    //     });

    //     it("should not be closeable", async function(){
    //         await ensureNotCloseable("Time not yet expired");
    //     });

    //     it("should reject bids of the wrong amount", async function(){
    //         await txTester
    //             .watch([bidder1, auction])
    //             .do(() => auction.sendTransaction({from: bidder1, value: bidPrice.add(1)}))
    //             .assertErrorLog("Value must match bidPrice")
    //             .assertLostTxFee(bidder1)
    //             .assertDelta(auction, 0);

    //         await txTester
    //             .watch([bidder1, auction])
    //             .do(() => auction.sendTransaction({from: bidder1, value: bidPrice.minus(1)}))
    //             .assertErrorLog("Value must match bidPrice")
    //             .assertLostTxFee(bidder1)
    //             .assertDelta(auction, 0);
    //     });

    //     // this creates a new describe block "when bidding"
    //     doBidding(bidder1, "When Bidding:");

    //     describe("Redeeming fees:", function(){
    //         it("should not allow non-admins to redeem fees", async function(){
    //             await txTester
    //                 .watch([auction])
    //                 .do(() => auction.redeemFees({from: bidder1}))
    //                 .assertErrorLog("Only callable by admin")
    //                 .assertDelta(auction, 0)
    //         });

    //         it("should allow fees to be redeemed to collector, by admin", async function(){
    //             var expectedFees = await auction.fees();
    //             var prize = await auction.prize();
    //             await txTester
    //                 .watch([collector, auction, admin])
    //                 .do(() => auction.redeemFees({from: admin}))
    //                 .assertDelta(collector, expectedFees)
    //                 .assertDelta(auction, expectedFees.mul(-1))
    //                 .assertLostTxFee(admin)
    //                 .assertBalance(auction, prize);
    //         });
    //     });

    //     describe("More bidding:", function(){
    //         it("should allow more bidding...", async function(){
    //             await doBidding(bidder2);  
    //             await doBidding(bidder3);
    //         });

    //         it("should not be redeemable", async function(){
    //             await ensureNotRedeemable([admin, await auction.currentWinner()], "Not callable in current state");
    //         });

    //         it("should not be closeable", async function(){
    //             await ensureNotCloseable("Time not yet expired");
    //         });
    //     });

    //     describe("Past timeClosed:", function(){
    //         before("fastforward to make timeRemaining() 0", async function(){
    //             assert.equal((await auction.state()).toNumber(), 1, "Is currently opened");
    //             assert.isAbove((await auction.getTimeRemaining()).toNumber(), 0, "More than 0 timeRemaining");

    //             await TestUtil.fastForward((await auction.getTimeRemaining()).toNumber() + 1);
    //             assert.strEqual(await auction.getTimeRemaining(), 0, "Should be no time left");
    //         });

    //         it("should not accept bids", async function(){
    //             await ensureNotBiddable("Cannot bid after timeClosed");
    //         });

    //         it("should now be closeable", async function(){
    //             assert.equal(await auction.isCloseable(), true);
    //             assert.equal(await auction.isClosedOrRedeemed(), false);
    //         });

    //         it("should still not be able to be opened again", async function(){
    //             await ensureNotOpenable();
    //         });

    //         describe("Closing...", function(){
    //             it("should be closeable by anyone", async function(){
    //                 await auction.close({from: nonBidder});
    //                 assert.strEqual(await auction.state(), 2, "Auction should be closed.");
    //             });  
    //         })
    //     });
    // });


    // describe("When Closed:", function(){
    //     before("should be closed", async function(){
    //         assert.strEqual(await auction.state(), 2, "State is closed");
    //     });

    //     it("should have balance of prize + fees", async function(){
    //         var state = await TestUtil.getContractState(auction);
    //         var expectedBalance = state.prize.plus(state.fees);
    //         assert.strEqual(TestUtil.getBalance(auction.address), expectedBalance, "Correct final balance");
    //     });

    //     describe("Can't do anything but redeem:", function(){
    //         it("should not be abled to be closed again", async function(){
    //             await ensureNotCloseable("Not callable in current state");
    //         });

    //         it("should not be able to be started again", async function(){
    //             await ensureNotOpenable();
    //         });

    //         it("should not accept bids", async function(){
    //             await ensureNotBiddable("Cannot bid after timeClosed");
    //         });
    //     });

    //     describe("Redeeming:", function(){
    //         it("should not be redeemable by losers", async function(){
    //             await ensureNotRedeemable([nonBidder], "Only callable by admin or winner");
    //         });

    //         it("should be redeemable by winner", async function(){
    //             var prize = await auction.prize();
    //             var currentWinner = await auction.currentWinner();
    //             await txTester
    //                 .watch([currentWinner, auction, collector])
    //                 .do(() => auction.redeem(0, {from: currentWinner}))
    //                 .assertDeltaMinusTxFee(currentWinner, prize, "currentWinner gets prize minus txFee")
    //                 .assertDelta(auction, prize.mul(-1), "auction loses prize")
    //                 .assertDelta(collector, 0, "collector gets nothing")
    //                 .assertState(auction, "state", 3);
    //         });
    //     });
    // });

    // describe("When Redeemed:", function(){
    //     before("ensure it is redeemed", async function(){
    //         assert.strEqual(await auction.state(), 3, "State is redeemed");
    //     });

    //     it("should not be abled to be closed again", async function(){
    //         await ensureNotCloseable("Not callable in current state");
    //     });

    //     it("should not be able to be started again", async function(){
    //         await ensureNotOpenable();
    //     });

    //     it("should not accept bids", async function(){
    //         await ensureNotBiddable("Cannot bid after timeClosed");
    //     });

    //     it("should not be redeemable again", async function(){
    //         await ensureNotRedeemable([admin, await auction.currentWinner()], "Not callable in current state")
    //     });

    //     it("should allow remaining fees to be redeemed", async function(){
    //         var expectedFees = await auction.fees();
    //         assert(expectedFees > 0, "Expected fees > 0");

    //         await txTester
    //             .watch([auction, collector, admin])
    //             .do(() => auction.redeemFees({from: admin}))
    //             .assertDelta(collector, expectedFees)
    //             .assertDelta(auction, expectedFees.mul(-1))
    //             .assertLostTxFee(admin)
    //             .assertState(auction, "fees", 0);
    //     });

    //     it("should have zero balance", function(){
    //         assert.strEqual(TestUtil.getBalance(auction.address), "0", "Zero balance");
    //     });
    // });
});



// describe.only("Bidding via a Smart Contract", function(accounts){
//     var accounts = web3.eth.accounts;
//     var auction;
//     var bidderContract;

//     var admin = accounts[0];
//     var collector = accounts[1];
//     var bidderOwner = accounts[2];

//     before(function(){
//         return PennyAuction.new(admin, collector, initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS).then(a => {
//             auction = a;
//         }).then(() => {
//             // make a new bidder
//             return PennyAuctionBidder.new(auction.address, {from: bidderOwner});
//         }).then(b => {
//             bidderContract = b;
//         }).then(() => {
//             // give the bidder some money
//             return web3.eth.sendTransaction({from: bidderOwner, to: bidderContract.address, value: bidPrice.mul(5), gas: 3000000});
//         }).then(() => {
//             // start the auction
//             return auction.open({from: admin, value: initialPrize});
//         });
//     });

//     it("Smart Contract can bid on an auction", async function(){
//         assert.strEqual(await auction.state(), 1, "Auction is opened");
//         assert.isAbove(
//             (await TestUtil.getBalance(bidderContract)).toNumber(),
//             (await auction.bidPrice()).toNumber(),
//             "bidderContract is funded."
//         );
        
//         await txTester
//             .watch([auction, bidderContract, bidderOwner])
//             .do(() => bidderContract.doBid({from: bidderOwner}))
//             .assertDelta(auction, bidPrice)
//             .assertDelta(bidderContract, bidPrice.mul(-1))
//             .assertLostTxFee(bidderOwner);
//     });

//     it("Auction cannot be redeemed by admin, since it takes too much gas", async function(){
//         // fastforward and close auction
//         await TestUtil.fastForward((await auction.getTimeRemaining()).toNumber()+1);
//         await auction.close();

//         // confirm auction is closed and bidderContract is winner
//         assert.strEqual(await auction.state(), 2, "Auction is closed");
//         assert.equal(await auction.currentWinner(), bidderContract.address, "Bidder is current winner");

//         var curPrize = await auction.prize();
//         await txTester
//             .watch([auction, bidderContract, admin])
//             .do(() => auction.redeem({from: admin}))
//             .assertOneLog("RedeemFailed", {
//                 time: null,
//                 redeemer: admin,
//                 recipient: bidderContract.address,
//                 amount: curPrize
//             })
//             .assertLostTxFee(admin)
//             .assertDelta(auction, 0)
//             .assertDelta(bidderContract, 0)
//             .assertState(auction, "state", 2, "auction is still closed")
//             .assertState(auction, "prize", curPrize, "auction still has prize");
//     });

//     it("Smart Contract can redeem prize itself, even with expensive fallback function", async function(){
//         var prize = await auction.prize();
//         var watcher = await auction.allEvents();
//         await txTester
//             .watch([auction, bidderContract, bidderOwner])
//             .watchEvents(auction)
//             .do(() => bidderContract.doRedemption({from: bidderOwner}))
//             .assertEvent(auction, "Redeemed", {
//                 time: null,
//                 redeemer: bidderContract.address,
//                 recipient: bidderContract.address,
//                 amount: prize
//             })
//             .assertDelta(auction, prize.mul(-1))
//             .assertDelta(bidderContract, prize)
//             .assertLostTxFee(bidderOwner)
//             .assertState(auction, "state", 3);
//     });
// });
