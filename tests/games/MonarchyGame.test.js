const MonarchyGame = artifacts.require("MonarchyGame");
const MaliciousMonarchyPlayer = artifacts.require("MaliciousMonarchyPlayer");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;
const testUtil = createDefaultTxTester().plugins.testUtil;

const accounts = web3.eth.accounts;

const INITIAL_PRIZE_1  = new BigNumber(.05e18);
const FEE_1            = new BigNumber(.001e18);
const PRIZE_INCR_1     = new BigNumber(.0001e18);
const REIGN_BLOCKS_1   = new BigNumber(5);
const INITIAL_BLOCKS_1 = new BigNumber(5);
const PARAMS_1 = [INITIAL_PRIZE_1, FEE_1, PRIZE_INCR_1, REIGN_BLOCKS_1, INITIAL_BLOCKS_1];

const PARAMS_2 = PARAMS_1.slice();
PARAMS_2[2] = new BigNumber(0);

const PARAMS_3 = PARAMS_1.slice();
PARAMS_3[2] = PARAMS_3[0].div(10).mul(-1);

const PARAMS_4 = PARAMS_1.slice();
PARAMS_4[2] = PARAMS_4[1];

//_smocha.logger.silence = true;
testWithParams("Testing with regular params.", PARAMS_1);
testWithParams("Testing with 0 prizeIncr", PARAMS_2)
testWithParams("Testing with negative prizeIncr.", PARAMS_3);
testWithParams("Testing with full prizeIncr", PARAMS_4);

// runs a full suite of tests on an game with params.
// Note: if prizeIncr is negative, it will also test that prize cannot get below zero.
function testWithParams(name, params) {
    describe(name, function() {
        const INITIAL_PRIZE = params[0];
        const FEE = params[1];
        const PRIZE_INCR = params[2];
        const REIGN_BLOCKS = params[3];
        const INITIAL_BLOCKS = params[4];
        this.logInfo(`Will test a Penny game with these params:`);
        this.logInfo(`Initial Prize: ${INITIAL_PRIZE}`);
        this.logInfo(`Overthrow Fee: ${FEE}`);
        this.logInfo(`Prize Incr: ${PRIZE_INCR}`);
        this.logInfo(`Reign Blocks: ${REIGN_BLOCKS}`);
        this.logInfo(`Initial Blocks: ${INITIAL_BLOCKS}`);

        var game, maliciousPlayer, blockStarted;
        const anon = accounts[0];
        const collector = accounts[1];
        const player1 = accounts[2];
        const player2 = accounts[3];
        const player3 = accounts[4];
        const overthrower1 = accounts[5];
        const overthrower2 = accounts[6];
        const overthrower3 = accounts[7];
        const nonPlayer = accounts[8];

        const addresses = {
            collector: collector,
            player1: player1,
            player2: player2,
            player3: player3,
            overthrower1: overthrower1,
            overthrower2: overthrower2,
            overthrower3: overthrower3,
            nonPlayer: nonPlayer
        };

        before("Create Malicious Player", async function(){
            await createDefaultTxTester().nameAddresses(addresses).start();

            this.logInfo("Create and fund a MaliciousMonarchyPlayer instance.");
            this.logInfo("This player's fallback function causes an OOG error.");
            await createDefaultTxTester()
                .doNewTx(MaliciousMonarchyPlayer, [], {from: anon}).assertSuccess()
                .withTxResult((txRes, plugins)=>{
                    maliciousPlayer = txRes.contract;
                    plugins.addAddresses({maliciousPlayer: maliciousPlayer});
                })
                .doTx(() => maliciousPlayer.fund({value: FEE.mul(5), from: anon}))
                .assertSuccess()
                .start();

            assert.strEqual(await testUtil.getBalance(maliciousPlayer), FEE.mul(5));

            await createDefaultTxTester().printNamedAddresses().start();
        });

        describe("Creation", async function(){
            it("Fails when too little funds are sent", function(){
                return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE, PRIZE_INCR, REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE.minus(1), from: anon})
                    .assertInvalidOpCode()
                    .start();
            });
            it("Fails when too much funds are sent", function(){
                return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE, PRIZE_INCR, REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE.plus(1), from: anon})
                    .assertInvalidOpCode()
                    .start();
            });
            it("Fails when initialPrize is not divisible by GWei", function(){
               return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE.plus(1), FEE, PRIZE_INCR, REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE.plus(1), from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when fee is not divisible by GWei", function(){
               return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE.plus(1), PRIZE_INCR, REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when prizeIncr is not divisible by GWei", function(){
               return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE, PRIZE_INCR.plus(1), REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when prizeIncr is > fee", function(){
               return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE, FEE.plus(1), REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
            it("Fails when prizeIncr is < INITIAL_PRIZE.mul(-1)", function(){
               return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE, INITIAL_PRIZE.plus(1).mul(-1), REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertInvalidOpCode()
                    .start(); 
            });
        });

        describe("Game Lifecycle", async function(){
            before("Can be created", async function(){
                return createDefaultTxTester()
                    .doNewTx(MonarchyGame, [collector,
                        INITIAL_PRIZE, FEE, PRIZE_INCR, REIGN_BLOCKS, INITIAL_BLOCKS],
                        {value: INITIAL_PRIZE, from: anon})
                    .assertSuccess("Created Game")
                        .assertOnlyLog("Started", {time: null, initialBlocks: null})
                    .withTxResult((txRes, plugins) => {
                        game = txRes.contract;
                        blockStarted = txRes.receipt.blockNumber;
                        createDefaultTxTester().addAddresses({game: game}).start();
                    })
                    .start();
            });

            describe("When Started", async function(){
                it("Should have proper state and balance", function(){
                    return createDefaultTxTester()
                        .assertCallReturns([game, 'prize'], INITIAL_PRIZE)
                        .assertCallReturns([game, 'fees'], 0)
                        .assertCallReturns([game, 'collector'], collector)
                        .assertCallReturns([game, 'initialPrize'], INITIAL_PRIZE)
                        .assertCallReturns([game, 'fee'], FEE)
                        .assertCallReturns([game, 'prizeIncr'], PRIZE_INCR)
                        .assertCallReturns([game, 'reignBlocks'], REIGN_BLOCKS)
                        .assertCallReturns([game, 'blockEnded'], INITIAL_BLOCKS.plus(blockStarted))
                        .assertCallReturns([game, 'isEnded'], false)
                        .assertCallReturns([game, 'isPaid'], false)
                        .assertBalance(game, INITIAL_PRIZE)
                        .start();
                });
                it("Should not allow prize to be paid", async function(){
                    await ensureNotPayable("The game has not ended.");
                });
            });

            describe("Overthrowing", async function(){
                it("fails when passing too little", async function() {
                    await ensureNotOverthrowable(player1, FEE.plus(1), "Value sent must match fee.");
                });
                it("fails when passing too much", async function(){
                    await ensureNotOverthrowable(player1, FEE.minus(1), "Value sent must match fee.");
                });
                it("works correctly", async function(){
                    await ensureOverthrowable(player1);
                });
                it("monarch cannot overthrow himself", async function(){
                    await ensureNotOverthrowable(player1, FEE, "You are already the Monarch.");
                });
            });

            describe(".sendFees()", async function(){
                it("fees should be redeemable", async function(){
                    await ensureFeesSendable();
                });
            });

            describe("More Overthrowing...", async function(){
                it("player2 overthrows", async function(){
                    await ensureOverthrowable(player2);  
                });
                it("player3 overthrows", async function(){
                    await ensureOverthrowable(player3);
                });
            });

            // This is a case where three players overthrow in the same block.
            // first and second players should be refunded, and the end result is one extra overthrow.
            describe("Handles overthrows within same block", function(){
                it("When refund works", async function(){
                    this.logInfo("This tests a case where three overthrows occur on the same block.");
                    this.logInfo("We ensure the first and second players are refunded.");
                    this.logInfo("Note: The weird gas amounts are due to a bug in Ganache.");
                    const fee = FEE.minus(PRIZE_INCR);
                    const prizeIncr = FEE.minus(fee);
                    const newPrize = (await game.prize()).plus(prizeIncr);
                    const newFees = (await game.fees()).plus(fee);
                    const newNumOverthrows = (await game.numOverthrows()).plus(1);
                    const newBlockEnded = testUtil.getNextBlockNumber().plus(REIGN_BLOCKS);
                    const FIRST_DECREE = "hello";
                    const SECOND_DECREE = "hello two";
                    const THIRD_DECREE = "hello three";

                    var tx1, tx2, tx3;
                    var tx1fee, tx2fee, tx3fee;
                    await createDefaultTxTester()
                        .startLedger([overthrower1, overthrower2, overthrower3, game])
                        .doFn(() => { testUtil.stopMining(); })
                        .doFn(() => { tx1 = game.overthrow(FIRST_DECREE, {from: overthrower1, value: FEE, gas: "200000"}); })
                        .wait(100)
                        .doFn(() => { tx2 = game.overthrow(SECOND_DECREE, {from: overthrower2, value: FEE, gas: "200001"}); })
                        .wait(100)
                        .doFn(() => { tx3 = game.overthrow(THIRD_DECREE, {from: overthrower3, value: FEE, gas: "200002"}); })
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
                        .print("")
                        .doTx(() => tx1, "First overthrow.")
                            .assertSuccess()
                            .assertOnlyLog('OverthrowOccurred', {
                                time: null,
                                newMonarch: overthrower1, 
                                prevMonarch: null,
                                fee: FEE
                            })
                            .assertGasUsedLt(38000)
                        .print("")
                        .doTx(() => tx2, "Second overthrow, refunds the first.")
                            .assertSuccess()
                            .assertLogCount(2)
                            .assertLog('OverthrowRefundSuccess', {
                                recipient: overthrower1,
                                msg: "Another overthrow occurred on the same block.",
                                amount: FEE
                            })
                            .assertLog('OverthrowOccurred', {
                                newMonarch: overthrower2,
                                prevMonarch: overthrower1,
                                fee: FEE
                            })
                            .assertGasUsedLt(48500)
                        .print("")
                        .doTx(() => tx3, "Third overthrow, refunds the second.")
                            .assertSuccess()
                            .assertLogCount(2)
                            .assertLog('OverthrowRefundSuccess', {
                                recipient: overthrower2,
                                msg: "Another overthrow occurred on the same block.",
                                amount: FEE
                            })
                            .assertLog('OverthrowOccurred', {
                                newMonarch: overthrower3,
                                prevMonarch: overthrower2,
                                fee: FEE
                            })
                            .assertGasUsedLt(48500)
                        .print("")
                            .assertCallReturns([game, 'prize'], newPrize, "is incremented only once")
                            .assertCallReturns([game, 'fees'], newFees, "is incremented only once")
                            .assertCallReturns([game, 'numOverthrows'], newNumOverthrows, "is incremented only once")
                            .assertCallReturns([game, 'blockEnded'], newBlockEnded, "is incremented only once")
                            .assertCallReturns([game, 'monarch'], overthrower3, "is last overthrower")
                            .assertCallReturns([game, 'decree'], isDecree(THIRD_DECREE), "is last decree")
                        .stopLedger()
                            .assertDelta(overthrower1, ()=>tx1fee.mul(-1), "lost txFee (but got refunded)")
                            .assertDelta(overthrower2, ()=>tx2fee.mul(-1), "lost txFee (but got refunded)")
                            .assertDelta(overthrower3, ()=>FEE.plus(tx3fee).mul(-1), "lost fee+txFee")
                            .assertDelta(game, FEE, "increased by only one fee")
                        .start();
                });
                // This is a case where two players enter same block, but the refund to the first fails.
                // In this case, there should be an OverthrowRefundFailed() event, and two overthrows should be counted.
                it("When refund fails", async function(){
                    this.logInfo("In this case, two overthrows occur in the same block.");
                    this.logInfo("However, the first player's fallback function fails or tries a gas DoS.");
                    this.logInfo("The first player's overthrow fee will be kept.");
                    this.logInfo("Note: The weird gas amounts are due to a bug in Ganache.");
                    const fee = FEE.minus(PRIZE_INCR);
                    const prizeIncr = FEE.minus(fee);
                    const newPrize = (await game.prize()).plus(prizeIncr.mul(2));
                    const newFees = (await game.fees()).plus(fee.mul(2));
                    const newNumOverthrows = (await game.numOverthrows()).plus(2);
                    const newBlockEnded = testUtil.getNextBlockNumber().plus(REIGN_BLOCKS);
                    const decree = "My Decree.";

                    var tx1, tx2;
                    var tx1fee, tx2fee;
                    await createDefaultTxTester()
                        .startLedger([maliciousPlayer, overthrower2, game])
                        .doFn(() => { testUtil.stopMining(); })
                        .doFn(() => { tx1 = maliciousPlayer.doOverthrow(game.address, {from: anon, gas: "200000"}); })
                        .wait(100)
                        .doFn(() => { tx2 = game.overthrow(decree, {from: overthrower2, value: FEE, gas: "200001"}); })
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
                        .doTx(() => tx1, "Malicious Player overthrows")
                            .assertSuccess()
                        .doTx(() => tx2, "Next overthrow, causes refund failure")
                            .assertSuccess()
                            .assertLogCount(2)
                            .assertLog('OverthrowRefundFailure', {
                                recipient: maliciousPlayer.address,
                                amount: FEE
                            })
                            .assertLog('OverthrowOccurred', {
                                newMonarch: overthrower2,
                                prevMonarch: maliciousPlayer.address,
                                fee: FEE
                            })
                            .assertGasUsedLt(51000)
                        .print("")
                            .assertCallReturns([game, 'prize'], newPrize, "is incremented twice")
                            .assertCallReturns([game, 'fees'], newFees, "is incremented twice")
                            .assertCallReturns([game, 'numOverthrows'], newNumOverthrows, "is incremented twice")
                            .assertCallReturns([game, 'blockEnded'], newBlockEnded, "is incremented only once")
                            .assertCallReturns([game, 'monarch'], overthrower2, "is second overthrower")
                            .assertCallReturns([game, 'decree'], isDecree(decree), "is second decree")
                        .stopLedger()
                            .assertDelta(maliciousPlayer, FEE.mul(-1), "lost fee")
                            .assertDelta(overthrower2, ()=>FEE.plus(tx2fee).mul(-1), "lost fee+txFee")
                            .assertDelta(game, FEE.mul(2), "increased by two fees")
                        .start();
                })
                
            });

            describe("Overthrowing from a contract", function(){
                it("Should work", async function(){
                    const fee = FEE.minus(PRIZE_INCR);
                    const prizeIncr = FEE.minus(fee);
                    const newPrize = (await game.prize()).plus(prizeIncr);
                    const newFees = (await game.fees()).plus(fee);
                    const newNumOverthrows = (await game.numOverthrows()).plus(1);
                    const newBlockEnded = testUtil.getNextBlockNumber().plus(REIGN_BLOCKS);

                    await createDefaultTxTester()
                        .startLedger([maliciousPlayer, game])
                        .startWatching([game])
                        .doTx(() => maliciousPlayer.doOverthrow(game.address, {from: anon}))
                            .assertSuccess()
                            .assertCallReturns([game, 'prize'], newPrize, "increased by prizeIncr")
                            .assertCallReturns([game, 'fees'], newFees, "increased by feeIncr")
                            .assertCallReturns([game, 'monarch'], maliciousPlayer.address, "is new monarch")
                            .assertCallReturns([game, 'numOverthrows'], newNumOverthrows, "increased by 1")
                            .assertCallReturns([game, 'blockEnded'], newBlockEnded, "increased by reignBlocks")
                        .stopLedger()
                            .assertDelta(game, FEE, "increased by FEE")
                            .assertDelta(maliciousPlayer, FEE.mul(-1), "lost FEE")
                        .stopWatching()
                            .assertOnlyEvent(game, 'OverthrowOccurred', {
                                time: null,
                                newMonarch: maliciousPlayer.address,
                                fee: FEE
                            })
                        .start();
                });
            });

            if (PRIZE_INCR.lt(0)) {
                describe("Cannot make prize negative", async function(){
                    it("Deplete the prize() to near 0", async function(){
                        const prize = await game.prize();
                        const numOverthrows = prize.div(PRIZE_INCR.mul(-1)).floor();
                        this.logInfo(`Prize should be depleted after ${numOverthrows} overthrows, and fail on next.`);
                        const players = [player1, player2];
                        for (var i=0; i<numOverthrows-1; i++) {
                            console.log(`Overthrow #${i+1} from player ${(i%2)+1}...`);
                            var player = players[i % 2];
                            await createDefaultTxTester()
                                .silence()
                                .doTx(()=>game.sendTransaction({from: player, value: FEE}))
                                .assertSuccess()
                                .assertOnlyLog("OverthrowOccurred")
                                .start();
                        }
                        this.logInfo("Overthrowing with maliciousPlayer so that it's the winner.");
                        await createDefaultTxTester()
                                .doTx(() => maliciousPlayer.doOverthrow(game.address, {from: anon}))
                                .assertSuccess()
                                .assertCallReturns([game, "monarch"], maliciousPlayer.address)
                                .start();    
                    });
                    it("Next overthrow should fail", async function(){
                        const curPrize = await game.prize();
                        this.logInfo(`${curPrize} prize remaining. Overthrowing now should fail.`);
                        const errMsg = "Overthrowing would result in a negative prize.";
                        await ensureNotOverthrowable(nonPlayer, FEE, errMsg);    
                    });
                });
            }

            describe("After all overthrows:", function(){
                before("Is not yet ended", async function(){
                    assert.isAbove((await game.getBlocksRemaining()).toNumber(), 0, "More than 0 blocks left");
                    assert.strEqual((await game.isEnded()), false, "Is not ended");
                })
                it("Should not allow prize to be paid", async function(){
                    await ensureNotPayable("The game has not ended.");
                });
                it("fastforward to make blocksRemaining() 0", async function(){
                    const numBlocks = (await game.getBlocksRemaining()).plus(1);
                    this.logInfo(`Mining ${numBlocks} blocks...`);
                    await testUtil.mineBlocks(numBlocks);
                    
                });
                it("should not accept overthrows", async function(){
                    await ensureNotOverthrowable(nonPlayer, FEE, "Game has already ended.");
                });
                it("should have correct state", async function(){
                    await createDefaultTxTester()
                        .assertCallReturns([game, "isEnded"], true)
                        .assertCallReturns([game, "getBlocksRemaining"], 0)
                        .start()
                })
            });

            describe(".sendPrize()", function(){
                before("game should be ended, and won by maliciousPlayer", async function(){
                    await createDefaultTxTester()
                        .assertCallReturns([game, "isEnded"], true)
                        .assertCallReturns([game, "getBlocksRemaining"], 0)
                        .assertCallReturns([game, "monarch"], maliciousPlayer.address)
                        .start();
                });
                describe("With limited gas", function(){
                    this.logInfo("The winner requires a ton of gas to pay for sending the prize.");
                    this.logInfo(".sendPrize(50000) only allots 50,000 gas to pay the winner, and should fail.");
                    it("tx should error", async function(){
                        const GAS_LIMIT = 50000;
                        const prize = await game.prize();
                        const monarch = await game.monarch();
                        const callParams = [game, "sendPrize", GAS_LIMIT, {from: nonPlayer}];
                        await createDefaultTxTester()
                            .assertCallReturns(callParams, [false, 0])
                            .startLedger([monarch, game, collector, nonPlayer])
                            .doTx(callParams)
                            .assertSuccess()
                            .assertOnlyLog("SendPrizeFailure", {
                                time: null,
                                redeemer: nonPlayer,
                                recipient: monarch,
                                amount: prize,
                                // gasLimit: GAS_LIMIT -- ganache bug reports this as += 2300.
                            })
                            .stopLedger()
                                .assertLostTxFee(nonPlayer)
                                .assertNoDelta(monarch)
                                .assertNoDelta(game)
                            .start();
                    })
                });
                describe("With unlimited gas", function(){
                    this.logInfo("If we call .sendPrize(0), however, it should work (and use a lot of gas)");
                    it("should pay to winner (callable by anyone)", async function(){
                        const prize = await game.prize();
                        const monarch = await game.monarch();
                        const callParams = [game, "sendPrize", 0, {from: nonPlayer}];
                        await createDefaultTxTester()
                            .assertCallReturns(callParams, [true, prize])
                            .startLedger([nonPlayer, monarch, game, collector])
                            .doTx(callParams)
                                .assertSuccess()
                                .assertOnlyLog("SendPrizeSuccess", {
                                    time: null,
                                    redeemer: nonPlayer,
                                    recipient: monarch,
                                    amount: prize,
                                    gasLimit: 0
                                })
                            .stopLedger()
                                .assertLostTxFee(nonPlayer)
                                .assertDelta(monarch, prize, "got prize")
                                .assertDelta(game, prize.mul(-1), "lost prize")
                                .assertDelta(collector, 0, "gets nothing")
                                .assertBalance(game, await game.fees(), "is only fees")
                            .assertGasUsedGt(50000)
                            .start();
                    });
                });
            });

            describe("After Paid:", function(){
                before(".isPaid() should be true", async function(){
                    assert.equal(await game.isPaid(), true);
                });
                it("should not be payable again", async function(){
                    await ensureNotPayable("The prize has already been paid.");
                });
                it("should not accept overthrows", async function(){
                    await ensureNotOverthrowable(nonPlayer, FEE, "Game has already ended.");
                });
                it("should allow remaining fees to be redeemed", async function(){
                    await ensureFeesSendable();
                });
                it("should now have zero balance", function(){
                    assert.strEqual(testUtil.getBalance(game), "0", "Zero balance");
                });
            });
        });

        // everything should increment and player should be new monarch
        async function ensureOverthrowable(player, decree) {
            decree = decree || "";
            const fee = FEE.minus(PRIZE_INCR);
            const prizeIncr = FEE.minus(fee);
            const newPrize = (await game.prize()).plus(prizeIncr);
            const newFees = (await game.fees()).plus(fee);
            const newNumOverthrows = (await game.numOverthrows()).plus(1);
            const newTotalFees = newNumOverthrows.mul(fee);
            const newBlockEnded = testUtil.getNextBlockNumber().plus(REIGN_BLOCKS);
            const prevMonarch = await game.monarch();

            await createDefaultTxTester()
                .startLedger([player, game])
                .doTx(() => game.overthrow(web3.fromUtf8(decree), {from: player, value: FEE}))
                .stopLedger()
                    .assertDelta(game, FEE, "increased by fee")
                    .assertDeltaMinusTxFee(player, FEE.mul(-1), "decreased by FEE and txFee")
                .assertSuccess()
                    .assertOnlyLog('OverthrowOccurred', {
                        time: null,
                        newMonarch: player,
                        prevMonarch: prevMonarch,
                        fee: FEE
                    })
                .assertGasUsedLt(38000)
                    .assertCallReturns([game, 'numOverthrows'], newNumOverthrows, "increased by 1")
                    .assertCallReturns([game, 'totalFees'], newTotalFees)
                    .assertCallReturns([game, 'decree'], isDecree(decree))
                    .assertCallReturns([game, 'prize'], newPrize, "increased by prizeIncr")
                    .assertCallReturns([game, 'fees'], newFees, "increased by feeIncr")
                    .assertCallReturns([game, 'monarch'], player, "is new monarch")
                    .assertCallReturns([game, 'blockEnded'], newBlockEnded, "increased by reignBlocks")
                    .assertCallReturns([game, 'getBlocksRemaining'], await game.reignBlocks())
                .start();
        }
        // makes sure the user cannot overthrow.
        // they should be refunded and the state of the game shouldn't change.
        async function ensureNotOverthrowable(player, feeAmt, errorMsg){
            const prevPrize = await game.prize();
            const prevFees = await game.fees();
            const prevNumOverthrows = await game.numOverthrows();
            const prevBlockEnded = await game.blockEnded();
            const prevDecree = web3.toUtf8(await game.decree());
            return createDefaultTxTester()
                .startLedger([player, game])
                .doTx(() => game.overthrow("Some decree", {from: player, value: feeAmt}))
                .assertSuccess()
                    .assertOnlyLog("OverthrowRefundSuccess", {msg: errorMsg, recipient: player})
                    .assertCallReturns([game, 'prize'], prevPrize, 'not incremented')
                    .assertCallReturns([game, 'fees'], prevFees, 'not incremented')
                    .assertCallReturns([game, 'numOverthrows'], prevNumOverthrows, 'not incremented')
                    .assertCallReturns([game, 'blockEnded'], prevBlockEnded, 'not incremented')
                    .assertCallReturns([game, 'decree'], isDecree(prevDecree))
                .stopLedger()
                    .assertLostTxFee(player)
                    .assertNoDelta(game)
                .assertGasUsedLt(36000)
                .start();
        }
        // fees should be transferred to collected, then set to 0
        async function ensureFeesSendable() {
            if (PRIZE_INCR.equals(FEE)){
                console.log("With these parameters, no fees will ever be accrued. Skipping.");
                return;
            }

            const expectedFees = await game.fees();
            const prize = await game.isPaid()
                ? 0
                : await game.prize();
            const callParams = [game, 'sendFees', {from: anon}];
            
            return createDefaultTxTester()
                .assertCallReturns(callParams, expectedFees)
                .startLedger([collector, game, anon])
                .doTx(callParams)
                .assertSuccess()
                    .assertCallReturns([game, 'fees'], 0, 'should be zero')
                    .assertOnlyLog("FeesSent", {time: null, amount: null})
                .stopLedger()
                    .assertDelta(collector, expectedFees, 'got fees')
                    .assertDelta(game, expectedFees.mul(-1), 'lost fees')
                    .assertLostTxFee(anon)
                    .assertBalance(game, prize, `should be the prize (${prize})`)
                .start();
        }
        // game should not be able to be paid to winner
        async function ensureNotPayable(errorMsg) {
            // test that call returns (false, 0)
            const callParams = [game, "sendPrize", false, {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [false, 0])
                .startLedger([game, anon])
                .doTx(callParams)
                .assertSuccess()
                    .assertOnlyLog("SendPrizeError", {msg: errorMsg})
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(game)
                .start();
        }
        function isDecree(decree) {
            return {
                custom: (v) => web3.toUtf8(v) == decree
            };
        }
    });
}
