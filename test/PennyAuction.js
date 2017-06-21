var PennyAuction = artifacts.require("./PennyAuction.sol");
var PennyAuctionBidder = artifacts.require("./helpers/PennyAuctionBidder.sol");

var TestUtil = require("../js/test-util.js").make(web3, assert);
var BigNumber = require("bignumber.js");
var TxTester = require("../js/tx-tester.js");

var txTester = new TxTester(web3, assert);

var initialPrize = new BigNumber(.5e18);       // half an eth
var bidPrice     = new BigNumber(.01e18);      // tenth of eth
var bidTimeS     = new BigNumber(600);         // 10 minutes
var bidFeePct    = new BigNumber(60);
var auctionTimeS = new BigNumber(60*60*12);    // 12 hours

contract('PennyAuction', function(accounts) {
    var auction;
    var admin = accounts[0];
    var collector = accounts[1];
    var bidder1 = accounts[2];
    var bidder2 = accounts[3];
    var bidder3 = accounts[4];
    var nonBidder = accounts[5];

    // does bidding on behalf of account.
    // optionally creates a describe/it structure.
    function doBidding(account, description){
        var fee = bidPrice.mul(bidFeePct.div(100));
        var prizeIncr = bidPrice.minus(fee);
        var prevState;
        var result;

        async function assertProperState(){
            assert.strEqual(await auction.state(), 1, "Auction is open");
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
            await txTester
                .watch([currentWinner, auction])
                .do(() => auction.sendTransaction({from: currentWinner, value: bidPrice}))
                .assertErrorLog("You are already the current winner")
                .assertLostTxFee(currentWinner)
                .assertDelta(auction, 0);
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

    async function ensureNotOpenable() {
        return txTester
            .do(() => auction.open({from: admin, value: initialPrize}))
            .assertInvalidOpCode();
    }
    async function ensureNotBiddable(errorMsg) {
        return txTester
            .watch([nonBidder, auction])
            .do(() => auction.sendTransaction({from: nonBidder, value: bidPrice}))
            .assertErrorLog(errorMsg)
            .assertLostTxFee(nonBidder)
            .assertDelta(auction, 0);
    }
    async function ensureNotCloseable(errorMsg) {
        assert.equal(await auction.isCloseable(), false, "Should not be closeable");
        
        var curState = await auction.state();
        return txTester
            .do(() => auction.close())
            .assertErrorLog(errorMsg)
            .assertState(auction, "state", curState);
    }
    async function ensureNotRedeemable(fromAccounts, errorMsg) {
        function tryAccount(account) {
            return txTester
                .watch([auction, account])
                .do(() => auction.redeem(0, {from: account}))
                .assertErrorLog(errorMsg)
                .assertLostTxFee(account, `${account} lost txFee`)
                .assertDelta(auction, 0, "auction lost no funds");
        }
        for (var i = 0; i < fromAccounts.length; i++){
            await tryAccount(fromAccounts[i]);
        }
    }


    before("can be created", async function(){
        auction = await PennyAuction.new(admin, collector, initialPrize, bidPrice, bidTimeS, bidFeePct, auctionTimeS);
    })

    describe("When Pending:", function(){
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
            await ensureNotBiddable("Cannot bid when auction is pending");
        });

        describe("Opening...", function(){
            it("should not start from non-admin", async function(){
                await txTester
                    .do(() => auction.open({from: bidder1, value: initialPrize}))
                    .assertInvalidOpCode();
            });

            it("should not start with wrong amount", async function(){
                await txTester
                    .do(() => auction.open({from: admin, value: initialPrize.minus(1)}))
                    .assertInvalidOpCode();
            });

            it("should start correctly when sent the correct amount by admin", async function(){
                var res = await txTester
                    .watch([admin, auction])
                    .do(() => auction.open({from: admin, value: initialPrize}))
                    .assertOneLog("Started", {time: null})
                    .assertDeltaMinusTxFee(admin, initialPrize.mul(-1))
                    .assertDelta(auction, initialPrize);

                // make sure log is correct
                var blockTime = TestUtil.getBlock(res.receipt.blockHash).timestamp;
                assert.closeTo(res.logs[0].args.time.toNumber(), blockTime, 1, "Started.time is blocktime");

                // make sure state is correct
                var state = await TestUtil.getContractState(auction);
                assert.equal(state.state.toNumber(), 1, "State is OPENED");
                assert.equal(state.currentWinner, collector, "currentWinner should be collector");
                assert.closeTo(state.timeOpened.toNumber(), blockTime, 1, "Time opened is blocktime");
                assert.closeTo(state.timeClosed.toNumber(), blockTime + auctionTimeS.toNumber(), 1, "Time closed is auctionTimeS after");
                assert.strEqual(TestUtil.getBalance(auction.address), initialPrize, "Balance is that of initialPrize");
            });    
        });
    });
    
    describe("When Opened:", function(){
        before("ensure it is open", async function(){
            assert.strEqual(await auction.state(), 1);
        });

        it("should have a balance equal to the prize", async function(){
            assert.strEqual(TestUtil.getBalance(auction.address), initialPrize);
        });

        it("should not be able to be started again", async function(){
            await ensureNotOpenable();
        });

        it("should not allow prize to be redeemed", async function(){
            await ensureNotRedeemable([admin, await auction.currentWinner()], "Not callable in current state");
        });

        it("should not be closeable", async function(){
            await ensureNotCloseable("Time not yet expired");
        });

        it("should reject bids of the wrong amount", async function(){
            await txTester
                .watch([bidder1, auction])
                .do(() => auction.sendTransaction({from: bidder1, value: bidPrice.add(1)}))
                .assertErrorLog("Value must match bidPrice")
                .assertLostTxFee(bidder1)
                .assertDelta(auction, 0);

            await txTester
                .watch([bidder1, auction])
                .do(() => auction.sendTransaction({from: bidder1, value: bidPrice.minus(1)}))
                .assertErrorLog("Value must match bidPrice")
                .assertLostTxFee(bidder1)
                .assertDelta(auction, 0);
        });

        // this creates a new describe block "when bidding"
        doBidding(bidder1, "When Bidding:");

        describe("Redeeming fees:", function(){
            it("should not allow non-admins to redeem fees", async function(){
                await txTester
                    .watch([auction])
                    .do(() => auction.redeemFees({from: bidder1}))
                    .assertErrorLog("Only callable by admin")
                    .assertDelta(auction, 0)
            });

            it("should allow fees to be redeemed to collector, by admin", async function(){
                var expectedFees = await auction.fees();
                var prize = await auction.prize();
                await txTester
                    .watch([collector, auction, admin])
                    .do(() => auction.redeemFees({from: admin}))
                    .assertDelta(collector, expectedFees)
                    .assertDelta(auction, expectedFees.mul(-1))
                    .assertLostTxFee(admin)
                    .assertBalance(auction, prize);
            });
        });

        describe("More bidding:", function(){
            it("should allow more bidding...", async function(){
                await doBidding(bidder2);  
                await doBidding(bidder3);
            });

            it("should not be redeemable", async function(){
                await ensureNotRedeemable([admin, await auction.currentWinner()], "Not callable in current state");
            });

            it("should not be closeable", async function(){
                await ensureNotCloseable("Time not yet expired");
            });
        });

        describe("Past timeClosed:", function(){
            before("fastforward to make timeRemaining() 0", async function(){
                assert.equal((await auction.state()).toNumber(), 1, "Is currently opened");
                assert.isAbove((await auction.getTimeRemaining()).toNumber(), 0, "More than 0 timeRemaining");

                await TestUtil.fastForward((await auction.getTimeRemaining()).toNumber() + 1);
                assert.strEqual(await auction.getTimeRemaining(), 0, "Should be no time left");
            });

            it("should not accept bids", async function(){
                await ensureNotBiddable("Cannot bid after timeClosed");
            });

            it("should now be closeable", async function(){
                assert.equal(await auction.isCloseable(), true);
                assert.equal(await auction.isClosedOrRedeemed(), false);
            });

            it("should still not be able to be opened again", async function(){
                await ensureNotOpenable();
            });

            describe("Closing...", function(){
                it("should be closeable by anyone", async function(){
                    await auction.close({from: nonBidder});
                    assert.strEqual(await auction.state(), 2, "Auction should be closed.");
                });  
            })
        });
    });


    describe("When Closed:", function(){
        before("should be closed", async function(){
            assert.strEqual(await auction.state(), 2, "State is closed");
        });

        it("should have balance of prize + fees", async function(){
            var state = await TestUtil.getContractState(auction);
            var expectedBalance = state.prize.plus(state.fees);
            assert.strEqual(TestUtil.getBalance(auction.address), expectedBalance, "Correct final balance");
        });

        describe("Can't do anything but redeem:", function(){
            it("should not be abled to be closed again", async function(){
                await ensureNotCloseable("Not callable in current state");
            });

            it("should not be able to be started again", async function(){
                await ensureNotOpenable();
            });

            it("should not accept bids", async function(){
                await ensureNotBiddable("Cannot bid after timeClosed");
            });
        });

        describe("Redeeming:", function(){
            it("should not be redeemable by losers", async function(){
                await ensureNotRedeemable([nonBidder], "Only callable by admin or winner");
            });

            it("should be redeemable by winner", async function(){
                var prize = await auction.prize();
                var currentWinner = await auction.currentWinner();
                await txTester
                    .watch([currentWinner, auction, collector])
                    .do(() => auction.redeem(0, {from: currentWinner}))
                    .assertDeltaMinusTxFee(currentWinner, prize, "currentWinner gets prize minus txFee")
                    .assertDelta(auction, prize.mul(-1), "auction loses prize")
                    .assertDelta(collector, 0, "collector gets nothing")
                    .assertState(auction, "state", 3);
            });
        });
    });

    describe("When Redeemed:", function(){
        before("ensure it is redeemed", async function(){
            assert.strEqual(await auction.state(), 3, "State is redeemed");
        });

        it("should not be abled to be closed again", async function(){
            await ensureNotCloseable("Not callable in current state");
        });

        it("should not be able to be started again", async function(){
            await ensureNotOpenable();
        });

        it("should not accept bids", async function(){
            await ensureNotBiddable("Cannot bid after timeClosed");
        });

        it("should not be redeemable again", async function(){
            await ensureNotRedeemable([admin, await auction.currentWinner()], "Not callable in current state")
        });

        it("should allow remaining fees to be redeemed", async function(){
            var expectedFees = await auction.fees();
            assert(expectedFees > 0, "Expected fees > 0");

            await txTester
                .watch([auction, collector, admin])
                .do(() => auction.redeemFees({from: admin}))
                .assertDelta(collector, expectedFees)
                .assertDelta(auction, expectedFees.mul(-1))
                .assertLostTxFee(admin)
                .assertState(auction, "fees", 0);
        });

        it("should have zero balance", function(){
            assert.strEqual(TestUtil.getBalance(auction.address), "0", "Zero balance");
        });
    });
});



describe.only("Bidding via a Smart Contract", function(accounts){
    var accounts = web3.eth.accounts;
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
        });
    });

    it("Smart Contract can bid on an auction", async function(){
        assert.strEqual(await auction.state(), 1, "Auction is opened");
        assert.isAbove(
            (await TestUtil.getBalance(bidderContract)).toNumber(),
            (await auction.bidPrice()).toNumber(),
            "bidderContract is funded."
        );
        
        await txTester
            .watch([auction, bidderContract, bidderOwner])
            .do(() => bidderContract.doBid({from: bidderOwner}))
            .assertDelta(auction, bidPrice)
            .assertDelta(bidderContract, bidPrice.mul(-1))
            .assertLostTxFee(bidderOwner);
    });

    it("Auction cannot be redeemed by admin, since it takes too much gas", async function(){
        // fastforward and close auction
        await TestUtil.fastForward((await auction.getTimeRemaining()).toNumber()+1);
        await auction.close();

        // confirm auction is closed and bidderContract is winner
        assert.strEqual(await auction.state(), 2, "Auction is closed");
        assert.equal(await auction.currentWinner(), bidderContract.address, "Bidder is current winner");

        var curPrize = await auction.prize();
        await txTester
            .watch([auction, bidderContract, admin])
            .do(() => auction.redeem({from: admin}))
            .assertOneLog("RedeemFailed", {
                time: null,
                redeemer: admin,
                recipient: bidderContract.address,
                amount: curPrize
            })
            .assertLostTxFee(admin)
            .assertDelta(auction, 0)
            .assertDelta(bidderContract, 0)
            .assertState(auction, "state", 2, "auction is still closed")
            .assertState(auction, "prize", curPrize, "auction still has prize");
    });

    it("Smart Contract can redeem prize itself, even with expensive fallback function", async function(){
        var prize = await auction.prize();
        var watcher = await auction.allEvents();
        await txTester
            .watch([auction, bidderContract, bidderOwner])
            .watchEvents(auction)
            .do(() => bidderContract.doRedemption({from: bidderOwner}))
            .assertEvent(auction, "Redeemed", {
                time: null,
                redeemer: bidderContract.address,
                recipient: bidderContract.address,
                amount: prize
            })
            .assertDelta(auction, prize.mul(-1))
            .assertDelta(bidderContract, prize)
            .assertLostTxFee(bidderOwner)
            .assertState(auction, "state", 3);
    });
});
