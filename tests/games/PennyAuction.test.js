const PennyAuction = artifacts.require("PennyAuction");
const ExpensivePayableBidder = artifacts.require("ExpensivePayableBidder");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;
const testUtil = createDefaultTxTester().plugins.testUtil;

const accounts = web3.eth.accounts;

const INITIAL_PRIZE_1  = new BigNumber(.05e18);
const BID_PRICE_1      = new BigNumber(.001e18);
const BID_INCR_1       = new BigNumber(.0001e18);
const BID_ADD_BLOCKS_1 = new BigNumber(5);
const INITIAL_BLOCKS_1 = new BigNumber(5);
const PARAMS_1 = [INITIAL_PRIZE_1, BID_PRICE_1, BID_INCR_1, BID_ADD_BLOCKS_1, INITIAL_BLOCKS_1];

const PARAMS_2 = PARAMS_1.slice();
PARAMS_2[2] = new BigNumber(0);

const PARAMS_3 = PARAMS_1.slice();
PARAMS_3[2] = PARAMS_3[0].div(10).mul(-1);

const PARAMS_4 = PARAMS_1.slice();
PARAMS_4[2] = PARAMS_4[1];

//_smocha.logger.silence = true;
testWithParams("Testing with regular params.", PARAMS_1);
testWithParams("Testing with 0 bidIncr", PARAMS_2)
testWithParams("Testing with negative bidIncr.", PARAMS_3);
testWithParams("Testing with full bidIncr", PARAMS_4);

// runs a full suite of tests on an Auction with params.
// Note: if bidIncr is negative, it will also test that
// prize cannot be bid below zero.
function testWithParams(name, params) {
    describe(name, function() {
        const INITIAL_PRIZE = params[0];
        const BID_PRICE = params[1];
        const BID_INCR = params[2];
        const BID_ADD_BLOCKS = params[3];
        const INITIAL_BLOCKS = params[4];
        this.logInfo(`Will test a Penny Auction with these params:`);
        this.logInfo(`Initial Prize: ${INITIAL_PRIZE}`);
        this.logInfo(`Bid Price: ${BID_PRICE}`);
        this.logInfo(`Bid Incr: ${BID_INCR}`);
        this.logInfo(`Bid Add Blocks: ${BID_ADD_BLOCKS}`);
        this.logInfo(`Initial Blocks: ${INITIAL_BLOCKS}`);

        var auction, maliciousBidder, blockStarted;
        const anon = accounts[0];
        const collector = accounts[1];
        const bidder1 = accounts[2];
        const bidder2 = accounts[3];
        const bidder3 = accounts[4];
        const bidderFirst = accounts[5];
        const bidderSecond = accounts[6];
        const bidderThird = accounts[7];
        const nonBidder = accounts[8];
        const nonAdmin = accounts[9];

        const addresses = {
            collector: collector,
            bidder1: bidder1,
            bidder2: bidder2,
            bidder3: bidder3,
            bidderFirst: bidderFirst,
            bidderSecond: bidderSecond,
            bidderThird: bidderThird,
            nonBidder: nonBidder
        };

        before("Create Malicious Bidder", async function(){
            await createDefaultTxTester().nameAddresses(addresses).start();

            this.logInfo("Create and fund a MaliciousBidder instance.");
            this.logInfo("This bidder's fallback function causes an OOG error.");
            await createDefaultTxTester()
                .doNewTx(ExpensivePayableBidder, [], {from: anon}).assertSuccess()
                .withTxResult((txRes, plugins)=>{
                    maliciousBidder = txRes.contract;
                    plugins.addAddresses({maliciousBidder: maliciousBidder});
                })
                .doTx(() => maliciousBidder.fund({value: BID_PRICE.mul(5), from: anon}))
                .assertSuccess()
                .start();

            assert.strEqual(await testUtil.getBalance(maliciousBidder), BID_PRICE.mul(5));

            await createDefaultTxTester().printNamedAddresses().start();
        });

        describe("Creation", async function(){
            it("Fails when too little funds are sent", function(){
                return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE, BID_INCR, BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE.minus(1), from: anon})
                    .assertInvalidOpCode()
                    .start();
            });
            it("Fails when too much funds are sent", function(){
                return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE, BID_INCR, BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE.plus(1), from: anon})
                    .assertInvalidOpCode()
                    .start();
            });
            it("Fails when initialPrize is not divisible by GWei", function(){
               return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE.plus(1), BID_PRICE, BID_INCR, BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE.plus(1), from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when bidPrice is not divisible by GWei", function(){
               return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE.plus(1), BID_INCR, BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when bidIncr is not divisible by GWei", function(){
               return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE, BID_INCR.plus(1), BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when bidIncr is > bidPrice", function(){
               return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE, BID_PRICE.plus(1), BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when bidIncr is < INITIAL_PRIZE.mul(-1)", function(){
               return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE, INITIAL_PRIZE.plus(1).mul(-1), BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
        });

        describe("Auction Lifecycle", async function(){
            before("Can be created", async function(){
                return createDefaultTxTester()
                    .doNewTx(PennyAuction, [collector,
                        INITIAL_PRIZE, BID_PRICE, BID_INCR, BID_ADD_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertSuccess("Created auction")
                        .assertOnlyLog("Started", {time: null, initialBlocks: null})
                    .withTxResult((txRes, plugins) => {
                        auction = txRes.contract;
                        blockStarted = txRes.receipt.blockNumber;
                        createDefaultTxTester().addAddresses({auction: auction}).start();
                    })
                    .start();
            });

            describe("When Started", async function(){
                it("Should have proper state and balance", function(){
                    return createDefaultTxTester()
                        .assertCallReturns([auction, 'prize'], INITIAL_PRIZE)
                        .assertCallReturns([auction, 'fees'], 0)
                        .assertCallReturns([auction, 'collector'], collector)
                        .assertCallReturns([auction, 'initialPrize'], INITIAL_PRIZE)
                        .assertCallReturns([auction, 'bidPrice'], BID_PRICE)
                        .assertCallReturns([auction, 'bidIncr'], BID_INCR)
                        .assertCallReturns([auction, 'bidAddBlocks'], BID_ADD_BLOCKS)
                        .assertCallReturns([auction, 'blockEnded'], INITIAL_BLOCKS.plus(blockStarted))
                        .assertCallReturns([auction, 'isEnded'], false)
                        .assertCallReturns([auction, 'isPaid'], false)
                        .assertBalance(auction, INITIAL_PRIZE)
                        .start();
                });
                it("Should not allow prize to be paid", async function(){
                    await ensureNotPayable("The auction has not ended.");
                });
            });

            describe("Bidding", async function(){
                it("fails when passing too little", async function() {
                    await ensureNotBiddable(bidder1, BID_PRICE.plus(1), "Value sent must match bidPrice.");
                });
                it("fails when passing too much", async function(){
                    await ensureNotBiddable(bidder1, BID_PRICE.minus(1), "Value sent must match bidPrice.");
                });
                it("works correctly", async function(){
                    await ensureBiddable(bidder1);    
                });
                it("currentWinner cannot bid", async function(){
                    await ensureNotBiddable(bidder1, BID_PRICE, "You are already the current winner.");
                });
            });

            describe(".sendFees()", async function(){
                it("fees should be redeemable", async function(){
                    await ensureFeesSendable();
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
            describe("Handles bids within same block", function(){
                it("When refund works", async function(){
                    this.logInfo("This tests a case where three bids occur on the same block.");
                    this.logInfo("We ensure the first and second bidders are refunded.");
                    this.logInfo("Note: The weird gas amounts are due to a bug in Ganache.");
                    const fee = BID_PRICE.minus(BID_INCR);
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
                        .doFn(() => { tx1 = auction.sendTransaction({from: bidderFirst, value: BID_PRICE, gas: "200000"}); })
                        .wait(100)
                        .doFn(() => { tx2 = auction.sendTransaction({from: bidderSecond, value: BID_PRICE, gas: "200001"}); })
                        .wait(100)
                        .doFn(() => { tx3 = auction.sendTransaction({from: bidderThird, value: BID_PRICE, gas: "200002"}); })
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

                                // fix web3 logs bug 
                                // (logs of other transactions are erroneously included)
                                arr.forEach((txRes)=>{
                                    const hash = txRes.tx;
                                    txRes.receipt.logs = txRes.receipt.logs.filter((l)=>l.transactionHash == hash);
                                    txRes.logs = txRes.logs.filter((l)=>l.transactionHash == hash);
                                })
                                // fix ganache gasUsed bug
                                // (gasUsed is erroneously recorded as cumulativeGasUsed)
                                tx3res.receipt.gasUsed = tx3res.receipt.gasUsed - tx2res.receipt.gasUsed;
                                tx2res.receipt.gasUsed = tx2res.receipt.gasUsed - tx1res.receipt.gasUsed;
                                // store txFees
                                tx1fee = testUtil.getTx(tx1res.tx).gasPrice.mul(tx1res.receipt.gasUsed);
                                tx2fee = testUtil.getTx(tx2res.tx).gasPrice.mul(tx2res.receipt.gasUsed);
                                tx3fee = testUtil.getTx(tx3res.tx).gasPrice.mul(tx3res.receipt.gasUsed);
                                console.log("All txs executed on same block, in expected order.");
                            });
                        })
                        .doTx(() => tx1, "First bid.")
                            .assertSuccess()
                            .assertOnlyLog('BidOccurred', {bidder: bidderFirst, time: null})
                            .assertGasUsedLt(36000)
                        .doTx(() => tx2, "Second bid, causes refund.")
                            .assertSuccess()
                            .assertLogCount(2)
                            .assertLog('BidRefundSuccess', {bidder: bidderFirst, time: null})
                            .assertLog('BidOccurred', {bidder: bidderSecond, time: null})
                            .assertGasUsedLt(41000)
                        .doTx(() => tx3, "Third bid, causes refund.")
                            .assertSuccess()
                            .assertLogCount(2)
                            .assertLog('BidRefundSuccess', {bidder: bidderSecond, time: null})
                            .assertLog('BidOccurred', {bidder: bidderThird, time: null})
                            .assertGasUsedLt(41000)
                            .assertCallReturns([auction, 'prize'], newPrize, "is incremented only once")
                            .assertCallReturns([auction, 'fees'], newFees, "is incremented only once")
                            .assertCallReturns([auction, 'numBids'], newNumBids, "is incremented only once")
                            .assertCallReturns([auction, 'blockEnded'], newBlockEnded, "is incremented only once")
                        .stopLedger()
                            .assertDelta(bidderFirst, ()=>tx1fee.mul(-1), "lost txFee (but got refunded)")
                            .assertDelta(bidderSecond, ()=>tx2fee.mul(-1), "lost txFee (but got refunded)")
                            .assertDelta(bidderThird, ()=>BID_PRICE.plus(tx3fee).mul(-1), "lost bid+txFee")
                            .assertDelta(auction, BID_PRICE, "increased by one bid")
                        .start();
                });
                // This is a case where two bidders enter same block, but the refund to the first fails.
                // In this case, there should be a BidRefundFailed() event, and two bids should be counted.
                it("When refund fails", async function(){
                    this.logInfo("In this case, two bids occur in the same block.");
                    this.logInfo("However, the first bidder's fallback function fails or tries a gas DoS.");
                    this.logInfo("This test ensures bidding handles this properly.");
                    this.logInfo("Note: The weird gas amounts are due to a bug in Ganache.");
                    const fee = BID_PRICE.minus(BID_INCR);
                    const prizeIncr = BID_PRICE.minus(fee);
                    const newPrize = (await auction.prize()).add(prizeIncr.mul(2));
                    const newFees = (await auction.fees()).add(fee.mul(2));
                    const newNumBids = (await auction.numBids()).add(2);
                    const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

                    var tx1, tx2;
                    var tx1fee, tx2fee;
                    await createDefaultTxTester()
                        .startLedger([maliciousBidder, bidderSecond, auction])
                        .startWatching([auction])
                        .doFn(() => { testUtil.stopMining(); })
                        .doFn(() => { tx1 = maliciousBidder.doBid(auction.address, {from: anon, gas: "200000"}); })
                        .wait(100)
                        .doFn(() => { tx2 = auction.sendTransaction({from: bidderSecond, value: BID_PRICE, gas: "200001"}); })
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
                                // fix logs bug (all logs included in all receipts/logs)
                                arr.forEach((txRes)=>{
                                    const hash = txRes.tx;
                                    txRes.receipt.logs = txRes.receipt.logs.filter((l)=>l.transactionHash == hash);
                                    txRes.logs = txRes.logs.filter((l)=>l.transactionHash == hash);
                                })
                                // fix gasUsed bug (gasUsed is recorded as gasUsed up until that tx)
                                tx2res.receipt.gasUsed = tx2res.receipt.gasUsed - tx1res.receipt.gasUsed;
                                // store txFees
                                tx1fee = testUtil.getTx(tx1res.tx).gasPrice.mul(tx1res.receipt.gasUsed);
                                tx2fee = testUtil.getTx(tx2res.tx).gasPrice.mul(tx2res.receipt.gasUsed);
                                console.log("Both txs executed on same block, in expected order.");
                            });
                        })
                        .doTx(() => tx1, "Malicious Bidder bids")
                            .assertSuccess()
                            // Below will not be in logs (since the 'to:' was not auction, not maliciousBidder)
                            // The next tx test case covers this anyway: BidRefundFailure to maliciousBidder
                            //.assertOnlyLog('BidOccurred', {time: null, bidder: maliciousBidder.address})
                        .doTx(() => tx2, "Next bid, causes refund failure")
                            .assertSuccess()
                            .assertLogCount(2)
                            .assertLog('BidRefundFailure', {time: null, bidder: maliciousBidder.address})
                            .assertLog('BidOccurred', {time: null, bidder: bidderSecond})
                            .assertGasUsedLt(43000)
                            .assertCallReturns([auction, 'prize'], newPrize, "is incremented twice")
                            .assertCallReturns([auction, 'fees'], newFees, "is incremented twice")
                            .assertCallReturns([auction, 'numBids'], newNumBids, "is incremented twice")
                            .assertCallReturns([auction, 'blockEnded'], newBlockEnded, "is incremented only once")
                        .stopLedger()
                            .assertDelta(maliciousBidder, BID_PRICE.mul(-1), "lost BID_PRICE")
                            .assertDelta(bidderSecond, ()=>BID_PRICE.plus(tx2fee).mul(-1), "lost bid+txFee")
                            .assertDelta(auction, BID_PRICE.mul(2), "increased by two bids")
                        .stopWatching()
                            .assertEvent(auction, 'BidOccurred', {time: null, bidder: maliciousBidder.address})
                        .start();
                })
                
            });

            describe("Bidding from a contract", function(){
                it("Should accept a bid", async function(){
                    const fee = BID_PRICE.minus(BID_INCR);
                    const prizeIncr = BID_PRICE.minus(fee);
                    const newPrize = (await auction.prize()).add(prizeIncr);
                    const newFees = (await auction.fees()).add(fee);
                    const newNumBids = (await auction.numBids()).add(1);
                    const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

                    await createDefaultTxTester()
                        .startLedger([maliciousBidder, auction])
                        .startWatching([auction])
                        .doTx(() => maliciousBidder.doBid(auction.address, {from: anon}))
                            .assertSuccess()
                            .assertCallReturns([auction, 'prize'], newPrize, "increased by prizeIncr")
                            .assertCallReturns([auction, 'fees'], newFees, "increased by feeIncr")
                            .assertCallReturns([auction, 'currentWinner'], maliciousBidder.address, "is new currentWinner")
                            .assertCallReturns([auction, 'numBids'], newNumBids, "increased by 1")
                            .assertCallReturns([auction, 'blockEnded'], newBlockEnded, "increased by bidAddBlocks")
                        .stopLedger()
                            .assertDelta(auction, BID_PRICE, "increased by BID_PRICE")
                            .assertDelta(maliciousBidder, BID_PRICE.mul(-1), "lost BID_PRICE")
                        .stopWatching()
                            .assertOnlyEvent(auction, 'BidOccurred', {bidder: maliciousBidder.address, time: null})
                        .start();
                });
            });

            if (BID_INCR.lt(0)) {
                describe("Cannot bid to make prize negative", async function(){
                    it("Deplete the prize() to near 0", async function(){
                        const prize = await auction.prize();
                        const numBids = prize.div(BID_INCR.mul(-1)).floor();
                        this.logInfo(`Prize should be depleted after ${numBids} bids, and fail on next.`);
                        const bidders = [bidder1, bidder2];
                        for (var i=0; i<numBids-1; i++) {
                            console.log(`Bid #${i+1} from bidder ${(i%2)+1}...`);
                            var curBidder = bidders[i % 2];
                            await createDefaultTxTester()
                                .silence()
                                .doTx(()=>auction.sendTransaction({from: curBidder, value: BID_PRICE}))
                                .assertSuccess()
                                .assertOnlyLog("BidOccurred")
                                .start();
                        }
                        this.logInfo("Bidding with maliciousBidder so that it's the winner.");
                        await createDefaultTxTester()
                                .doTx(() => maliciousBidder.doBid(auction.address, {from: anon}))
                                .assertSuccess()
                                .assertCallReturns([auction, "currentWinner"], maliciousBidder.address)
                                .start();    
                    });
                    it("Next bid should fail", async function(){
                        const curPrize = await auction.prize();
                        this.logInfo(`${curPrize} prize remaining. Bidding now should fail.`);
                        const errMsg = "Bidding would result in a negative prize.";
                        await ensureNotBiddable(nonBidder, BID_PRICE, errMsg);    
                    });
                });
            }

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
                    this.logInfo(`Mining ${numBlocks} blocks...`);
                    await testUtil.mineBlocks(numBlocks);
                    
                });
                it("should not accept bids", async function(){
                    await ensureNotBiddable(nonBidder, BID_PRICE, "Auction has already ended.");
                });
                it("should have correct state", async function(){
                    await createDefaultTxTester()
                        .assertCallReturns([auction, "isEnded"], true)
                        .assertCallReturns([auction, "getBlocksRemaining"], 0)
                        .start()
                })
            });

            describe(".sendPrize()", function(){
                before("auction should be ended, and won by maliciousBidder", async function(){
                    await createDefaultTxTester()
                        .assertCallReturns([auction, "isEnded"], true)
                        .assertCallReturns([auction, "getBlocksRemaining"], 0)
                        .assertCallReturns([auction, "currentWinner"], maliciousBidder.address)
                        .start();
                });
                describe("With limited gas", function(){
                    this.logInfo("The winner requires a ton of gas to pay for sending the prize.");
                    this.logInfo(".sendPrize(50000) only allots 50,000 gas to pay the winner, and should fail.");
                    it("tx should error", async function(){
                        const GAS_LIMIT = 50000;
                        const prize = await auction.prize();
                        const currentWinner = await auction.currentWinner();
                        const callParams = [auction, "sendPrize", GAS_LIMIT, {from: nonBidder}];
                        await createDefaultTxTester()
                            .assertCallReturns(callParams, [false, 0])
                            .startLedger([currentWinner, auction, collector, nonBidder])
                            .doTx(callParams)
                            .assertSuccess()
                            .assertOnlyLog("SendPrizeFailure", {
                                time: null,
                                redeemer: nonBidder,
                                recipient: currentWinner,
                                amount: prize,
                                // gasLimit: GAS_LIMIT -- ganache bug reports this as += 2300.
                            })
                            .stopLedger()
                                .assertLostTxFee(nonBidder)
                                .assertNoDelta(currentWinner)
                                .assertNoDelta(auction)
                            .start();
                    })
                });
                describe("With unlimited gas", function(){
                    this.logInfo("If we call .sendPrize(0), however, it should work (and use a lot of gas)");
                    it("should pay to winner (callable by anyone)", async function(){
                        const prize = await auction.prize();
                        const currentWinner = await auction.currentWinner();
                        const callParams = [auction, "sendPrize", 0, {from: nonBidder}];
                        await createDefaultTxTester()
                            .assertCallReturns(callParams, [true, prize])
                            .startLedger([nonBidder, currentWinner, auction, collector])
                            .doTx(callParams)
                                .assertSuccess()
                                .assertOnlyLog("SendPrizeSuccess", {
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
                    await ensureNotBiddable(nonBidder, BID_PRICE, "Auction has already ended.");
                });
                it("should allow remaining fees to be redeemed", async function(){
                    await ensureFeesSendable();
                });
                it("should now have zero balance", function(){
                    assert.strEqual(testUtil.getBalance(auction), "0", "Zero balance");
                });
            });
        });

        // everything should increment and bidder should be new currentWinner
        async function ensureBiddable(bidder) {
            const fee = BID_PRICE.minus(BID_INCR);
            const prizeIncr = BID_PRICE.minus(fee);
            const newPrize = (await auction.prize()).add(prizeIncr);
            const newFees = (await auction.fees()).add(fee);
            const newNumBids = (await auction.numBids()).add(1);
            const newTotalFees = newNumBids.mul(fee);
            const newBlockEnded = (await auction.blockEnded()).add(BID_ADD_BLOCKS);

            await createDefaultTxTester()
                .startLedger([bidder, auction])
                .doTx(() => auction.sendTransaction({from: bidder, value: BID_PRICE}))
                .stopLedger()
                    .assertDelta(auction, BID_PRICE, "increased by bidPrice")
                    .assertDeltaMinusTxFee(bidder, BID_PRICE.mul(-1), "decreased by BID_PRICE and txFee")
                .assertSuccess()
                    .assertOnlyLog('BidOccurred', {bidder: bidder, time: null})
                .assertGasUsedLt(36000)
                    .assertCallReturns([auction, 'numBids'], newNumBids, "increased by 1")
                    .assertCallReturns([auction, 'totalFees'], newTotalFees)
                    .assertCallReturns([auction, 'prize'], newPrize, "increased by prizeIncr")
                    .assertCallReturns([auction, 'fees'], newFees, "increased by feeIncr")
                    .assertCallReturns([auction, 'currentWinner'], bidder, "is new currentWinner")
                    .assertCallReturns([auction, 'blockEnded'], newBlockEnded, "increased by bidAddBlocks")
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
                    .assertOnlyLog("BidRefundSuccess", {msg: errorMsg, bidder: bidder})
                    .assertCallReturns([auction, 'prize'], prevPrize, 'not incremented')
                    .assertCallReturns([auction, 'fees'], prevFees, 'not incremented')
                    .assertCallReturns([auction, 'numBids'], prevNumBids, 'not incremented')
                    .assertCallReturns([auction, 'blockEnded'], prevBlockEnded, 'not incremented')
                .stopLedger()
                    .assertLostTxFee(bidder)
                    .assertNoDelta(auction)
                .start();
        }
        // fees should be transferred to collected, then set to 0
        async function ensureFeesSendable() {
            if (BID_INCR.equals(BID_PRICE)){
                console.log("With these parameters, no fees will ever be accrued. Skipping.");
                return;
            }

            const expectedFees = await auction.fees();
            const prize = await auction.isPaid()
                ? 0
                : await auction.prize();
            const callParams = [auction, 'sendFees', {from: nonAdmin}];
            
            return createDefaultTxTester()
                .assertCallReturns(callParams, expectedFees)
                .startLedger([collector, auction, nonAdmin])
                .doTx(callParams)
                .assertSuccess()
                    .assertCallReturns([auction, 'fees'], 0, 'should be zero')
                    .assertOnlyLog("FeesSent", {time: null, amount: null})
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
            const callParams = [auction, "sendPrize", false, {from: nonAdmin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [false, 0])
                .startLedger([auction, nonAdmin])
                .doTx(callParams)
                .assertSuccess()
                    .assertOnlyLog("SendPrizeError", {msg: errorMsg})
                .stopLedger()
                    .assertLostTxFee(nonAdmin)
                    .assertNoDelta(auction)
                .start();
        }
    });
}
