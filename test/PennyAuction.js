const PennyAuction = artifacts.require("./PennyAuction.sol");
const PennyAuctionBidder = artifacts.require("./helpers/PennyAuctionBidder.sol");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;
const testUtil = createDefaultTxTester().plugins.testUtil;

const INITIAL_PRIZE  = new BigNumber(.05e18);
const BID_PRICE      = new BigNumber(.001e18);
const BID_TIME_S     = new BigNumber(600);
const BID_FEE_PCT    = new BigNumber(60);
const AUCTION_TIME_S = new BigNumber(60*60*12);

const accounts = web3.eth.accounts;

describe('PennyAuction', function() {
    var auction;
    const admin = accounts[0];
    const collector = accounts[1];
    const bidder1 = accounts[2];
    const bidder2 = accounts[3];
    const bidder3 = accounts[4];
    const nonBidder = accounts[5];
    
    before("can be created", async function() {
        auction = await PennyAuction.new(admin, collector,
                            INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S);
        const addresses = {
            admin: admin,
            collector: collector,
            bidder1: bidder1,
            bidder2: bidder2,
            bidder3: bidder3,
            nonBidder: nonBidder,
            auction: auction.address
        };
        createDefaultTxTester().plugins.nameAddresses(addresses);
        console.log("addresses:", addresses);
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
            return ensureNotBiddableBy(nonBidder, "Cannot bid: Auction has not started.");
        });
        it("should not allow prize to be redeemed", async function(){
            await ensureNotRedeemableBy(admin, "Not callable in current state");
        });
        it("should not be closeable", async function(){
            await ensureNotCloseable("Not callable in current state");
        });
    });

    describe(".open()...", function(){
        before("should be pending", async function(){
            assert.strEqual(await auction.state(), 0, "auction is pending");
        });
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
                    _.assertOnlyLog.call(ctx, "Started", {time: null})

                    const blocktime = (await _.getBlock.call(ctx)).timestamp;
                    _.assertCloseTo.call(ctx,
                        ctx.txRes.logs[0].args.time, blocktime, 1, "log has correct time");
                })
                .it("has correct state", async function(){
                    var ctx = this;
                    const _ = ctx.plugins;
                    const blocktime = (await _.getBlock.call(ctx)).timestamp;
                    await _.assertStateAsString.call(ctx,
                        auction, "state", 1, "should be OPENED");
                    await _.assertStateAsString.call(ctx,
                        auction, "currentWinner", collector, "should be collector");
                    await _.assertStateCloseTo.call(ctx,
                        auction, "timeOpened", blocktime, 1, "should be close to blocktime");
                    await _.assertStateCloseTo.call(ctx,
                        auction, "timeClosed", AUCTION_TIME_S.add(blocktime), 1,
                        "should be blocktime plus AUCTION_TIME_S");
                })
                .start().swallow();
        });    
    });
    
    describe("When Opened:", function(){
        before("state should be OPENED", async function(){
            assert.strEqual(await auction.state(), 1);
        });
        it("should have a balance equal to the prize", async function(){
            assert.strEqual(await testUtil.getBalance(auction.address), INITIAL_PRIZE);
        });
        it("should not be able to be started again", async function(){
            await ensureNotOpenable();
        });
        it("should not allow prize to be redeemed", async function(){
            await ensureNotRedeemableBy(admin, "Not callable in current state");
        });
        it("should not be closeable", async function(){
            await ensureNotCloseable("Time not yet expired");
        });
    });

    describe("Bidding", async function(){
        before("state should be OPENED", async function(){
            assert.strEqual(await auction.state(), 1);
        });
        it("fails when passing too little", function() {
            return createDefaultTxTester()
                .print("Calling with 1 wei more than bid price")
                .startLedger([bidder1, auction])
                .doTx(() => auction.sendTransaction({from: bidder1, value: BID_PRICE.add(1)}))
                .stopLedger()
                .assertOnlyErrorLog("Cannot bid: Value sent must match bidPrice.")
                .assertLostTxFee(bidder1)
                .assertDelta(auction, 0)
                .start();
        });
        it("fails when passing too much", function(){
            return createDefaultTxTester()
                .print("Calling with 1 wei less than bid price")
                .startLedger([bidder1, auction])
                .doTx(() => auction.sendTransaction({from: bidder1, value: BID_PRICE.minus(1)}))
                .stopLedger()
                .assertOnlyErrorLog("Cannot bid: Value sent must match bidPrice.")
                .assertLostTxFee(bidder1)
                .assertDelta(auction, 0)
                .start(); 
        });
        it("works correctly", async function(){
            await ensureBiddableBy(bidder1);    
        });
        it("currentWinner cannot bid", async function(){
            await ensureNotBiddableBy(bidder1, "Cannot bid: You are already the current winner.");
        })
    });

    describe(".redeemFees()", async function(){
        before("should have fees to redeem", async function(){
            assert((await auction.fees()).gt(0));
        })
        it("should not allow non-admins to redeem fees", async function(){
            await createDefaultTxTester()
                .startLedger([auction])
                .doTx(() => auction.redeemFees({from: bidder1}))
                .stopLedger()
                .assertSuccess()
                .assertOnlyErrorLog("Only callable by admin")
                .assertNoDelta(auction)
                .start();
        });
        it("fees should be redeemable", async function(){
            await ensureFeesRedeemable();
        })
    });

    describe("More bidding:", function(){
        before("state should be OPENED", async function(){
            assert.strEqual(await auction.state(), 1);
        });
        it("should allow more bidding", async function(){
            await ensureBiddableBy(bidder2);  
        });
        it("should not be able to be started again", async function(){
            await ensureNotOpenable();
        });
        it("should not be redeemable", async function(){
            await ensureNotRedeemableBy(await auction.currentWinner(), "Not callable in current state");
        });
        it("should not be closeable", async function(){
            await ensureNotCloseable("Time not yet expired");
        });
    });

    describe("After all bidding:", function(){
        before("fastforward to make timeRemaining() 0", async function(){
            assert.equal((await auction.state()).toNumber(), 1, "Is currently opened");
            assert.isAbove((await auction.getTimeRemaining()).toNumber(), 0, "More than 0 timeRemaining");
            await testUtil.fastForward((await auction.getTimeRemaining()).plus(1));
            assert.strEqual(await auction.getTimeRemaining(), 0, "Should be no time left");
        });
        it("should now be closeable", async function(){
            assert.equal(await auction.isCloseable(), true);
            assert.equal(await auction.isClosed(), false);
        });
        it("should not be able to be opened again", async function(){
            await ensureNotOpenable();
        });
        it("should not accept bids", async function(){
            await ensureNotBiddableBy(nonBidder, "Cannot bid: Auction is already closed.");
        });
        it("should not be redeemable by currentWinner", async function(){
            await ensureNotRedeemableBy(await auction.currentWinner(), "Not callable in current state");
        });
    });

    describe(".close()", async function(){
        before(".isCloseable() should be true", async function(){
            assert.equal(await auction.isCloseable(), true);
        })
        it("works correctly", function(){
            createDefaultTxTester()
                .doTx(() => auction.close({from: nonBidder}))
                .assertSuccess()
                .assertStateAsString(auction, 'state', 2, "is CLOSED")
                .assertOnlyLog('Closed', {time:null, winner:null, prize:null, numBids:null})
                .start();
        });
    })

    describe("When Closed:", function(){
        before("state should be CLOSED", async function(){
            assert.strEqual(await auction.state(), 2);
        });
        it(".isClosed() should return true, .isRedeemed() false", async function(){
            assert.equal(await auction.isClosed(), true);
            assert.equal(await auction.isRedeemed(), false);
        })
        it("should have balance of prize + fees", async function(){
            var expectedBalance = (await auction.prize()).plus(await auction.fees());
            assert.strEqual(testUtil.getBalance(auction), expectedBalance, "Correct final balance");
        });
        it("should not be able to be started again", async function(){
            await ensureNotOpenable();
        });
        it("should not be abled to be closed again", async function(){
            await ensureNotCloseable("Not callable in current state");
        });
        it("should not accept bids", async function(){
            await ensureNotBiddableBy(nonBidder, "Cannot bid: Auction is already closed.");
        });
    });

    describe(".redeem():", function(){
        before("state should be CLOSED", async function(){
            assert.equal(await auction.isClosed(), true);
        });
        it("should not be redeemable by losers", async function(){
            await ensureNotRedeemableBy(nonBidder, "Only callable by admin or winner");
        });
        it("call should return (true, prize)", async function(){
            const prize = await auction.prize();
            const currentWinner = await auction.currentWinner();
            const res = await auction.redeem.call({from: currentWinner})
            assert.equal(res[0], true);
            assert.strEqual(res[1], prize);
        })
        it("should be redeemable by winner", async function(){
            const prize = await auction.prize();
            const currentWinner = await auction.currentWinner();
            await createDefaultTxTester()
                .startLedger([currentWinner, auction, collector])
                .doTx(() => auction.redeem({from: currentWinner}))
                .stopLedger()
                .assertSuccess()
                .assertOnlyLog("Redeemed", {
                    time: null,
                    redeemer: currentWinner,
                    recipient: currentWinner,
                    amount: prize
                })
                .assertDeltaMinusTxFee(currentWinner, prize, "got prize but lost txFee")
                .assertDelta(auction, prize.mul(-1), "lost prize")
                .assertDelta(collector, 0, "gets nothing")
                .assertStateAsString(auction, "state", 3, "is REDEEMED")
                .assertBalance(auction, await auction.fees(), "is only fees")
                .start();
        });
    });

    describe("When Redeemed:", function(){
        before("ensure it is redeemed", async function(){
            assert.strEqual(await auction.state(), 3, "State is redeemed");
        });
        it("should not be able to be started again", async function(){
            await ensureNotOpenable();
        });
        it("should not accept bids", async function(){
            await ensureNotBiddableBy(nonBidder, "Cannot bid: Auction is already closed.");
        });
        it("should not be abled to be closed again", async function(){
            await ensureNotCloseable("Not callable in current state");
        });
        it("should not be redeemable again", async function(){
            await ensureNotRedeemableBy(await auction.currentWinner(), "Not callable in current state")
        });
        it("should allow remaining fees to be redeemed", async function(){
            await ensureFeesRedeemable();
        });
        it("should now have zero balance", function(){
            assert.strEqual(testUtil.getBalance(auction), "0", "Zero balance");
        });
        it(".isRedeemed() should be true", async function(){
            assert.equal(await auction.isRedeemed(), true);
        })
    });


    async function ensureNotOpenable() {
        return createDefaultTxTester()
            .doTx(() => auction.open({from: admin, value: INITIAL_PRIZE}))
            .assertInvalidOpCode()
            .start();
    }
    async function ensureNotBiddableBy(bidder, errorMsg) {
        return createDefaultTxTester()
            .startLedger([bidder, auction])
            .doTx(() => auction.sendTransaction({from: bidder, value: BID_PRICE}))
            .stopLedger()
            .assertSuccess()
            .assertOnlyErrorLog(errorMsg)
            .assertLostTxFee(bidder)
            .assertNoDelta(auction, "bidder was refunded")
            .start();
    }
    async function ensureNotCloseable(errorMsg) {
        // test that call returns false
        assert.equal(await auction.close.call(), false);
        console.log("auction.close.call() returns false");

        var curState = await auction.state();
        return createDefaultTxTester()
            .assertStateAsString(auction, "isCloseable", false)
            .doTx(() => auction.close())
            .assertSuccess()
            .assertOnlyErrorLog(errorMsg)
            .assertStateAsString(auction, "state", curState)
            .start();
    }
    async function ensureNotRedeemableBy(account, errorMsg) {
        // test that call returns (false, 0)
        const res = await auction.redeem.call({from: account});
        assert.equal(res[0], false);
        assert.strEqual(res[1], 0);
        console.log("auction.redeem.call() returns (false, 0)");

        return createDefaultTxTester()
            .startLedger([auction, account])
            .doTx(() => auction.redeem({from: account}))
            .stopLedger()
            .assertSuccess()
            .assertOnlyErrorLog(errorMsg)
            .assertLostTxFee(account)
            .assertNoDelta(auction)
            .start();
    }

    async function ensureFeesRedeemable() {
        const expectedFees = await auction.fees();
        const prize = await auction.isRedeemed()
            ? 0
            : await auction.prize();

        // test that call returns (true, fees)
        const res = await auction.redeemFees.call({from: admin});
        assert.equal(res[0], true);
        assert.strEqual(res[1], await auction.fees())
        console.log("auction.redeemFees.call() returns (true, fees)");
        
        return createDefaultTxTester()
            .startLedger([collector, auction, admin])
            .doTx(() => auction.redeemFees({from: admin}))
            .stopLedger()
            .assertSuccess()
            .assertDelta(collector, expectedFees, 'got fees')
            .assertDelta(auction, expectedFees.mul(-1), 'lost fees')
            .assertLostTxFee(admin)
            .assertBalance(auction, prize, 'should still be prize (or zero if redeemed)')
            .start();
    }
    async function ensureBiddableBy(bidder) {
        const fee = BID_PRICE.mul(BID_FEE_PCT.div(100));
        const prizeIncr = BID_PRICE.minus(fee);
        const newPrize = (await auction.prize()).add(prizeIncr);
        const newFees = (await auction.fees()).add(fee);
        const newNumBids = (await auction.numBids()).add(1);
        const newTimeClosed = (await auction.timeClosed()).add(BID_TIME_S);

        await createDefaultTxTester()
            .startLedger([bidder, auction])
            .doTx(() => auction.sendTransaction({from: bidder, value: BID_PRICE}))
            .stopLedger()
            .assertSuccess()
            .assertDelta(auction, BID_PRICE, "increased by bidPrice")
            .assertOnlyLog('BidOccurred', {bidder: bidder, time: null})
            .assertStateAsString(auction, 'prize', newPrize, "increased correctly")
            .assertStateAsString(auction, 'fees', newFees, "increased correctly")
            .assertStateAsString(auction, 'currentWinner', bidder, "is new currentWinner")
            .assertStateAsString(auction, 'numBids', newNumBids, "increased by one")
            .assertStateAsString(auction, 'timeClosed', newTimeClosed, "increased by bidTimeS")
            .start();
    }
});



describe("Bidding via a Smart Contract", function(){
    var auction;
    var bidderContract;

    const admin = accounts[0];
    const collector = accounts[1];
    const bidderOwner = accounts[2];

    before("create auction, bidderContract, and fund bidderContract", async function(){
        auction = await PennyAuction
            .new(admin, collector, INITIAL_PRIZE, BID_PRICE, BID_TIME_S, BID_FEE_PCT, AUCTION_TIME_S);
        bidderContract = await PennyAuctionBidder
            .new(auction.address, {from: bidderOwner});

        await bidderContract.fund({from: bidderOwner, value: BID_PRICE.mul(5)});
        await auction.open({from: admin, value: INITIAL_PRIZE});
        assert.strEqual(await auction.state(), 1, "Auction is opened");
        assert.strEqual(await testUtil.getBalance(bidderContract), BID_PRICE.mul(5));

        const addresses = {
            admin: admin,
            collector: collector,
            bidderOwner: bidderOwner,
            auction: auction.address,
            bidderContract: bidderContract.address
        };
        createDefaultTxTester().plugins.nameAddresses(addresses);
        console.log("addresses:", addresses)
    });

    it("Smart Contract can bid on an auction", async function(){        
        await createDefaultTxTester()
            .startLedger([auction, bidderContract, bidderOwner])
            .doTx(() => bidderContract.doBid({from: bidderOwner}))
            .stopLedger()
            .assertSuccess()
            .assertDelta(auction, BID_PRICE)
            .assertDelta(bidderContract, BID_PRICE.mul(-1))
            .assertLostTxFee(bidderOwner)
            .start();
    });

    it("Auction cannot be redeemed by admin, since it takes too much gas", async function(){
        // fastforward and close auction
        await testUtil.fastForward((await auction.getTimeRemaining()).toNumber()+1);
        await auction.close();
        // confirm auction is closed and bidderContract is winner
        assert.strEqual(await auction.state(), 2, "Auction is closed");
        assert.equal(await auction.currentWinner(), bidderContract.address, "Bidder is current winner");
        // log
        console.log("Fastforwarded, and closed auction. Current winner is bidderContract");

        // call returns (false, 0)
        const result = await auction.redeem.call({from: admin, gas: 3000000});
        assert.equal(result[0], false);
        assert.strEqual(result[1], 0);

        const prize = await auction.prize();
        await createDefaultTxTester()
            .startLedger([auction, bidderContract, admin])
            .doTx(() => auction.redeem({from: admin, gas: 3000000}))
            .stopLedger()
            .assertSuccess()
            .assertOnlyLog("RedeemFailed", {
                time: null,
                redeemer: admin,
                recipient: bidderContract.address,
                amount: prize
            })
            .assertGasUsedLt(60000)
            .assertLostTxFee(admin)
            .assertNoDelta(auction)
            .assertNoDelta(bidderContract)
            .assertStateAsString(auction, "state", 2, "still CLOSED")
            .assertStateAsString(auction, "prize", prize, "still has prize")
            .start();
    });

    it("Smart Contract can redeem prize itself, even with expensive fallback function", async function(){
        var prize = await auction.prize();

        // call returns (true, prize)
        const result = await bidderContract.doRedemption.call({from: bidderOwner, gas: 3000000});
        assert.equal(result[0], true);
        assert.strEqual(result[1], prize);

        await createDefaultTxTester()
            .startLedger([auction, bidderContract, bidderOwner])
            .startWatching([auction, bidderContract])
            .doTx(() => bidderContract.doRedemption({from: bidderOwner, gas: 3000000}))
            .stopLedger()
            .stopWatching()
            .assertSuccess()
            .assertGasUsedGt(100000)
            .assertOnlyEvent(auction, "Redeemed", {
                time: null,
                redeemer: bidderContract.address,
                recipient: bidderContract.address,
                amount: prize
            })
            .assertDelta(auction, prize.mul(-1))
            .assertDelta(bidderContract, prize)
            .assertLostTxFee(bidderOwner)
            .assertStateAsString(auction, "state", 3, "is REDEEMED")
            .start();
    });
});
