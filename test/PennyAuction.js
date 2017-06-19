var PennyAuction = artifacts.require("./PennyAuction.sol");
var PennyAuctionBidder = artifacts.require("./helpers/PennyAuctionBidder.sol");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var Ledger = TestUtil.Ledger;
var BigNumber = require("bignumber.js");

var auction;
var initialPrize = new BigNumber(.5e18);       // half an eth
var bidPrice     = new BigNumber(.01e18);      // tenth of eth
var bidTimeS     = new BigNumber(600);         // 10 minutes
var bidFeePct    = new BigNumber(60);
var auctionTimeS = new BigNumber(60*60*12);    // 12 hours

var ledger = new Ledger();
var EXPECT_INVALID_OPCODE = TestUtil.expectInvalidOpcode;
var EXPECT_ERROR_LOG = TestUtil.expectErrorLog;
var EXPECT_ONE_LOG = TestUtil.expectOneLog;

contract('PennyAuction', function(accounts) {
    var admin = accounts[0];
    var collector = accounts[1];
    var bidder1 = accounts[2];
    var bidder2 = accounts[3];
    var bidder3 = accounts[4];
    var nonBidder = accounts[5];
    var currentWinner;

    // does bidding on behalf of account.
    // optionally creates a describe/it structure.
    function doBidding(account, description){
        var fee = bidPrice.mul(bidFeePct.div(100));
        var prizeIncr = bidPrice.minus(fee);
        var prevState;
        var result;

        async function assertProperState(){
            assert.equal((await auction.state()).toNumber(), 1, "Auction is open");
            assert.notEqual(await auction.currentWinner, account, "bidder should not be current winner");
            assert.notEqual((await auction.getTimeRemaining()).toNumber(), 0, "Time remaining should not be 0");
            prevState = await TestUtil.getContractState(auction);
        }

        async function acceptsBid(){
            var newBalance = TestUtil.getBalance(auction.address).plus(bidPrice);
            result = await auction.sendTransaction({from: account, value: bidPrice});
            assert.strEqual(TestUtil.getBalance(auction.address), newBalance, "Auction got proper funds.");
        }

        async function bidLogOccurred(){
            // check that a BidOccurred happened
            assert.equal(result.logs.length, 1, "One BidOccurred occurred");
            assert.equal(result.logs[0].event, "BidOccurred", "Correct event name");
            assert.equal(result.logs[0].args.bidder, account, "Correct bidder logged");
        }

        async function prizeUpdated(){
            var newPrize = prevState.prize.plus(prizeIncr);
            assert.strEqual(await auction.prize(), newPrize, "Prize updated correctly")
        }

        async function feesUpdated(){
            var newFees = prevState.fees.plus(fee);
            assert.strEqual(await auction.fees(), newFees, "Fees updated correctly");
        }

        async function currentWinnerUpdated(){
            assert.equal(await auction.currentWinner(), account, "Current winner updated");
        }

        async function numBidsUpdated(){
            var newNumBids = prevState.numBids.add(1);
            assert.strEqual(await auction.numBids(), newNumBids, "NumBids updated correctly");
        }

        async function auctionExtended(){
            var newTimeClosed = prevState.timeClosed.add(bidTimeS);
            assert.strEqual(await auction.timeClosed(), newTimeClosed, "Time closed updated correctly.");
        }

        async function rejectCurWinnerBid(){
            var currentWinner = await auction.currentWinner();
            var res = await auction.sendTransaction({from: currentWinner, value: bidPrice});
            await EXPECT_ERROR_LOG(res, "Not callable by current winner");
        }

        if (description) {
            (function(){
                describe(description, function(){
                    before("has a proper state", assertProperState);
                    it("should accept a bid", acceptsBid);
                    it("should log a BidOccurred", bidLogOccurred);
                    it("should update the prize", prizeUpdated);
                    it("should update currentWinner", currentWinnerUpdated);
                    it("should update numBids", numBidsUpdated);
                    it("should extend auction time", auctionExtended);
                    it("should update the fees", feesUpdated);
                    it("should not allow bids from the current winner", rejectCurWinnerBid);
                });
            }());
        } else {
            return (async function(){
                await assertProperState();
                await acceptsBid();
                await bidLogOccurred();
                await prizeUpdated();
                await feesUpdated();
                await currentWinnerUpdated();
                await numBidsUpdated();
                await auctionExtended();
                await rejectCurWinnerBid();
            }());
        }
    }

    before("can be created", async function(){
        auction = await PennyAuction.new(admin, collector, initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS);
        ledger.reset([auction.address, admin, collector, bidder1, bidder2, bidder3]);
    })

    describe("When Pending", function(){
        before("should have proper state", async function(){
            var state = await TestUtil.getContractState(auction);
            assert.equal(state.admin, admin, "Correct admin");
            assert.equal(state.collector, collector, "Correct collector");
            assert.strEqual(state.initialPrize, initialPrize, "Correct initialPrize");
            assert.strEqual(state.bidPrice, bidPrice, "Correct bidPrice");
            assert.strEqual(state.bidTimeS, bidTimeS, "Correct bidTimeS");
            assert.strEqual(state.bidFeePct, bidFeePct, "Correct bidFeePct");
            assert.strEqual(state.auctionTimeS, auctionTimeS, "Correct auctionTimeS");
            assert.equal(state.state, 0, "Correct state");
        });

        it("should have zero balance", async function(){
            assert.equal(await TestUtil.getBalance(auction.address), 0);
        });

        it("should not allow bidding", async function(){
            var ledger = new Ledger([bidder1]);
            await ledger.start();
            var res = await auction.send(bidPrice, {from: bidder1, gas: 300000});
            await ledger.stop();
            await EXPECT_ERROR_LOG(res, "Not callable in current state");

            var txFee = TestUtil.getTxFee(res.tx).mul(-1);
            assert.strEqual(ledger.getDelta(bidder1), txFee, "Lost only txFee");
        });

        describe("Opening...", function(){
            it("should not start from non-admin", async function(){
                TxTester.watch([bidder1, auction.address])
                    .do(auction.open({from: bidder1, value: initialPrize})
                    .assertLostTxFee(bidder1)
                    .assertNoChange(auction.address)
                    .assertErrorLog("Lost only txFee");

                var ledger = new Ledger([bidder1]);
                await ledger.start();
                await EXPECT_ERROR_LOG(auction.open({from: bidder1, value: initialPrize})
                    , "Not callable in current state");
                await ledger.stop();

                var txFee = TestUtil.getTxFee(res.tx).mul(-1);
                assert.strEqual(ledger.getDelta(bidder1), txFee, "Lost only txFee");
                expect.strEqual(await auction.state(), 0, "Auction still pending.");
            });

            it("should not start with wrong amount", async function(){
                await EXPECT_INVALID_OPCODE(auction.open({from: admin, value: initialPrize.minus(1)}));
            });

            it("should start correctly when sent the correct amount by admin", async function(){
                var res = await auction.open({from: admin, value: initialPrize});
                var blockTime = TestUtil.getBlock(res.receipt.blockHash).timestamp;
                // make sure log is correct
                assert.equal(res.logs.length, 1, "1 event logged");
                assert.equal(res.logs[0].event, "Started", "Event name is Started");
                assert.closeTo(res.logs[0].args.time.toNumber(), blockTime, 1, "Started.time is blocktime");

                var state = await TestUtil.getContractState(auction);
                assert.equal(state.state.toNumber(), 1, "State is OPENED");
                assert.equal(state.currentWinner, collector, "currentWinner should be collector");
                assert.closeTo(state.timeOpened.toNumber(), blockTime, 1, "Time opened is blocktime");
                assert.closeTo(state.timeClosed.toNumber(), blockTime + auctionTimeS.toNumber(), 1, "Time closed is auctionTimeS after");
                assert.strEqual(TestUtil.getBalance(auction.address), initialPrize, "Balance is that of initialPrize");
            });    
        });
    });
    
    describe("When Opened", function(){
        before("ensure it is open", async function(){
            assert.equal((await auction.state()).toNumber(), 1);
        });

        it("should have a balance equal to the prize", async function(){
            assert.strEqual(TestUtil.getBalance(auction.address), initialPrize);
        });

        it("should not be able to be started again", async function(){
            await EXPECT_INVALID_OPCODE(auction.open({from: admin, value: initialPrize}));
        });

        it("should not allow prize to be redeemed", async function(){
            await EXPECT_INVALID_OPCODE(auction.redeem(0, {from: admin}));
            var currentWinner = await auction.currentWinner();
            await EXPECT_INVALID_OPCODE(auction.redeem(0, {from: currentWinner}));
        });

        it("should not be closeable", async function(){
            var closeable = await auction.isCloseable();
            assert.equal(closeable, false, "Should not be closeable");
            await EXPECT_INVALID_OPCODE(auction.close());
        });

        it("should reject bids of the wrong amount", async function(){
            await EXPECT_INVALID_OPCODE(auction.sendTransaction({from: bidder1, value: bidPrice.add(1)}));
            await EXPECT_INVALID_OPCODE(auction.sendTransaction({from: bidder1, value: bidPrice.minus(1)}));
        });

        // this creates a new describe block "when bidding"
        doBidding(bidder1, "When Bidding");

        describe("Redeeming fees", function(){
            it("should not allow non-admins to redeem fees", async function(){
                await EXPECT_INVALID_OPCODE(auction.redeemFees({from: bidder1})); 
            });

            it("should allow fees to be redeemed to collector, by admin", async function(){
                // check redeem fees returns correct amount
                var state = await TestUtil.getContractState(auction);
                var expectedFees = state.fees;

                ledger.start();
                var result = await auction.redeemFees({from: admin});
                ledger.stop();

                assert.strEqual(ledger.getDelta(collector), expectedFees, "Collector transferred correct amount");
                assert.strEqual(ledger.getDelta(auction.address), expectedFees.mul(-1), "All fees transferred out of auction");
            });

            it("should now have a balance equal to the prize", async function(){
                assert.strEqual(TestUtil.getBalance(auction.address), await auction.prize());
            });
        });

        describe("More bidding", function(){
            it("should allow more bidding...", async function(){
                await doBidding(bidder2);  
                await doBidding(bidder3);
                await doBidding(bidder1);
            });

            it("should not pay out to the currentWinner", async function(){
                var currentWinner = await auction.currentWinner();
                await EXPECT_INVALID_OPCODE(auction.redeem(0, {from: currentWinner}));
            });

            it("should not be closeable", async function(){
                var closeable = await auction.isCloseable();
                assert.equal(closeable, false, "Auction is not closeable");
                var closedOrRedeemed = await auction.isClosedOrRedeemed();
                assert.equal(closedOrRedeemed, false, "Auction is not closed or redeemed");
                await EXPECT_INVALID_OPCODE(auction.close());
            });
        });

        describe("Past timeClosed", function(){
            before("fastforward to make timeRemaining() 0", async function(){
                assert.equal((await auction.state()).toNumber(), 1, "Is currently opened");
                assert.isAbove((await auction.getTimeRemaining()).toNumber(), 0, "More than 0 timeRemaining");

                await TestUtil.fastForward((await auction.getTimeRemaining()).toNumber() + 1);
                assert.strEqual(await auction.getTimeRemaining(), 0, "Should be no time left");
            });

            it("should not accept bids", async function(){
                await EXPECT_INVALID_OPCODE(auction.sendTransaction({from: nonBidder, value: bidPrice}));
            });

            it("should now be closeable", async function(){
                var closeable = await auction.isCloseable();
                assert.equal(closeable, true, "Should be closeable");
                var closedOrRedeemed = await auction.isClosedOrRedeemed();
                assert.equal(closedOrRedeemed, false, "Auction is not closed or redeemed");
            });

            it("should still not be able to be opened again", async function(){
                await EXPECT_INVALID_OPCODE(auction.open({from: admin, value: initialPrize}));
            });

            describe("Closing...", function(){
                it("should be closeable by anyone", async function(){
                    await auction.close({from: nonBidder});
                    assert.equal((await auction.state()).toNumber(), 2, "Auction should be closed.");
                });  
            })
        });
    });


    describe("When Closed", function(){
        before("should be closed", async function(){
            assert.equal((await auction.state()).toNumber(), 2, "State is closed");
        });

        it("should not be closeable, and should be closedOrRedeemed", async function(){
            var closeable = await auction.isCloseable();
            assert.equal(closeable, false, "Should no longer be closeable");
            var closedOrRedeemed = await auction.isClosedOrRedeemed();
            assert.equal(closedOrRedeemed, true, "Auction is closed or redeemed"); 
        });

        it("should have balance of prize + fees", async function(){
            var state = await TestUtil.getContractState(auction);
            var expectedBalance = state.prize.plus(state.fees);
            assert.strEqual(TestUtil.getBalance(auction.address), expectedBalance, "Correct final balance");
        });

        describe("Can't do anything but redeem", function(){
            it("should not be abled to be closed again", async function(){
                await EXPECT_INVALID_OPCODE(auction.close());
            });

            it("should not be able to be started again", async function(){
                await EXPECT_INVALID_OPCODE(auction.open({from: admin, value: initialPrize}));
            });

            it("should not accept bids", async function(){
                await EXPECT_INVALID_OPCODE(auction.sendTransaction({from: bidder2, value: bidPrice}));
            });
        });

        describe("Redeeming...", function(){
            it("should not be redeemable by losers", async function(){
                await EXPECT_INVALID_OPCODE(auction.redeem(0, {from: nonBidder}));
            });

            it("should be redeemable by winner", async function(){
                var prevState = await TestUtil.getContractState(auction);
                var currentWinner = prevState.currentWinner;
                
                ledger.start();
                var result = await auction.redeem(0, {from: currentWinner});
                ledger.stop();

                // winner gets prize minus gas
                var expectedNet = prevState.prize.minus(TestUtil.getTxFee(result.tx));

                //todo: assert log
                assert.strEqual(ledger.getDelta(currentWinner), expectedNet, "Winner xferred prize");
                assert.strEqual(ledger.getDelta(auction.address), prevState.prize.mul(-1), "Auction xferred out prize");
                assert.equal((await auction.state()).toNumber(), 3, "State set to redeemed");
            });
        });
    });

    describe("When Redeemed", function(){
        before("ensure it is redeemed", async function(){
            assert.equal((await auction.state()).toNumber(), 3, "State is redeemed");
        });

        it("should not be redeemable again", async function(){
            var state = await TestUtil.getContractState(auction);
            var currentWinner = state.currentWinner;
            await EXPECT_INVALID_OPCODE(auction.redeem(0, {from: currentWinner}));
        });

        it("should allow remaining fees to be redeemed", async function(){
            var state = await TestUtil.getContractState(auction);
            var expectedFees = state.fees;
            assert(expectedFees > 0, "Expected fees > 0");

            ledger.start();
            var result = await auction.redeemFees({from: admin});
            ledger.stop();

            assert.strEqual(ledger.getDelta(collector), expectedFees, "Collector transferred correct amount");
            assert.strEqual(ledger.getDelta(auction.address), expectedFees.mul(-1), "All fees transferred out of auction");
        });

        it("should have zero balance", function(){
            assert.strEqual(TestUtil.getBalance(auction.address), "0", "Zero balance");
        });

        it("should not be able to be opened again", async function(){
            await EXPECT_INVALID_OPCODE(auction.open({from: admin, value: initialPrize}));
        });
    });
});



contract("Bidding via a Smart Contract", function(accounts){
    var auction;
    var bidderContract;

    var admin = accounts[0];
    var collector = accounts[1];
    var bidderOwner = accounts[2];

    before(function(){
        return PennyAuction.new(admin, collector, initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS).then(a => {
            auction = a;
        }).then(() => {
            // make a new bidder
            return PennyAuctionBidder.new(auction.address, {from: bidderOwner});
        }).then(b => {
            bidderContract = b;
        }).then(() => {
            // give the bidder some money
            return web3.eth.sendTransaction({from: bidderOwner, to: bidderContract.address, value: bidPrice.mul(5), gas: 3000000});
        }).then(() => {
            // start the auction
            return auction.open({from: admin, value: initialPrize});
        }).then(() => {
            ledger.reset([auction.address, bidderContract.address]); 
        });
    });

    it("Smart Contract can bid on an auction", async function(){
        var state = await TestUtil.getContractState(auction);
        assert.equal(state.state, 1, "Auction is opened");
        assert.isAbove(TestUtil.getBalance(bidderContract.address), state.bidPrice.toNumber(), "bidderContract is funded.");

        ledger.start();
        await bidderContract.doBid({from: bidderOwner});
        ledger.stop();

        assert.strEqual(ledger.getDelta(auction.address), bidPrice, "Bid sent to auction");
    });

    it("Auction cannot be redeemed by admin, since it takes too much gas", async function(){
        // fastforward and close auction
        await TestUtil.fastForward((await auction.getTimeRemaining()).toNumber()+1);
        await auction.close();

        // confirm auction is closed and bidderContract is winner
        var prevState = await TestUtil.getContractState(auction);
        assert.equal(prevState.state, 2, "Auction is closed");
        assert.equal(prevState.currentWinner, bidderContract.address, "Bidder is current winner");
        
        // try to redeem the prize.
        var res = await auction.redeem({from: admin});
        var log = res.logs[0].args;

        // log should show failure.
        assert.equal(log.redeemer, admin, "Admin was redeemer");
        assert.equal(log.recipient, bidderContract.address, "bidderContract was recipient");
        assert.strEqual(log.amtSent, prevState.prize, "amtSent was the prize");
        assert.equal(log.successful, false, "successful was false.");

        // make sure auction is still good
        var state = await TestUtil.getContractState(auction);
        assert.equal(state.state, 2, "Auction is stll closed");
        assert.strEqual(state.prize, prevState.prize, "Still has prize");
    });

    it("Smart Contract can redeem prize itself, even with expensive fallback function", async function(){
        // get contract state, start watching.
        var prevState = await TestUtil.getContractState(auction);
        var watcher = auction.RedeemAttempted();

        // do redemption, this time through the bidderContract.
        ledger.start();
        var res = await bidderContract.doRedemption({from: bidderOwner});
        ledger.stop();

        // it should have worked
        var log = watcher.get()[0].args;
        assert.equal(log.redeemer, bidderContract.address, "RedeemAttempted.redeemer is correct");
        assert.equal(log.recipient, bidderContract.address, "RedeemAttempted.recipient was correct");
        assert.strEqual(log.amtSent, prevState.prize, "RedeemAttempted.amtSent was the prize");
        assert.equal(log.successful, true, "successful was true.");

        // make sure funds are transferred
        var state = await TestUtil.getContractState(auction);
        assert.equal(state.state, 3, "Auction state is redeemed");
        assert.strEqual(ledger.getDelta(auction.address), prevState.prize.mul(-1), "Auction funds lowered");
        assert.strEqual(ledger.getDelta(bidderContract.address), prevState.prize, "Bidder was sent prize");
    });
});
