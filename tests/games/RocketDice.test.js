const Registry = artifacts.require("Registry");
const RocketDice = artifacts.require("RocketDice");
const MaliciousRoller = artifacts.require("MaliciousRoller");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const BankrollableUtils = require("../helpers/BankrollableUtils.js").Create(web3, createDefaultTxTester);

describe('RocketDice', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[1];
    const player1 = accounts[2];
    const player2 = accounts[3];
    const player3 = accounts[4];
    const dummyTreasury = accounts[5];
    const admin = accounts[6];
    const anon = accounts[7];
    var dice;
    var registry;
    var maliciousRoller;

    const MIN_BET = new BigNumber(1e9);
    const MAX_BET = new BigNumber(.3e18);
    const MIN_MULTIPLE = new BigNumber(101);	// 1.01 x
    const MAX_MULTIPLE = new BigNumber(50000);  // 500  x
    const FEE_BIPS = new BigNumber(125);

    before("Set up Registry and RocketDice.", async function(){
        const addresses = {
            owner: owner,
            player1: player1, 
            player2: player2,
            player3: player3,
            dummyTreasury: dummyTreasury,
            admin: admin,
            anon: anon,
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a Registry, with ADMIN and TREASURY set.");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                registry = res.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register", "ADMIN", admin, {from: owner}])
            .assertSuccess().start();
        await createDefaultTxTester()
            .doTx([registry, "register","TREASURY", dummyTreasury, {from: owner}])
            .assertSuccess().start();

        this.logInfo("Create the dice contract that we will be testing.");
        await createDefaultTxTester()
            .doNewTx(RocketDice, [registry.address], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                dice = res.contract;
                plugins.addAddresses({dice: dice.address});
            }).start();

        this.logInfo("Create instance of MaliciousRoller to be used later");
        await createDefaultTxTester()
            .doNewTx(MaliciousRoller, [], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                maliciousRoller = res.contract;
                plugins.addAddresses({maliciousRoller: maliciousRoller.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Funding", function(){
        it("Anyone can add funding", function(){
            return BankrollableUtils.assertAddsBankroll(dice, anon, .5e18);
        });
        it("curMaxBet is correct", function(){
            return assertCurMaxBet();
        });
    });

    describe(".changeSettings()", function(){
        it("is not callable from anon", function(){
            return createDefaultTxTester()
                .doTx([dice, "changeSettings", MIN_BET, MAX_BET, MIN_MULTIPLE, MAX_MULTIPLE, FEE_BIPS, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("works from admin", function(){
            this.logInfo(`Admin can change minBet, maxBet, minMultiple, maxMultiple, and feeBips`);
            return createDefaultTxTester()
                .doTx([dice, "changeSettings", MIN_BET, MAX_BET, MIN_MULTIPLE, MAX_MULTIPLE, FEE_BIPS, {from: admin}])
                .assertSuccess()
                .assertOnlyLog("SettingsChanged", {
                    time: null,
                    admin: admin
                })
                .assertCallReturns([dice, "minBet"], MIN_BET)
                .assertCallReturns([dice, "maxBet"], MAX_BET)
                .assertCallReturns([dice, "minMultiple"], MIN_MULTIPLE)
                .assertCallReturns([dice, "maxMultiple"], MAX_MULTIPLE)
                .assertCallReturns([dice, "feeBips"], FEE_BIPS)
                .start();
        });
    });

    describe("Rolling restrictions", async function(){
        const minBet = await dice.minBet();
        const maxBet = await dice.maxBet();
        const minMultiple = await dice.minMultiple();
        const maxMultiple = await dice.maxMultiple();
        it("Cannot roll tiny amount", function(){
            return assertRollRefunded(player1, minBet.minus(1), minMultiple, "Bet too small.");
        });
        it("Cannot roll huge amount", function(){
            return assertRollRefunded(player1, maxBet.plus(1), minMultiple, "Bet too large.");
        });
        it("Cannot roll with number too small", function(){
            return assertRollRefunded(player1, minBet, minMultiple.minus(1), "Roll multiple too small.");
        });
        it("Cannot roll with number too large", function(){
            return assertRollRefunded(player1, minBet, maxMultiple.plus(1), "Roll multiple too large.");
        });

        describe("Rejects rolls when balance is too small", function(){
            it("Reduce bankroll to small amount", async function(){
                this.logInfo(`Remove bankroll so that balance is very small.`);
                const bankroll = await dice.bankroll();
                await BankrollableUtils.assertRemovesBankroll(dice, anon, bankroll.minus(1));
            });
            it("Should not allow a bet", async function(){
                this.logInfo(`Player should not be able to place a wager, due to low balance.`);
                return assertRollRefunded(player1, MAX_BET, MAX_MULTIPLE, "May be unable to payout on a win.");
            });
            it("Restores bankroll", async function(){
                this.logInfo("Add a lot of bankroll back.");
                return BankrollableUtils.assertAddsBankroll(dice, anon, 1e18);
            });
        });
    });

    describe.skip("RNG works correctly", function(){
    	const results = [];
    	const NUM_TRIES = 1000;
    	const TEST_BLOCK = testUtil.getBlockNumber() - 1;
    	[0,200].forEach(FEE_BIPS => {
    		describe(`With feeBips of ${FEE_BIPS}`, function(){
	    		it(`Get back ${NUM_TRIES} random results`, async function(){
		    		for (var i=0; i<NUM_TRIES; i++){
		    			results.push((await dice.computeMultiple(TEST_BLOCK, i, FEE_BIPS)).toNumber());
		    		}
		    	});
		    	it("Check that results match locally", async function(){
		    		const blockHash = (await testUtil.getBlock(TEST_BLOCK)).hash;
		    		results.forEach((remote, i)=>{
		    			const local = computeMultiple(blockHash, i, FEE_BIPS);
		    			if (!local.equals(remote)) {
		    				computeMultiple(blockHash, i, FEE_BIPS, true);
		    				throw new Error(`Blockhash: ${blockHash}, id: ${i}, local: ${local}, remote: ${remote}`);
		    			}
		    		});
		    	});
		    	it("Check distribution", function(){
		    		[.75, .5, .25, .1, .075, .05, .025, .01].forEach(pctl => {
		    			const expCount = pctl * NUM_TRIES;
		    			const expResult = 100 / pctl;
		    			const count = results.filter(x => x >= expResult).length;
		    			const countPct = (100 * count / NUM_TRIES).toFixed(2);
		    			const expCountPct = (100 * expCount / NUM_TRIES).toFixed(2);
		    			const expResultStr = (expResult/100).toFixed(2);
		    			console.log(`${countPct}% are >= ${expResultStr}x, (expected: ${expCountPct}%)`);
		    		});
		    	});
	    	});
    	})
    });

    describe("Rolling", function(){
        it("Player 1 can roll", async function(){
            await assertCanRoll(player1, MIN_BET, 200);
        });
        it("Player 1 can roll again", async function(){
            await assertCanRoll(player1, MIN_BET, 200);
        });
        it("Player 1 can roll again", async function(){
            await assertCanRoll(player1, MIN_BET, 200);
        });
        it("Player 2 can roll", async function(){
            await assertCanRoll(player2, MIN_BET.plus(1e9), 200);
        });
        it("Player 3 can roll", async function(){
            await assertCanRoll(player3, MIN_BET.plus(2e9), 200);
        });
        it("Player 2 can roll again", async function(){
            await assertCanRoll(player2, MIN_BET.plus(1e9), 200);
        });
        it("Player 3 can roll again", async function(){
            await assertCanRoll(player3, MIN_BET.plus(2e9), 200);
        });
    });

    // This causes ganache to die. Need to test this manually.
    describe("Rolls on same block", async function(){
        this.logInfo("This attempts to roll for a player twice in the same block.");
        this.logInfo("The second roll should be refunded.");
        // this will become an array of promises.
        const txDefs = [
            [MIN_BET, 500, player2],
            [MIN_BET, 1000, player2]
        ];
        const txs = [];
        
		const expFeeBips = await dice.feeBips();
    	const expBet = txDefs[0][0];
    	const expMultiple = txDefs[0][1];
        const expNumRolls = (await dice.numRolls()).plus(1);
        const expTotalWagered = (await dice.totalWagered()).plus(expBet);
        var expBlock;

        it("Roll many times on the same block", async function(){
            const tester = createDefaultTxTester()
                .startLedger([dice, player1, player2, player3])
                .doFn(() => {
                    testUtil.stopMining();
                    console.log(`Stopped mining.`);
                })
                .wait(1000);

            txDefs.forEach((tx, i) => {
                tester.doFn(() => {
                    // Ganache bug: increment gas each time, so that it generates unique tx id
                    txs[i] = dice.roll(tx[1], {value: tx[0], from: tx[2], gas: 100000+i});
                    console.log(`Submitted transaction for roll ${i+1}.`);
                }).wait(100);
            });
                
            return tester
                .doFn(() => {
                    console.log("Mining block now...");
                    testUtil.mineBlocks(1);
                    testUtil.startMining();
                    return Promise.all(txs).then((txResArr) => {
                        testUtil.fixTxArray(txs, txResArr);
                        expBlock = txResArr[0].receipt.blockNumber;
                    });
                }).start();
        });

        it("First roll wagered, second roll refunded.", async function(){
            const player = txDefs[0][2];
            const user = await getUser(player);

            return createDefaultTxTester()
                .doTx(txs[0], "First Roll")
                .assertSuccess()
                .assertLog("RollWagered", {
                    time: null,
                    user: player,
                    bet: txDefs[0][0],
                    multiple: expMultiple,
                    feeBips: expFeeBips
                })
                .doTx(txs[1], "Second Roll")
                .assertSuccess()
                .assertLog("RollRefunded", {
                    time: null,
                    user: player,
                    msg: "Only one bet per block allowed.",
                    bet: txDefs[1][0],
                    multiple: txDefs[1][1]
                })
                .assertCallReturns([dice, "users", player], [
                    null, expNumRolls, expBlock, expBet, expMultiple, expFeeBips
                ])
                .assertCallReturns([dice, "numRolls"], expNumRolls)
                .assertCallReturns([dice, "totalWagered"], expTotalWagered)
                .start();
        });
    });

    describe("Player can roll on next block.", function(){
        it("Player 2 can roll", async function(){
            await assertCanRoll(player2, MIN_BET, 400);
        });
    });

    // This causes ganache to die. Need to test this manually.
    describe("Roll and payout on same block", async function(){
        this.logInfo("This attempts to roll for a player, and then immediately payout.");
        this.logInfo("The payout should error.");

        const PLAYER = player1;
        const BET = MIN_BET.plus(12345);
        const MULTIPLE = MIN_MULTIPLE;

        const txs = [];
        const expNumRolls = (await dice.numRolls()).plus(1);
        const expTotalWagered = (await dice.totalWagered()).plus(BET);
        const expFeeBips = await dice.feeBips();
        var expBlock;

        it("Roll and then attempt payout in same block.", async function(){
            return createDefaultTxTester()
                .doFn(() => {
                    testUtil.stopMining();
                    console.log(`Stopped mining.`);
                })
                .wait(100)
                .doFn(()=>{
                    txs[0] = dice.roll(MULTIPLE, {value: BET, from: PLAYER, gas: 100000});
                    console.log(`Submitted first tx: dice.roll()`)
                }).wait(100)
                .doFn(()=>{
                    txs[1] = dice.payoutPreviousRoll({from: PLAYER, gas: 100001});
                    console.log(`Submitted second tx: dice.payoutPreviousRoll()`);
                }).wait(100)
                .doFn(() => {
                    console.log("Mining block now...");
                    testUtil.mineBlocks(1);
                    testUtil.startMining();
                    return Promise.all(txs).then((txResArr) => {
                        testUtil.fixTxArray(txs, txResArr);
                        expBlock = txResArr[0].receipt.blockNumber;
                    });
                }).start();
        });

        it("First roll wagered, payoutPreviousRoll() errored.", async function(){
            const user = await getUser(PLAYER);
            return createDefaultTxTester()
                .doTx(txs[0], "roll()")
                .assertSuccess()
                .assertLog("RollWagered", {
                    time: null,
                    user: PLAYER,
                    bet: BET,
                    multiple: MULTIPLE,
                    feeBips: expFeeBips
                })
                .doTx(txs[1], "payoutPreviousRoll()")
                .assertSuccess()
                .assertLog("PayoutError", {
                    time: null,
                    msg: "Cannot payout roll on the same block"
                })
                .assertCallReturns([dice, "users", PLAYER], [
                    null, expNumRolls, expBlock, BET, MULTIPLE, expFeeBips
                ])
                .assertCallReturns([dice, "numRolls"], expNumRolls)
                .assertCallReturns([dice, "totalWagered"], expTotalWagered)
                .start();
        });
    });

    describe(".payoutPreviousRoll()", function(){
        it("Works correctly", function(){
            return assertCanPayoutRoll(player1);
        });
        it("Fails if called again", function(){
            return assertCannotPayoutRoll(player1, "No roll to pay out.");
        });
    });

    describe("Test when payment fails", function(){
        before("Fund malicious roller", async function(){
            await maliciousRoller.fund({value: MIN_BET.mul(10), from: anon});
        });
        it("MaliciousRoller rolls with high win odds", async function(){
        	const expFeeBips = await dice.feeBips();
            return createDefaultTxTester()
                .startWatching([dice])
                .doTx([maliciousRoller, "rollRocketDice", dice.address, MIN_MULTIPLE, MIN_BET, {from: anon}])
                .assertSuccess()
                .stopWatching()
                    .assertOnlyEvent(dice, "RollWagered", {
                        time: null,
                        user: maliciousRoller.address,
                        bet: MIN_BET,
                        multiple: MIN_MULTIPLE,
                        feeBips: expFeeBips
                    })
                .start();
        });
        it("Next roll fails because could not be paid", async function(){
            return createDefaultTxTester()
                .doTx([maliciousRoller, "rollRocketDice", dice.address, MIN_MULTIPLE, MIN_BET, {from: anon, gas: 70000}])
                .assertInvalidOpCode()
                .start();
        });
        it(".payoutPreviousRoll() fails because could not pay", async function(){
            return createDefaultTxTester()
                .doTx([maliciousRoller, "payoutRocketDice", dice.address, {from: anon, gas: 70000}])
                .assertInvalidOpCode()
                .start();
        });
        it(".payoutPreviousRoll works with high gas", async function(){
            const user = await getUser(maliciousRoller.address);
            const expPayout = user.rollBet.mul(MIN_MULTIPLE).div(100).floor();
            return createDefaultTxTester()
                .startWatching([dice])
                .startLedger([dice, maliciousRoller])
                .doTx([maliciousRoller, "payoutRocketDice", dice.address, {from: anon, gas: 500000}])
                .assertSuccess()
                .stopWatching()
                    .assertOnlyEvent(dice, "RollFinalized", {
                        time: null,
                        id: user.rollId,
                        user: maliciousRoller.address,
                        result: null,
                        payout: expPayout
                    })
                .stopLedger()
                    .assertDelta(dice, expPayout.mul(-1))
                    .assertDelta(maliciousRoller, expPayout)
                .assertCallReturns([dice, "users", maliciousRoller.address], [
                    null, 0, 0, 0, 0, 0
                ])
                .start();
        });
    });

    describe("Taking profits", function(){
        it("Try to generate a profit", async function(){
            this.logInfo(`Depending on the above rolls, may or may not have a profit.`);
            var profits = await dice.profits();
            const balance = await testUtil.getBalance(dice.address);
            if (profits.gt(0)) {
                this.logInfo(`InstaDice has profits of: ${profits}.`);
                return;
            }
            this.logInfo(`InstaDice has no profits. Will try to get some.`);
            this.logInfo(`Now betting a large amount with small odds...`);
            const curMaxBet = await dice.effectiveMaxBet();
            await createDefaultTxTester()
                .doTx([dice, "roll", MAX_MULTIPLE, {from: player1, value: curMaxBet}])
                .assertSuccess()
                .assertLog("RollWagered")
                .doTx([dice, "roll", MAX_MULTIPLE, {from: player1, value: curMaxBet}])
                .assertSuccess()
                .assertLog("RollWagered")
                .start();

            profits = await dice.profits();
            if (profits.gt(0)) {
                this.logInfo(`Now it has profits of ${profits}.`);
            } else {
                throw new Error(`Failed to generate a profits... try test again.`);
            }
        });
        it("Collects profits", async function(){
            return BankrollableUtils.assertSendsProfits(dice, anon);
        });
    });

    async function getExpectedProfits() {
        const funding = await dice.funding();
        const balance = await testUtil.getBalance(dice.address);
        return balance.gt(funding)
            ? balance.minus(funding)
            : 0;
    }

    async function assertCurMaxBet(){
        const bankroll = await dice.bankrollAvailable();
        const maxMultiple = await dice.maxMultiple();
        const expCurMaxBet = bankroll.div(maxMultiple.mul(2).div(100));
        return createDefaultTxTester()
            .assertCallReturns([dice, "curMaxBet"], expCurMaxBet)
            .start();
    }

    async function assertCanRoll(player, bet, multiple) {
        bet = new BigNumber(bet);
        multiple = new BigNumber(multiple);
        
        const expFeeBips = await dice.feeBips();
        const user = await getUser(player);
        const expId = (await dice.numRolls()).plus(1);
        const expBlock = testUtil.getBlockNumber() + 1;
        const expTotalWagered = (await dice.totalWagered()).plus(bet);
        var expNumUsers = await dice.numUsers();
        var expGasUsed = new BigNumber(36000);
        var expUserId = user.userId;
        
        if (user.userId.equals(0)) {
            expGasUsed = expGasUsed.plus(20000);
            expNumUsers = expNumUsers.plus(1);
            expUserId = expNumUsers;
            console.log(`This roll should assign userId ${expUserId} to the bettor.`);
        } else {
            console.log(`This bettor has user id of ${expUserId}.`);
        }

        var expLogs = [["RollWagered", {
            id: expId,
            user: player,
            bet: bet,
            multiple: multiple,
            feeBips: expFeeBips
        }]];
        // var expFinalizeId = await dice.finalizeId();
        var expTotalWon = await dice.totalWon();
        var expPlayerWinnings = new BigNumber(0);
        var expPayouts = new BigNumber(0);

        // Determines what will get finalized, and updates
        //  the expectations based on that.
        async function simulateFinalizePrevious() {
            console.log(`=== Simluating finalization of previous roll ===`);
            const user = await getUser(player);
            const id = user.rollId;

            if (user.rollId.equals(0)) {
                console.log(`Roll #${id}: Does not exist. Will do nothing.`);
                // expGasUsed = expGasUsed.plus(1000);
                return false;
            }

            // See what the results of roll will be.
            const blockHash = (await testUtil.getBlock(user.rollBlock)).hash;
            const result = computeMultiple(blockHash, id, user.rollFeeBips);
            const payout = result.gte(user.rollMultiple)
                ? user.rollBet.mul(user.rollMultiple).div(100).floor()
                : new BigNumber(0);

            // Update expected stuff if they won
            if (payout.gt(0)) {
                console.log(`Roll #${id}: Should finalize as WIN with roll of ${result}x >= ${user.rollMultiple}x.`);
                console.log(`Will expect to see correct deltas and PayoutSuccess log.`);
                expTotalWon = expTotalWon.plus(payout);
                expPlayerWinnings = expPlayerWinnings.plus(payout);
                expPayouts = expPayouts.plus(payout);
                expGasUsed = expGasUsed.plus(16000);
            } else {
                console.log(`Roll #${id}: Should finalize as LOSS with roll of ${result}x < ${user.rollMultiple}x.`);
                expGasUsed = expGasUsed.plus(9000);
            }

            // Update expected logs
            expLogs.push(["RollFinalized", {
                time: null,
                id: id,
                user: player,
                result: result,
                payout: payout
            }]);
            console.log(`Will expect correct RollFinalized log for roll #${id}.`);
        }

        // Simulate finalizing next stuff.
        console.log("");
        await simulateFinalizePrevious();
        console.log("");

        // Do TX, assert proper deltas and logs
        var blockNumber;
        const txTester = createDefaultTxTester()
            .startLedger([player, dice])
            .doTx([dice, "roll", multiple, {value: bet, from: player}])
                .assertSuccess()
            .doFn(async function(ctx){
                blockNumber = ctx.txRes.receipt.blockNumber
                await testUtil.mineBlocks(1);
            })
            .assertLogCount(expLogs.length)

        expLogs.forEach((arr) => {
            txTester.assertLog(arr[0], arr[1])
        });

        // Assert calls are accurate
        txTester
            .stopLedger()
                .assertDelta(dice, bet.minus(expPayouts))
                .assertDeltaMinusTxFee(player, bet.mul(-1).plus(expPlayerWinnings))
            .assertCallReturns([dice, "users", player], ()=>[
                expUserId, expId, blockNumber, bet, multiple, expFeeBips
            ])
            .assertCallReturns([dice, "numRolls"], expId)
            .assertCallReturns([dice, "totalWagered"], expTotalWagered)
            .assertCallReturns([dice, "totalWon"], expTotalWon)
            .assertGasUsedLt(expGasUsed)
            

        // Assert this roll has expected result.
        var expResult;
        return txTester
            .doFn(async function(ctx){
                const blockHash = ctx.txRes.receipt.blockHash;
                expResult = computeMultiple(blockHash, expId, expFeeBips);
                console.log("");
                const winStr = expResult.gte(multiple) ? "win" : "lose";
                console.log(`This roll should ${winStr} with a result of ${expResult}x.`);
            })
            .assertCallReturns(()=>[dice, "computeMultiple", blockNumber, expId, expFeeBips], ()=>expResult)
            .start();
    }

    async function assertCanPayoutRoll(player) {
        const user = await getUser(player);
        if (user.rollBlock.equals(0)) {
            throw new Error(`Expected user's roll data to exist.`);
        }

        const prevTotalWon = await dice.totalWon();
        const blockHash = (await testUtil.getBlock(user.rollBlock)).hash;
        const expResult = computeMultiple(blockHash, user.rollId, user.rollFeeBips);
        const expPayout = expResult.gte(user.rollMultiple)
            ? user.rollBet.mul(user.rollMultiple).div(100).floor()
            : new BigNumber(0);
        if (expPayout.gt(0)){
            console.log(`Previous roll WON with ${expResult}x >= ${user.rollMultiple}x. Should win ${expPayout}`);
        } else {
            console.log(`Previous roll LOST with ${expResult}x < ${user.rollMultiple}. Should win 0.`);
        }
        console.log(``);

        return createDefaultTxTester()
            .startLedger([dice, player])
            .doTx([dice, "payoutPreviousRoll", {from: player}])
            .assertSuccess()
            .assertOnlyLog("RollFinalized", {
                time: null,
                id: user.rollId,
                user: player,
                result: expResult,
                payout: expPayout
            })
            .stopLedger()
                .assertDelta(dice, expPayout.mul(-1))
                .assertDeltaMinusTxFee(player, expPayout)
            .assertCallReturns([dice, "users", player], [null, 0, 0, 0, 0, 0])
            .assertCallReturns([dice, "totalWon"], prevTotalWon.plus(expPayout))
            .assertGasUsedLt(45500)
            .start();
    }

    async function assertCannotPayoutRoll(player, msg) {
        return createDefaultTxTester()
            .startLedger([dice, player])
            .doTx([dice, "payoutPreviousRoll", {from: player}])
            .assertSuccess()
            .assertOnlyLog("PayoutError", {
                time: null,
                msg: "No roll to pay out."
            })
            .stopLedger()
                .assertDelta(dice, 0)
                .assertLostTxFee(player)
            .start();
    }

    async function assertRollRefunded(player, bet, multiple, msg) {
        const curNumRolls = await dice.numRolls();
        return createDefaultTxTester()
            .startLedger([dice, player])
            .doTx([dice, "roll", multiple, {value: bet, from: player}])
            .assertSuccess()
                .assertOnlyLog("RollRefunded", {
                    time: null,
                    user: player,
                    msg: msg,
                    bet: bet,
                    multiple: multiple
                })
            .stopLedger()
                .assertNoDelta(dice)
                .assertLostTxFee(player)
            .assertCallReturns([dice, "numRolls"], curNumRolls)
            .start();
    }

    async function getUser(addr) {
        const arr = await dice.users(addr);
        return {
            userId: arr[0],
            rollId: arr[1],
            rollBlock: arr[2],
            rollBet: arr[3],
            rollMultiple: arr[4],
            rollFeeBips: arr[5],
            toArray: function(){
                return arr;
            }
        };
    }

    function computeMultiple(blockHash, id, feeBips, verbose) {
        function toPaddedHex(num, bits) {
            num = new BigNumber(num);
            const targetLen = Math.ceil(bits / 4);
            const hexStr = num.toString(16);
            if (hexStr.length > targetLen)
                throw new Error(`Cannot convert ${num} to ${bits}... it's too large.`);
            const zeroes = (new Array(targetLen-hexStr.length+1)).join("0");
            return `${zeroes}${hexStr}`;
        }
        const idHex = toPaddedHex(id, 32);
        const hash = web3.sha3(blockHash + idHex, {encoding: "hex"});

        // compute random multiple
        const maxRand = new BigNumber(1000000);
        const rand = (new BigNumber(hash)).mod(maxRand).plus(1);
        return maxRand.mul(100).mul(1e12).mul(10000 - feeBips)
        	.div(rand.mul(1e12).mul(10000))
        	.floor();
    }
});

