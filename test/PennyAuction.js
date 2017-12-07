const PennyAuction = artifacts.require("./PennyAuction.sol");
const PennyAuctionBidder = artifacts.require("./test-helpers/PennyAuctionBidder.sol");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;
const testUtil = createDefaultTxTester().plugins.testUtil;

const INITIAL_PRIZE  = new BigNumber(.05e18);
const BID_PRICE      = new BigNumber(.001e18);
const BID_ADD_BLOCKS = new BigNumber(5);
const BID_FEE_PCT    = new BigNumber(60);
const INITIAL_BLOCKS = new BigNumber(5);

const accounts = web3.eth.accounts;

describe('PennyAuction', function() {
    var auction, bidderContract, blockStarted;
    const admin = accounts[0];
    const collector = accounts[1];
    const bidder1 = accounts[2];
    const bidder2 = accounts[3];
    const bidder3 = accounts[4];
    const bidderFirst = accounts[5];
    const bidderSecond = accounts[6];
    const bidderThird = accounts[7];
    const nonBidder = accounts[8];
    const nonAdmin = accounts[9];

    before("Create BidderContract", async function(){
        bidderContract = await PennyAuctionBidder.new();
        await bidderContract.fund({value: BID_PRICE.mul(2)});
        assert.strEqual(await testUtil.getBalance(bidderContract), BID_PRICE.mul(2));
    });

    describe("Creation", async function(){
        it("Fails when too little funds are sent", function(){
            return createDefaultTxTester()
                .doNewTx(() => PennyAuction.new(collector,
                    INITIAL_PRIZE, BID_PRICE, BID_ADD_BLOCKS, BID_FEE_PCT, INITIAL_BLOCKS,
                    {value: INITIAL_PRIZE.minus(1)}))
                .assertInvalidOpCode()
                .start();
        });
        it("Fails when too much funds are sent", function(){
            return createDefaultTxTester()
                .doNewTx(() => PennyAuction.new(collector,
                    INITIAL_PRIZE, BID_PRICE, BID_ADD_BLOCKS, BID_FEE_PCT, INITIAL_BLOCKS,
                    {value: INITIAL_PRIZE.plus(1)}))
                .assertInvalidOpCode()
                .start();
        });
    });

    describe("Auction Lifecycle", async function(){
        before("Can be created", async function(){
            return createDefaultTxTester()
                .doNewTx(() => PennyAuction.new(collector,
                    INITIAL_PRIZE, BID_PRICE, BID_ADD_BLOCKS, BID_FEE_PCT, INITIAL_BLOCKS,
                    {value: INITIAL_PRIZE}))
                .assertSuccess("Created auction")
                    .assertOnlyLog("Started", {time: null, initialBlocks: null})
                .doFn(ctx => {
                    auction = ctx.txRes.contract;
                    blockStarted = ctx.txRes.receipt.blockNumber;
                    const addresses = {
                        admin: admin,
                        collector: collector,
                        bidder1: bidder1,
                        bidder2: bidder2,
                        bidder3: bidder3,
                        bidderFirst: bidderFirst,
                        bidderSecond: bidderSecond,
                        bidderThird: bidderThird,
                        nonBidder: nonBidder,
                        bidderContract: bidderContract.address,
                        auction: auction.address
                    };
                    createDefaultTxTester().plugins.nameAddresses(addresses);
                    console.log("addresses:", addresses);
                })
                .start();
        });

        describe("When Started", async function(){
            it("Should have proper state and balance", function(){
                return createDefaultTxTester()
                    .assertStateAsString(auction, 'collector', collector)
                    .assertStateAsString(auction, 'initialPrize', INITIAL_PRIZE)
                    .assertStateAsString(auction, 'bidPrice', BID_PRICE)
                    .assertStateAsString(auction, 'bidAddBlocks', BID_ADD_BLOCKS)
                    .assertStateAsString(auction, 'bidFeePct', BID_FEE_PCT)
                    .assertStateAsString(auction, 'blockEnded', INITIAL_BLOCKS.plus(blockStarted))
                    .assertStateAsString(auction, 'isEnded', false)
                    .assertBalance(auction, INITIAL_PRIZE)
                    .start();
            });
            it("Should not allow prize to be paid", async function(){
                await ensureNotPayable("The auction has not ended.");
            });
        });

        describe("Bidding", async function(){
            it("fails when passing too little", async function() {
                await ensureNotBiddable(bidder1, BID_PRICE.plus(1), "Cannot bid: Value sent must match bidPrice.");
            });
            it("fails when passing too much", async function(){
                await ensureNotBiddable(bidder1, BID_PRICE.minus(1), "Cannot bid: Value sent must match bidPrice.");
            });
            it("works correctly", async function(){
                await ensureBiddable(bidder1);    
            });
            it("currentWinner cannot bid", async function(){
                await ensureNotBiddable(bidder1, BID_PRICE, "Cannot bid: You are already the current winner.");
            });
        });

        describe(".collectFees()", async function(){
            before("should have fees to redeem", async function(){
                // fee amount was already tested in ensureBiddable()
                assert((await auction.fees()).gt(0));
            });
            it("fees should be redeemable", async function(){
                await ensureFeesRedeemable();
            });
        });

        describe("More Bidding...", async function(){
            it("should allow bid by bidder2", async function(){
                await ensureBiddable(bidder2);  
            });
            it("should allow bid by bidder3", async function(){
                await ensureBiddable(bidder3);
            });
        });

        // This is a case where three bidders enter into the same block.
        // first and second bidders should be refunded, and the end result is one extra bid.
        describe("Handles bids within same block", async function(){
            const fee = BID_PRICE.mul(BID_FEE_PCT.div(100));
            const prizeIncr = BID_PRICE.minus(fee);
            const newPrize = (await auction.prize()).add(prizeIncr);
            const newFees = (await auction.fees()).add(fee);
            const newNumBids = (await auction.numBids()).add(1);
            const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

            var tx1, tx2, tx3;
            var tx1fee, tx2fee, tx3fee;
            await createDefaultTxTester()
                .startLedger([bidderFirst, bidderSecond, bidderThird, auction])
                .doFn(() => { testUtil.stopMining(); })
                .doFn(() => { tx1 = auction.sendTransaction({from: bidderFirst, value: BID_PRICE, gas: "200001"}); })
                .wait(100)
                .doFn(() => { tx2 = auction.sendTransaction({from: bidderSecond, value: BID_PRICE, gas: "200002"}); })
                .wait(100)
                .doFn(() => { tx3 = auction.sendTransaction({from: bidderThird, value: BID_PRICE, gas: "200003"}); })
                .wait(100, "Stopped mining, queued both tx1, tx2, and tx3")
                .doFn(() => {
                    console.log("Mining block now...");
                    testUtil.mineBlocks(1);
                    testUtil.startMining();
                    return Promise.all([tx1, tx2, tx3]).then((arr)=>{
                        const tx1res = arr[0];
                        const tx2res = arr[1];
                        const tx3res = arr[2];
                        const block = web3.eth.getBlock(tx1res.receipt.blockNumber);
                        if (block.transactions.length != 3)
                            throw new Error("Expected all transactions to occur on the same block.");
                        if (block.transactions[0] != tx1res.tx)
                            throw new Error("tx1 did not occur first");
                        if (block.transactions[1] != tx2res.tx)
                            throw new Error("tx2 did not occur second");
                        // fix gasUsed bug (gasUsed is recorded as gasUsed up until that tx)
                        tx3res.receipt.gasUsed = tx3res.receipt.gasUsed - tx2res.receipt.gasUsed;
                        tx2res.receipt.gasUsed = tx2res.receipt.gasUsed - tx1res.receipt.gasUsed;
                        // store txFees
                        tx1fee = testUtil.getTx(tx1res.tx).gasPrice.mul(tx1res.receipt.gasUsed);
                        tx2fee = testUtil.getTx(tx2res.tx).gasPrice.mul(tx2res.receipt.gasUsed);
                        tx3fee = testUtil.getTx(tx3res.tx).gasPrice.mul(tx3res.receipt.gasUsed);
                        console.log("All txs executed on same block, in expected order.");
                    });
                })
                .doTx(() => tx1)
                    .assertSuccess("First Bidder")
                    .assertOnlyLog('BidOccurred', {bidder: bidderFirst, time: null})
                .doTx(() => tx2)
                    .assertSuccess("Second Bidder")
                    .assertLogCount(2)
                    .assertLog('BidRefundSuccess', {bidder: bidderFirst, time: null})
                    .assertLog('BidOccurred', {bidder: bidderSecond, time: null})
                .doTx(() => tx3)
                    .assertSuccess("Third Bidder")
                    .assertLogCount(2)
                    .assertLog('BidRefundSuccess', {bidder: bidderSecond, time: null})
                    .assertLog('BidOccurred', {bidder: bidderThird, time: null})
                    .assertStateAsString(auction, 'prize', newPrize, "is incremented only once")
                    .assertStateAsString(auction, 'fees', newFees, "is incremented only once")
                    .assertStateAsString(auction, 'numBids', newNumBids, "is incremented only once")
                    .assertStateAsString(auction, 'blockEnded', newBlockEnded, "is incremented only once")
                .stopLedger()
                    .assertDelta(bidderFirst, ()=>tx1fee.mul(-1), "lost txFee (but got refunded)")
                    .assertDelta(bidderSecond, ()=>tx2fee.mul(-1), "lost txFee (but got refunded)")
                    .assertDelta(bidderThird, ()=>BID_PRICE.plus(tx3fee).mul(-1), "lost bid+txFee")
                    .assertDelta(auction, BID_PRICE, "increased by one bid")
                .start();
        });

        // This is a case where two bidders enter same block, but the refund to the first fails.
        // In this case, there should be a BidRefundFailed() event, and two bids should be counted.
        describe("Handles bids within same block (when refund fails)", async function(){
            const fee = BID_PRICE.mul(BID_FEE_PCT.div(100));
            const prizeIncr = BID_PRICE.minus(fee);
            const newPrize = (await auction.prize()).add(prizeIncr.mul(2));
            const newFees = (await auction.fees()).add(fee.mul(2));
            const newNumBids = (await auction.numBids()).add(2);
            const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

            var tx1, tx2;
            var tx1fee, tx2fee;
            await createDefaultTxTester()
                .startLedger([bidderContract, bidderSecond, auction])
                .startWatching([auction])
                .doFn(() => { testUtil.stopMining(); })
                .doFn(() => { tx1 = bidderContract.doBid(auction.address, {gas: "200001"}); })
                .wait(100)
                .doFn(() => { tx2 = auction.sendTransaction({from: bidderSecond, value: BID_PRICE, gas: "200002"}); })
                .wait(100, "Stopped mining, queued both tx1 and tx2.")
                .doFn(() => {
                    console.log("Mining block now...");
                    testUtil.mineBlocks(1);
                    testUtil.startMining();
                    return Promise.all([tx1, tx2]).then((arr)=>{
                        const tx1res = arr[0];
                        const tx2res = arr[1];
                        const block = web3.eth.getBlock(tx1res.receipt.blockNumber);
                        if (block.transactions.length != 2)
                            throw new Error("Expected both transactions to occur on the same block.");
                        if (block.transactions[0] != tx1res.tx)
                            throw new Error("tx1 did not occur first");
                        // fix gasUsed bug (gasUsed is recorded as gasUsed up until that tx)
                        tx2res.receipt.gasUsed = tx2res.receipt.gasUsed - tx1res.receipt.gasUsed;
                        // store txFees
                        tx1fee = testUtil.getTx(tx1res.tx).gasPrice.mul(tx1res.receipt.gasUsed);
                        tx2fee = testUtil.getTx(tx2res.tx).gasPrice.mul(tx2res.receipt.gasUsed);
                        console.log("Both txs executed on same block, in expected order.");
                    });
                })
                .doTx(() => tx1)
                    .assertSuccess("Contract bidded")
                    // this log is not available since he tx address was bidderContract and not auction
                    // instead, we use .startWatching
                    //.assertOnlyLog('BidOccurred', {time: null, bidder: bidderContract.address})
                .doTx(() => tx2)
                    .assertSuccess("Second Bidder")
                    .assertLogCount(2)
                    .assertLog('BidRefundFailure', {time: null, bidder: bidderContract.address})
                    .assertLog('BidOccurred', {time: null, bidder: bidderSecond})
                    .assertStateAsString(auction, 'prize', newPrize, "is incremented twice")
                    .assertStateAsString(auction, 'fees', newFees, "is incremented twice")
                    .assertStateAsString(auction, 'numBids', newNumBids, "is incremented twice")
                    .assertStateAsString(auction, 'blockEnded', newBlockEnded, "is incremented only once")
                .stopLedger()
                    .assertDelta(bidderContract, BID_PRICE.mul(-1), "lost BID_PRICE")
                    .assertDelta(bidderSecond, ()=>BID_PRICE.plus(tx2fee).mul(-1), "lost bid+txFee")
                    .assertDelta(auction, BID_PRICE.mul(2), "increased by two bids")
                .stopWatching()
                    .assertEvent(auction, 'BidOccurred', {time: null, bidder: bidderContract.address})
                .start();
        });

        describe("Bidding from a contract", function(){
            it("Should accept a bid", async function(){
                const fee = BID_PRICE.mul(BID_FEE_PCT.div(100));
                const prizeIncr = BID_PRICE.minus(fee);
                const newPrize = (await auction.prize()).add(prizeIncr);
                const newFees = (await auction.fees()).add(fee);
                const newNumBids = (await auction.numBids()).add(1);
                const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

                await createDefaultTxTester()
                    .startLedger([bidderContract, auction])
                    .startWatching([auction])
                    .doTx(() => bidderContract.doBid(auction.address))
                        .assertSuccess()
                        .assertStateAsString(auction, 'prize', newPrize, "increased by prizeIncr")
                        .assertStateAsString(auction, 'fees', newFees, "increased by feeIncr")
                        .assertStateAsString(auction, 'currentWinner', bidderContract.address, "is new currentWinner")
                        .assertStateAsString(auction, 'numBids', newNumBids, "increased by 1")
                        .assertStateAsString(auction, 'blockEnded', newBlockEnded, "increased by bidAddBlocks")
                    .stopLedger()
                        .assertDelta(auction, BID_PRICE, "increased by BID_PRICE")
                        .assertDelta(bidderContract, BID_PRICE.mul(-1), "lost BID_PRICE")
                    .stopWatching()
                        .assertOnlyEvent(auction, 'BidOccurred', {bidder: bidderContract.address, time: null})
                    .start();
            });
        });

        describe("After all bidding:", function(){
            before("Is not yet ended", async function(){
                assert.isAbove((await auction.getBlocksRemaining()).toNumber(), 0, "More than 0 blocks left");
                assert.strEqual((await auction.isEnded()), false, "Is not ended");
            })
            it("Should not allow prize to be paid", async function(){
                await ensureNotPayable("The auction has not ended.");
            });
            it("fastforward to make blocksRemaining() 0", async function(){
                const numBlocks = (await auction.getBlocksRemaining()).plus(1);
                console.log(`Mining ${numBlocks} blocks...`);
                await testUtil.mineBlocks(numBlocks);
                
            });
            it("should not accept bids", async function(){
                await ensureNotBiddable(nonBidder, BID_PRICE, "Cannot bid: Auction has already ended.");
            });
            it("should have correct state", async function(){
                await createDefaultTxTester()
                    .assertStateAsString(auction, "isEnded", true)
                    .assertStateAsString(auction, "getBlocksRemaining", 0)
                    .assertStateAsString(auction, "currentWinner", bidderContract.address)
                    .start()
            })
        });

        describe(".payWinner()", function(){
            before("auction should be ended, and won by bidderContract", async function(){
                await createDefaultTxTester()
                    .assertStateAsString(auction, "isEnded", true)
                    .assertStateAsString(auction, "getBlocksRemaining", 0)
                    .assertStateAsString(auction, "currentWinner", bidderContract.address)
                    .start();
            });
            describe("With limited gas", function(){
                it("tx should error", async function(){
                    const prize = await auction.prize();
                    const currentWinner = await auction.currentWinner();
                    const callParams = [auction, "payWinner", 1, {from: nonBidder}];
                    await createDefaultTxTester()
                        .assertCallReturns(callParams, [false, 0])
                        .startLedger([currentWinner, auction, collector, nonBidder])
                        .doTx(callParams)
                        .assertSuccess()
                        .assertOnlyLog("PaymentFailure", {
                            time: null,
                            redeemer: nonBidder,
                            recipient: currentWinner,
                            amount: prize,
                            gasLimit: 1
                        })
                        .stopLedger()
                            .assertLostTxFee(nonBidder)
                            .assertNoDelta(currentWinner)
                            .assertNoDelta(auction)
                        .start();
                })
            });
            describe("With unlimited gas", function(){
                it("should pay to winner (callable by anyone)", async function(){
                    const prize = await auction.prize();
                    const currentWinner = await auction.currentWinner();
                    const callParams = [auction, "payWinner", 0, {from: nonBidder}];
                    await createDefaultTxTester()
                        .assertCallReturns(callParams, [true, prize])
                        .startLedger([nonBidder, currentWinner, auction, collector])
                        .doTx(callParams)
                            .assertSuccess()
                            .assertOnlyLog("PaymentSuccess", {
                                time: null,
                                redeemer: nonBidder,
                                recipient: currentWinner,
                                amount: prize,
                                gasLimit: 0
                            })
                        .stopLedger()
                            .assertLostTxFee(nonBidder)
                            .assertDelta(currentWinner, prize, "got prize")
                            .assertDelta(auction, prize.mul(-1), "lost prize")
                            .assertDelta(collector, 0, "gets nothing")
                            .assertBalance(auction, await auction.fees(), "is only fees")
                        .start();
                });
            });
        });

        describe("After Paid:", function(){
            before(".isPaid() should be true", async function(){
                assert.equal(await auction.isPaid(), true);
            });
            it("should not be payable again", async function(){
                await ensureNotPayable("The prize has already been paid.");
            });
            it("should not accept bids", async function(){
                await ensureNotBiddable(nonBidder, BID_PRICE, "Cannot bid: Auction has already ended.");
            });
            it("should allow remaining fees to be redeemed", async function(){
                await ensureFeesRedeemable();
            });
            it("should now have zero balance", function(){
                assert.strEqual(testUtil.getBalance(auction), "0", "Zero balance");
            });
        });
    })

    // everything should increment and bidder should be new currentWinner
    async function ensureBiddable(bidder) {
        const fee = BID_PRICE.mul(BID_FEE_PCT.div(100));
        const prizeIncr = BID_PRICE.minus(fee);
        const newPrize = (await auction.prize()).add(prizeIncr);
        const newFees = (await auction.fees()).add(fee);
        const newNumBids = (await auction.numBids()).add(1);
        const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

        await createDefaultTxTester()
            .startLedger([bidder, auction])
            .doTx(() => auction.sendTransaction({from: bidder, value: BID_PRICE}))
            .assertSuccess()
                .assertOnlyLog('BidOccurred', {bidder: bidder, time: null})
                .assertStateAsString(auction, 'prize', newPrize, "increased by prizeIncr")
                .assertStateAsString(auction, 'fees', newFees, "increased by feeIncr")
                .assertStateAsString(auction, 'currentWinner', bidder, "is new currentWinner")
                .assertStateAsString(auction, 'numBids', newNumBids, "increased by 1")
                .assertStateAsString(auction, 'blockEnded', newBlockEnded, "increased by bidAddBlocks")
            .stopLedger()
                .assertDelta(auction, BID_PRICE, "increased by bidPrice")
                .assertDeltaMinusTxFee(bidder, BID_PRICE.mul(-1), "decreased by BID_PRICE and txFee")
            .start();
    }
    // makes sure the user cannot bid.
    // they should be refunded and the state of the auction shouldn't change.
    async function ensureNotBiddable(bidder, bidAmt, errorMsg){
        const prevPrize = await auction.prize();
        const prevFees = await auction.fees();
        const prevNumBids = await auction.numBids();
        const prevBlockEnded = await auction.blockEnded();
        return createDefaultTxTester()
            .startLedger([bidder, auction])
            .doTx(() => auction.sendTransaction({from: bidder, value: bidAmt}))
            .assertSuccess()
                .assertOnlyErrorLog(errorMsg)
                .assertStateAsString(auction, 'prize', prevPrize, 'not incremented')
                .assertStateAsString(auction, 'fees', prevFees, 'not incremented')
                .assertStateAsString(auction, 'numBids', prevNumBids, 'not incremented')
                .assertStateAsString(auction, 'blockEnded', prevBlockEnded, 'not incremented')
            .stopLedger()
                .assertLostTxFee(bidder)
                .assertNoDelta(auction)
            .start();
    }
    // fees should be transferred to collected, then set to 0
    async function ensureFeesRedeemable() {
        const expectedFees = await auction.fees();
        const prize = await auction.isPaid()
            ? 0
            : await auction.prize();
        const callParams = [auction, 'collectFees', {from: nonAdmin}];
        
        return createDefaultTxTester()
            .assertCallReturns(callParams, [true, expectedFees])
            .startLedger([collector, auction, nonAdmin])
            .doTx(callParams)
            .assertSuccess()
                .assertStateAsString(auction, 'fees', 0, 'should be zero')
                .assertOnlyLog("FeeCollectionSuccess", {time: null, amount: null})
            .stopLedger()
                .assertDelta(collector, expectedFees, 'got fees')
                .assertDelta(auction, expectedFees.mul(-1), 'lost fees')
                .assertLostTxFee(nonAdmin)
                .assertBalance(auction, prize, `should be the prize (${prize})`)
            .start();
    }
    // auction should not be able to be paid to winner
    async function ensureNotPayable(errorMsg) {
        // test that call returns (false, 0)
        const caller = admin;
        const callParams = [auction, "payWinner", false, {from: admin}];
        return createDefaultTxTester()
            .assertCallReturns(callParams, [false, 0])
            .startLedger([auction, caller])
            .doTx(callParams)
            .assertSuccess()
                .assertOnlyErrorLog(errorMsg)
            .stopLedger()
                .assertLostTxFee(caller)
                .assertNoDelta(auction)
            .start();
    }
});
