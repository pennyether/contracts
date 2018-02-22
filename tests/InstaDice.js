const Registry = artifacts.require("Registry");
const InstaDice = artifacts.require("InstaDice");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

var FEE_BIPS = 100;   // 1%

describe('InstaDice', function(){
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

    const MIN_BET = new BigNumber(1e9);
    const MAX_BET = new BigNumber(.6e18);
    const MIN_NUMBER = new BigNumber(5);
    const MAX_NUMBER = new BigNumber(99);
    const FEE_BIPS = new BigNumber(125);

    before("Set up Registry and InstaDice.", async function(){
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
            .doNewTx(InstaDice, [registry.address], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                dice = res.contract;
                plugins.addAddresses({dice: dice.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Funding", function(){
        describe(".addFunding()", function(){
            it("Anyone can add funding", function(){
                return assertAddsFunding(.5e18);
            });
        })
        
        describe(".removeFunding()", function(){
            it("Anon cannot remove funding", function(){
                return createDefaultTxTester()
                    .doTx([dice, "removeFunding", .1e18, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works for admin", function(){
                return assertRemovesFunding(.1e18)
            });
            describe("Removes all funding when passed large number", function(){
                it("remove all funding", function(){
                    return assertRemovesFunding(10e18);  
                });
                it("Add some funding back", function(){
                    return assertAddsFunding(.5e18);    
                });
            });
        });
    });

    describe(".changeSettings()", function(){
        it("is not callable from anon", function(){
            return createDefaultTxTester()
                .doTx([dice, "changeSettings", MIN_BET, MAX_BET, MIN_NUMBER, MAX_NUMBER, FEE_BIPS, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("works from admin", function(){
            this.logInfo(`Admin can change minBet, maxBet, minNumber, maxNumber, and feeBips`);
            return createDefaultTxTester()
                .doTx([dice, "changeSettings", MIN_BET, MAX_BET, MIN_NUMBER, MAX_NUMBER, FEE_BIPS, {from: admin}])
                .assertSuccess()
                .assertOnlyLog("SettingsChanged", {
                    time: null,
                    sender: admin
                })
                .assertCallReturns([dice, "minBet"], MIN_BET)
                .assertCallReturns([dice, "maxBet"], MAX_BET)
                .assertCallReturns([dice, "minNumber"], MIN_NUMBER)
                .assertCallReturns([dice, "maxNumber"], MAX_NUMBER)
                .assertCallReturns([dice, "feeBips"], FEE_BIPS)
                .start();
        });
    });

    describe("Rolling", function(){
        describe("Restrictions", async function(){
            const minBet = await dice.minBet();
            const maxBet = await dice.maxBet();
            const minNumber = await dice.minNumber();
            const maxNumber = await dice.maxNumber();
            it("Cannot roll tiny amount", function(){
                return assertRollRefunded(player1, minBet.minus(1), 50, "Bet too small.");
            });
            it("Cannot roll huge amount", function(){
                return assertRollRefunded(player1, maxBet.plus(1), 50, "Bet too large.");
            });
            it("Cannot roll with number too small", function(){
                return assertRollRefunded(player1, minBet, minNumber.minus(1), "Roll number too small.");
            });
            it("Cannot roll with number too large", function(){
                return assertRollRefunded(player1, minBet, maxNumber.plus(1), "Roll number too large.");
            });
        });
        describe("Rolling...", function(){
            it("Player 1 can roll", async function(){
                await assertCanRoll(player1, MIN_BET, 50);
            });
            it("Player 1 can roll again", async function(){
                await assertCanRoll(player1, MIN_BET, 50);
            });
            it("Player 1 can roll again", async function(){
                await assertCanRoll(player1, MIN_BET, 50);
            });
            it("Player 2 can roll", async function(){
                await assertCanRoll(player2, MIN_BET.plus(1e9), 50);
            });
            it("Player 3 can roll", async function(){
                await assertCanRoll(player3, MIN_BET.plus(2e9), 50);
            });
        });
        describe("Rejects rolls when balance is too small", function(){
            it("Reduce funding to small amount", async function(){
                this.logInfo(`Remove funding so that balance is very small.`);
                const funding = await dice.funding();
                await assertRemovesFunding(funding.minus(1));
            });
            it("Should not allow a bet", async function(){
                this.logInfo(`Player should not be able to place a wager, due to low balance.`);
                return assertRollRefunded(player1, MAX_BET, MIN_NUMBER, "May be unable to payout on a win.");
            });
            it("Restores funding", async function(){
                // Add enough to take a MIN_BET with Roll Number 5, for below test.
                return assertAddsFunding(MIN_BET.mul(20).mul(11));
            })
        });
    });

    describe("Taking profits", function(){
        it("Try to generate a profit", async function(){
            this.logInfo(`Depending on the above rolls, may or may not have a profit.`);
            var profits = await dice.getProfits();
            const funding = await dice.funding();
            const balance = await testUtil.getBalance(dice.address);
            if (profits.gt(0)) {
                this.logInfo(`InstaDice has profits of: ${profits}.`);
                return;
            }
            this.logInfo(`InstaDice has no profits. Will try to get some.`);
            this.logInfo(`Now betting a large amount with small odds...`);
            await createDefaultTxTester()
                .doTx([dice, "roll", MIN_NUMBER, {from: player1, value: MIN_BET.mul(5)}])
                .assertSuccess()
                .assertLog("RollWagered")
                .doTx([dice, "roll", MIN_NUMBER, {from: player1, value: MIN_BET}])
                .assertSuccess()
                .assertLog("RollWagered")
                .start();

            profits = await dice.getProfits();
            if (profits.gt(0)) {
                this.logInfo(`Now it has profits of ${profits}.`);
            } else {
                throw new Error(`Failed to generate a profits... try test again.`);
            }
        });
        it("Collects profits", async function(){
            this.logInfo(`Should collect the difference between balance and funding.`);
            const expProfits = await dice.getProfits();
            const balance = await testUtil.getBalance(dice.address);
            const funding = await dice.funding();
            this.logInfo(`Balance: ${balance}, Funding: ${funding}, Profits: ${expProfits}`);
            assert(balance.gt(funding), "For test to run, balance must be > funding");

            return createDefaultTxTester()
                .startLedger([dice, dummyTreasury, anon])
                .doTx([dice, "sendProfits", {from: anon}])
                .assertSuccess()
                .stopLedger()
                    .assertDelta(dice, expProfits.mul(-1))
                    .assertDelta(dummyTreasury, expProfits)
                    .assertLostTxFee(anon)
                .assertOnlyLog("ProfitsSent", {
                    time: null,
                    recipient: dummyTreasury,
                    amount: expProfits,
                    funding: funding,
                })
                .assertCallReturns([dice, "funding"], funding)
                .start();
        });
    });

    describe("Users can manually collect", function(){
        it("Roll, and collect manually", async function(){
            this.logInfo(`Having player1 bet, very likely to win.`);
            await assertCanRoll(player1, MIN_BET, MAX_NUMBER);
            this.logInfo('');
            this.logInfo('Collecting payout manually...');
            await assertCanPayoutRoll(await dice.curId());
            this.logInfo('');
            this.logInfo('Collecting payout manually again should do nothing.');
            await assertCanPayoutRoll(await dice.curId());
        });

        it("Next roll works correctly", function(){
            return assertCanRoll(player2, MIN_BET, 50);
        });
        it("Next roll works correctly", function(){
            return assertCanRoll(player2, MIN_BET, 50);
        });
    });

    // This causes ganache to die. Need to test this manually.
    xdescribe("Rolls on same block", async function(){
        before("Last bid is already resolved", async function(){
            const curId = await dice.curId();
            const roll = await getRoll(curId);
            assert(roll.result.gt(0), "Latest roll should already have a result.");
        });
        it("Roll many times on the same block", async function(){
            const wagers = [
                [1e16, 50, player1],
                [2e16, 50, player2],
                [1e16, 20, player3],
                [2e16, 80, player1]
            ];
            const txs = [];
            const tester = createDefaultTxTester()
                .startLedger([dice, player1, player2, player3])
                .doFn(() => {
                    testUtil.stopMining();
                    console.log(`Stopped mining.`);
                })
                .wait(1000);

            var gas = 150000;
            wagers.forEach((p, i)=>{
                tester
                    .doFn(() => {
                        console.log(`gas: ${gas}`)
                        txs.push(dice.roll(p[1], {value: p[0], from: p[2], gas: gas++}));
                        console.log(`Submitted transacion for roll ${i+1}.`);
                    })
                    .wait(100);
            });
                
            tester
                .doFn(() => {
                    console.log("Mining block now...");
                    testUtil.mineBlocks(1);
                    testUtil.startMining();
                    // NOTE: It never makes it this far. Ganache just hangs, then dies later on.
                    return Promise.all(txs).then((txResArr)=>{
                        const tx1res = txResArr[0];
                        const block = web3.eth.getBlock(tx1res.receipt.blockNumber);
                        if (block.transactions.length != txs.length)
                            throw new Error(`Block has ${block.transactions.length} txs, expected ${txs.length}.`);
                        txResArr.forEach((txRes,i)=>{
                            if (block.transactions[0]!=txRes.tx)
                                throw new Error(`Incorrect order: tx[${i}] was not in block.transactios[${i}]`);
                        });
                        
                        // fix logs bug (all logs included in all receipts/logs)
                        txResArr.forEach((txRes)=>{
                            const hash = txRes.tx;
                            txRes.receipt.logs = txRes.receipt.logs.filter((l)=>l.transactionHash == hash);
                            txRes.logs = txRes.logs.filter((l)=>l.transactionHash == hash);
                        })
                        console.log("All txs executed on same block, in expected order.");
                    });
                })

            return tester.start();
        })
    })

    async function getExpectedProfits() {
        const funding = await dice.funding();
        const balance = await testUtil.getBalance(dice.address);
        return balance.gt(funding)
            ? balance.minus(funding)
            : 0;
    }

    async function assertAddsFunding(amount) {
        amount = new BigNumber(amount);
        const expFunding = (await dice.funding()).plus(amount);
        return createDefaultTxTester()
            .startLedger([anon, dice])
            .doTx([dice, "addFunding", {from: anon, value: amount}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, amount)
                .assertDeltaMinusTxFee(anon, amount.mul(-1))
            .assertOnlyLog("FundingAdded", {
                time: null,
                sender: anon,
                amount: amount,
                funding: expFunding
            })
            .assertCallReturns([dice, "funding"], expFunding)
            .start();
    }

    async function assertRemovesFunding(amount) {
        amount = new BigNumber(amount);
        const balance = await testUtil.getBalance(dice);
        var expAmount = amount;
        if (amount.gt(balance)) {
            expAmount = balance;
            console.log(`${amount} exceeds balance, should remove only ${expAmount}.`);
        }
        const expFunding = (await dice.funding()).minus(expAmount);
        return createDefaultTxTester()
            .startLedger([admin, dice, dummyTreasury])
            .doTx([dice, "removeFunding", amount, {from: admin}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, expAmount.mul(-1))
                .assertDelta(dummyTreasury, expAmount)
                .assertLostTxFee(admin)
            .assertOnlyLog("FundingRemoved", {
                time: null,
                recipient: dummyTreasury,
                amount: expAmount,
                funding: expFunding
            })
            .assertCallReturns([dice, "funding"], expFunding)
            .start();
    }

    async function assertCanPayoutRoll(id) {
        const roll = await getRoll(id);
        const blockHash = (await testUtil.getBlock(roll.block)).hash;
        const isFinalized = roll.result.gt(0);
        const result = computeResult(blockHash, id);
        const didWin = !result.gt(roll.number);
        const expPayout = didWin && !roll.isPaid
            ? roll.payout
            : new BigNumber(0);
        const logCount = (!isFinalized ? 1 : 0) + (expPayout.gt(0) ? 1 : 0);
        console.log(`IsFinalized: ${isFinalized}, expPayout: ${expPayout}`);

        const txTester = createDefaultTxTester()
            .startLedger([dice, roll.user])
            .doTx([dice, "payoutRoll", id, {from: anon}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, expPayout.mul(-1))
                .assertDelta(roll.user, expPayout)
            .assertLogCount(logCount)

        if (!isFinalized) {
            txTester.assertLog("RollFinalized");
        }
        if (expPayout.gt(0)) {
            txTester.assertLog("PayoutSuccess");
        }

        return txTester.start();
    }

    async function assertCanRoll(player, bet, number) {
        bet = new BigNumber(bet);
        number = new BigNumber(number);
        
        const expId = (await dice.curId()).plus(1);
        const expBlock = testUtil.getBlockNumber()+1;
        const expPayout = computePayout(bet, number);
        const expTotalWagered = (await dice.totalWagered()).plus(bet.div(1e9).floor().mul(1e9));
        
        var expLogs = [["RollWagered", {
            id: expId,
            user: player,
            bet: bet,
            number: number,
            payout: expPayout
        }]];
        var expFinalizeId = await dice.finalizeId();
        var expAssertions = [];
        var expTotalWon = await dice.totalWon();
        var expPlayerWinnings = new BigNumber(0);
        var expPayouts = new BigNumber(0);
        var expGasUsed = new BigNumber(75000);

        // determine what will get finalized
        async function simulateFinalizeNext() {
            const id = expFinalizeId;
            if (id.gte(expId)) {
                console.log(`Nothing to finalize.`);
                return;
            }

            const roll = await getRoll(id);
            if (roll.result.gt(0)) {
                console.log(`Should skip finalizing roll #${id} - it's already finalized.`);
                // increments finalizeId, reads from storage a lot.
                expGasUsed = expGasUsed.plus(7000);
                expFinalizeId = expFinalizeId.plus(1);
                return;
            }

            const curBlock = testUtil.getBlockNumber();
            if (curBlock <= roll.block) {
                console.log(`Should not finalize roll #${id} - it's on this block.`);
                return;
            }

            // See what the results of roll will be.
            const blockHash = (await testUtil.getBlock(roll.block)).hash;
            const result = computeResult(blockHash, id);
            const payout = result.gt(roll.number)
                ? new BigNumber(0)
                : roll.payout;

            // Update expected values
            expFinalizeId = expFinalizeId.plus(1);
            expLogs.push(["RollFinalized", {
                time: null,
                id: id,
                user: roll.user,
                result: result,
                payout: payout
            }]);

            // Update expected stuff if they won
            if (payout.gt(0)) {
                console.log(`Roll #${id} should finalize with result ${result} against ${roll.number} and win.`);
                expTotalWon = expTotalWon.plus(payout.div(1e9).floor().mul(1e9));
                expPlayerWinnings = roll.user == player
                    ? expPlayerWinnings.plus(payout)
                    : expPlayerWinnings;
                expPayouts = expPayouts.plus(payout);
                expLogs.push(["PayoutSuccess", {
                    time: null,
                    id: id,
                    user: roll.user,
                    payout: payout
                }]);
                expGasUsed = expGasUsed.plus(40000);
                return true;
            } else {
                expGasUsed = expGasUsed.plus(16000);
                console.log(`Roll #${id} should finalize with result ${result} against ${roll.number} and lose.`);
            }
        }

        // simulate finalizing next stuff.
        const willDoPayout = await simulateFinalizeNext();
        if (!willDoPayout) await simulateFinalizeNext();

        // Do tests.
        const txTester = createDefaultTxTester()
            .startLedger([player, dice])
            .doTx([dice, "roll", number, {value: bet, from: player}])
                .assertSuccess()
            .stopLedger()
                .assertDelta(dice, bet.minus(expPayouts))
                .assertDeltaMinusTxFee(player, bet.mul(-1).plus(expPlayerWinnings))
            //.assertGasUsedLt(expGasUsed)
            .assertCallReturns([dice, "curId"], expId)
            .assertCallReturns([dice, "finalizeId"], expFinalizeId)
            .assertCallReturns([dice, "totalWagered"], expTotalWagered)
            .assertCallReturns([dice, "totalWon"], expTotalWon)
            .assertLogCount(expLogs.length);

        expLogs.forEach((arr) => {
            txTester.assertLog(arr[0], arr[1]);
        });

        // Assert this roll has expected result.
        var expResult;
        return txTester
            .doFn(async function(ctx){
                await testUtil.mineBlocks(1);
                const blockHash = ctx.txRes.receipt.blockHash;
                expResult = computeResult(blockHash, expId);
                const winStr = expResult.lte(number) ? "win" : "lose"
                console.log(`This roll should ${winStr} with a result of ${expResult}.`);
            })
            .assertCallReturns([dice, "getRollResult", expId], ()=>expResult)
            .start();
    }

    async function assertRollRefunded(player, bet, number, msg) {
        const curId = await dice.curId();
        return createDefaultTxTester()
            .startLedger([dice, player])
            .doTx([dice, "roll", number, {value: bet, from: player}])
            .assertSuccess()
                .assertOnlyLog("RollRefunded", {
                    time: null,
                    user: player,
                    msg: msg
                })
            .stopLedger()
                .assertNoDelta(dice)
                .assertLostTxFee(player)
            .assertCallReturns([dice, "curId"], curId)
            .start();
    }

    async function getRoll(id) {
        const arr = await dice.rolls(id);
        const userId = arr[1];
        const user = await dice.userAddresses(arr[1]);
        return {
            id: arr[0],
            user: user,
            bet: arr[2],
            number: arr[3],
            payout: arr[4],
            block: arr[5],
            result: arr[6],
            isPaid: arr[7],
        };
    }

    function computeResult(blockHash, id) {
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
        const bn = new BigNumber(hash);
        //console.log(`Hash of (${blockHash}, ${id}): ${hash}`);
        return bn.mod(100).plus(1);
    }

    function computePayout(bet, number) {
        return (new BigNumber(100)).div(number).mul(bet).mul(10000-FEE_BIPS).div(10000).round();
    }
});

