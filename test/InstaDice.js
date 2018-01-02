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

    const MIN_BET = 1e9;
    const MAX_BET = .6e18;
    const MIN_NUMBER = 5;
    const MAX_NUMBER = 99;
    const FEE_BIPS = 125;

    before("Set up registry, treasury, and create comptroller.", async function(){
        registry = await Registry.new(owner);
        await registry.register("ADMIN", admin, {from: owner});
        await registry.register("TREASURY", dummyTreasury, {from: owner});
        console.log(`Registry: ${registry.address}`);
        dice = await InstaDice.new(registry.address, {from: owner});

        return createDefaultTxTester()
            .nameAddresses({
                owner: owner,
                player1: player1, 
                player2: player2,
                player3: player3,
                dummyTreasury: dummyTreasury,
                admin: admin,
                anon: anon,
                dice: dice.address
            })
            .start();
    });

    describe("Bankroll", function(){
        describe(".addBankroll()", function(){
            it("Anyone can add bankroll", function(){
                return assertAddsBankroll(.5e18, {from: anon});
            });
        })
        
        describe(".removeBankroll()", function(){
            it("Anon cannot remove bankroll", function(){
                return createDefaultTxTester()
                    .doTx([dice, "removeBankroll", .1e18, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Cannot remove more than bankroll", async function(){
                const bankroll = await dice.minBankroll();
                return createDefaultTxTester()
                    .doTx([dice, "removeBankroll", bankroll.plus(1), {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works for admin", function(){
                return assertRemovesBankroll(.1e18)
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
                return assertCannotRoll(player1, minBet.minus(1), 50, "Bet too small.");
            });
            it("Cannot roll huge amount", function(){
                return assertCannotRoll(player1, maxBet.plus(1), 50, "Bet too large.");
            });
            it("Cannot roll with number too small", function(){
                return assertCannotRoll(player1, .1e18, minNumber.minus(1), "Roll number too small.");
            });
            it("Cannot roll with number too large", function(){
                return assertCannotRoll(player1, .1e18, maxNumber.plus(1), "Roll number too large.");
            });
        });
        describe("Rolling...", function(){
            it("Player1 can roll", function(){
            return assertCanRoll(player1, .01e18, 50);
            });
            it("Player1 can roll again", function(){
                return assertCanRoll(player1, .01e18, 50);
            });
            it("Player2 can roll, using fallback", function(){
                return assertCanRoll(player2, .01e18, 80, true);
            });
            it("Player2 can roll again", function(){
                return assertCanRoll(player2, .01e18, 80);
            });
        });
        describe("Cannot wager more than bankroll could afford to pay", function(){
            it("Reduce bankroll to small amount", async function(){
                const minBankroll = await dice.minBankroll();
                const bankroll = await dice.bankroll();
                var amtToRemove;
                if (minBankroll.gt(bankroll)){
                    console.log(`Dice is below minBankroll. Will remove nearly entire bankroll.`);
                    amtToRemove = bankroll.minus(1);
                } else {
                    console.log(`Dice is above minBankroll. Will remove nearly entire minBankroll.`);
                    amtToRemove = minBankroll.minus(1);
                }
                await assertRemovesBankroll(amtToRemove);
            });
            it("Should not allow a bet", async function(){
                const bankroll = await dice.bankroll();
                console.log(`Dice bankroll: ${bankroll}.`);
                return assertCannotRoll(player1, MAX_BET, MIN_NUMBER, "Bankroll too small.");
            });
        });
    });

    describe("Taking profits", function(){
        it("Try to generate a profit", async function(){
            var profits = await dice.getProfits();
            const bankroll = await dice.bankroll();
            const minBankroll = await dice.minBankroll();
            if (profits.gt(0)) {
                console.log(`Has profits of ${profits}`);
                return;
            }
            console.log(`InstaDice has no profits. Will try to get some.`);
            console.log(`Bankroll: ${bankroll}, minBankroll: ${minBankroll}`);
            console.log(`Upping bankroll...`);
            await assertAddsBankroll(10e18);
            console.log(`Now betting a large amount with small odds...`);
            await createDefaultTxTester()
                .doTx([dice, "roll", MIN_NUMBER, {from: player1, value: .1e18}])
                .assertSuccess()
                .assertLog("RollWagered")
                .doTx([dice, "roll", MIN_NUMBER, {from: player1, value: MIN_BET}])
                .assertSuccess()
                .assertLog("RollWagered")
                .start();

            profits = await dice.getProfits();
            if (profits.gt(0)) {
                console.log(`Now it has profits of ${profits}.`);
            } else {
                throw new Error(`Failed to generate a profits... try test again.`);
            }
        });
        it("Not callable by anon", async function(){
            return createDefaultTxTester()
                .doTx([dice, "sendProfits", {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Collects profits", async function(){
            const expProfits = await dice.getProfits();
            const bankroll = await dice.bankroll();
            const minBankroll = await dice.minBankroll();
            assert(bankroll.gt(minBankroll), "Bankroll should be more than minBankroll");
            return createDefaultTxTester()
                .startLedger([dice, dummyTreasury, admin])
                .doTx([dice, "sendProfits", {from: admin}])
                .assertSuccess()
                .stopLedger()
                    .assertDelta(dice, expProfits.mul(-1))
                    .assertDelta(dummyTreasury, expProfits)
                    .assertLostTxFee(admin)
                .assertOnlyLog("ProfitsSent", {
                    time: null,
                    recipient: dummyTreasury,
                    amount: expProfits,
                    minBankroll: minBankroll,
                    bankroll: minBankroll
                })
                .assertCallReturns([dice, "bankroll"], minBankroll)
                .assertCallReturns([dice, "minBankroll"], minBankroll)
                .doFn(assertBalanceGtBankroll)
                .start();
        });
    });

    describe("Users can manually collect", function(){
        it("Do it once", async function(){
            console.log(`Having player1 bet, very likely to win.`);
            await assertCanRoll(player1, MIN_BET, MAX_NUMBER);
            console.log('');
            console.log('Collecting payout manually...');
            await assertCanPayoutRoll(await dice.curId());
            console.log('');
            console.log('Collecting payout manually (should not pay twice)');
            await assertCanPayoutRoll(await dice.curId());
        });
        it("Do it again", async function(){
            console.log(`Having player1 bet, very likely to win.`);
            await assertCanRoll(player1, MIN_BET, MAX_NUMBER);
            console.log('');
            console.log('Collecting payout manually...');
            await assertCanPayoutRoll(await dice.curId());
            console.log('');
            console.log('Collecting payout manually (should not pay twice)');
            await assertCanPayoutRoll(await dice.curId());
        });
    });

    // This causes ganache to die. Need to test this manually.
    describe.skip("Unresolveable rolls", async function(){
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
                });

            wagers.forEach((p, i)=>{
                tester
                    .doFn(() => {
                        txs.push(dice.roll(p[1], {value: p[0], from: p[2]}));
                        console.log(`Submitted transacion for roll ${i+1}.`);
                    })
                    .wait(100);
            });
                
            tester
                .doFn(() => {
                    console.log("Mining block now...");
                    testUtil.mineBlocks(1);
                    testUtil.startMining();
                    console.log(txs);
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
        const minBankroll = await dice.minBankroll();
        const bankroll = await dice.bankroll();
        return bankroll.gt(minBankroll)
            ? bankroll.minus(minBankroll)
            : 0;
    }

    async function assertAddsBankroll(amount) {
        amount = new BigNumber(amount);
        const expBankroll = (await dice.bankroll()).plus(amount);
        const expMinBankroll = (await dice.minBankroll()).plus(amount);
        return createDefaultTxTester()
            .startLedger([anon, dice])
            .doTx([dice, "addBankroll", {from: anon, value: amount}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, amount)
                .assertDeltaMinusTxFee(anon, amount.mul(-1))
            .assertOnlyLog("BankrollAdded", {
                time: null,
                sender: anon,
                amount: amount,
                minBankroll: expMinBankroll,
                bankroll: expBankroll
            })
            .assertCallReturns([dice, "bankroll"], expBankroll)
            .assertCallReturns([dice, "minBankroll"], expMinBankroll)
            .doFn(assertBalanceGtBankroll)
            .start();
    }

    async function assertRemovesBankroll(amount) {
        amount = new BigNumber(amount);
        const expBankroll = (await dice.bankroll()).minus(amount);
        const expMinBankroll = (await dice.minBankroll()).minus(amount);
        return createDefaultTxTester()
            .startLedger([admin, dice, dummyTreasury])
            .doTx([dice, "removeBankroll", amount, {from: admin}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, amount.mul(-1))
                .assertDelta(dummyTreasury, amount)
                .assertLostTxFee(admin)
            .assertOnlyLog("BankrollRemoved", {
                time: null,
                recipient: dummyTreasury,
                amount: amount,
                minBankroll: expMinBankroll,
                bankroll: expBankroll
            })
            .assertCallReturns([dice, "bankroll"], expBankroll)
            .assertCallReturns([dice, "minBankroll"], expMinBankroll)
            .doFn(assertBalanceGtBankroll)
            .start();
    }

    async function assertCanPayoutRoll(id) {
        const roll = await getRoll(id);
        const blockHash = (await testUtil.getBlock(roll.block)).hash;
        const isResolved = roll.result.gt(0);
        const result = computeResult(blockHash, id);
        const didWin = !result.gt(roll.number);
        const expPayout = didWin && !roll.isPaid
            ? computePayout(roll.bet, roll.number)
            : new BigNumber(0);
        const logCount = (!isResolved ? 1 : 0) + (expPayout.gt(0) ? 1 : 0);
        console.log(`IsResolved: ${isResolved}, expPayout: ${expPayout}`);

        const txTester = createDefaultTxTester()
            .startLedger([dice, roll.user])
            .doTx([dice, "payoutRoll", id])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, expPayout.mul(-1))
                .assertDelta(roll.user, expPayout)
            .assertLogCount(logCount)

        if (!isResolved) {
            txTester.assertLog("RollResolved");
        }
        if (expPayout.gt(0)) {
            txTester.assertLog("PayoutSuccess");
        }

        return txTester.start();
    }

    async function assertCanRoll(player, bet, number, useFallback) {
        bet = new BigNumber(bet);
        number = new BigNumber(number);
        if (useFallback) bet = bet.plus(number);
        const txTester = createDefaultTxTester();

        const curId = await dice.curId();
        const curBankroll = await dice.bankroll();
        const totalWon = await dice.totalWon();
        const totalWagered = await dice.totalWagered();

        const expId = curId.plus(1);
        const expBlock = testUtil.getBlockNumber()+1;
        const expPayout = computePayout(bet, number);
        const expTotalWagered = totalWagered.plus(bet);
        var expBankroll = curBankroll.minus(expPayout).plus(bet);
        var expUserWinnings = new BigNumber(0);
        var expPrevPayout = new BigNumber(0);
        var expNumLogs = 1;
        var expPrevResult;

        // if there is a previous roll, we want to test that it resolves correctly.      
        const prevRoll = await getRoll(curId);
        const hasPrevRoll = prevRoll.id.gt(0) && prevRoll.result.equals(0);
        if (hasPrevRoll) {
            expNumLogs++;
            const blockHash = (await testUtil.getBlock(prevRoll.block)).hash;
            const prevPayout = computePayout(prevRoll.bet, prevRoll.number);
            expPrevResult = computeResult(blockHash, prevRoll.id);
            expPrevPayout = expPrevResult.gt(prevRoll.number)
                ? new BigNumber(0)
                : prevPayout;
            const wonStr = expPrevPayout.equals(0) ? "lost" : "won";
            console.log(`Last bet ${wonStr} with roll of ${expPrevResult} for payout of ${expPayout}`);

            if (expPrevPayout.equals(0)) {
                console.log(`Expecting bankroll to be higher by ${prevPayout}`);
                expBankroll = expBankroll.plus(prevPayout);
            } else {
                expNumLogs++;
                if (prevRoll.user == player) {
                    expUserWinnings = expPrevPayout;
                    console.log(`The last bet was by this user -- they should get some ETH back.`);
                }
            }
        }
        const txParams = useFallback
            ? [dice, "sendTransaction", {value: bet, from: player}]
            : [dice, "roll", number, {value: bet, from: player}]

        // assert things about the current wager
        txTester
            .startLedger([player, dice])
            .doTx(txParams)
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, bet.minus(expPrevPayout))
                .assertDeltaMinusTxFee(player, bet.mul(-1).plus(expUserWinnings))
            .assertLogCount(expNumLogs)
            .assertLog("RollWagered", {
                time: null,
                id: expId,
                user: player,
                bet: bet,
                number: number
            })
            .assertCallReturns([dice, "totalWagered"], expTotalWagered)
            .assertCallReturns([dice, "rolls", expId],
                [expId, player, bet, number, expBlock, 0])
            .assertCallReturns([dice, "getProfits"], ()=>getExpectedProfits())

        // assert things about the previous resolved roll
        if (hasPrevRoll){
            txTester.assertLog("RollResolved", {
                time: null,
                id: curId,
                user: prevRoll.user,
                bet: prevRoll.bet,
                number: prevRoll.number,
                result: expPrevResult,
                payout: expPrevPayout
            });

            if (expPrevPayout.gt(0)) {
                txTester.assertLog("PayoutSuccess", {
                    time: null,
                    id: curId,
                    user: prevRoll.user,
                    payout: expPrevPayout
                }).assertCallReturns([dice, "rolls", curId],
                    [curId, prevRoll.user, prevRoll.bet, prevRoll.number, prevRoll.block, expPrevResult, true]
                );
            } else {
                txTester.assertCallReturns([dice, "rolls", curId],
                    [curId, prevRoll.user, prevRoll.bet, prevRoll.number, prevRoll.block, expPrevResult, false]
                );
            }
        }

        // make sure bankroll is correct
        txTester
            .assertCallReturns([dice, "bankroll"], expBankroll)
            .doFn(async function(ctx){
                const blockHash = ctx.txRes.receipt.blockHash;
                const result = computeResult(blockHash, expId);
                const payout = result.gt(number)
                    ? 0
                    : expPayout;
                const diceResult = await dice.getRollResult(expId);
                console.log(`This roll will have a result of ${result} for a payout of ${payout}.`);
                console.log(`Dice thinks this result will be: ${diceResult}.`);
            })
            .doFn(assertBalanceGtBankroll);

        return txTester.start();
    }

    async function assertCannotRoll(player, bet, number, msg) {
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

    async function assertBalanceGtBankroll(){
        const balance = testUtil.getBalance(dice);
        const bankroll = await dice.bankroll();
        if (!bankroll.gt(balance)){
            console.log(`✓ Balance >= bankroll (${balance} > ${bankroll})`);
        } else {
            console.log(`Bankroll: ${bankroll}, balance: ${balance}`);
            throw new Error(`Bankroll should never be greater than balance!`);
        }
    }

    async function getRoll(id) {
        const arr = await dice.rolls(id);
        return {
            id: arr[0],
            user: arr[1],
            bet: arr[2],
            number: arr[3],
            block: arr[4],
            result: arr[5],
            isPaid: arr[6],
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

