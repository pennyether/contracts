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
    const admin = accounts[6]
    var dice;
    var registry;

    before("Set up registry, treasury, and create comptroller.", async function(){
        registry = await Registry.new(owner);
        await registry.register("ADMIN", admin, {from: owner});
        await registry.register("TREASURY", dummyTreasury, {from: owner});
        console.log(`Registry: ${registry.address}`);
        dice = await InstaDice.new(registry.address, {from: owner});
        FEE_BIPS = await dice.feeBips();
        console.log(`FEE_BIPS: ${FEE_BIPS}`)

        return createDefaultTxTester()
            .nameAddresses({
                owner: owner,
                player1: player1, 
                player2: player2,
                player3: player3,
                dice: dice.address
            })
            .start();
    });
    describe("Restrictions", function(){
        it("Cannot roll tiny amount", function(){
            return assertCannotRoll(player1, 12345678, 50, "Bet too small.");
        });
        it("Cannot roll huge amount", function(){
            return assertCannotRoll(player1, 1e18, 50, "Bet too large.");
        });
        it("Cannot roll with number too small", function(){
            return assertCannotRoll(player1, .1e18, 3, "Roll number too small.");
        });
        it("Cannot roll with number too large", function(){
            return assertCannotRoll(player1, .1e18, 100, "Roll number too large.");
        });
    })
    describe("Bankroll", function(){
        it("Can add bankroll", function(){
            return assertAddsBankroll(.5e18);
        });

    });
    describe("Rolling", function(){
        it("Player1 can roll", function(){
            return assertCanRoll(player1, .01e18, 50);
        });
        it("Player1 can roll again", function(){
            return assertCanRoll(player1, .01e18, 50);
        });
        it("Player1 can collect", function(){
            return assertCanCollectPayout(2);
        })
        it("Player2 can roll", function(){
            return assertCanRoll(player2, .01e18, 80);
        });
        it("Player2 can collect", function(){
            return assertCanCollectPayout(3);
        });
        it("Player2 can roll again", function(){
            return assertCanRoll(player2, .01e18, 80);
        });
        it("Player1 can roll", function(){
            return assertCanRoll(player1, .01e18, 50);
        });
        it("Player1 can roll again", function(){
            return assertCanRoll(player1, .01e18, 50);
        });
        it("Player2 can roll", function(){
            return assertCanRoll(player2, .01e18, 20);
        });
        it("Player2 can roll again", function(){
            return assertCanRoll(player2, .01e18, 80);
        });        
    })

    async function assertAddsBankroll(amount) {
        amount = new BigNumber(amount);
        const newAmt = (await dice.bankroll()).plus(amount);
        return createDefaultTxTester()
            .startLedger([owner, dice])
            .doTx([dice, "addBankroll", {from: owner, value: amount}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, amount)
                .assertDeltaMinusTxFee(owner, amount.mul(-1))
            .assertCallReturns([dice, "bankroll"], newAmt)
            .start();
    }

    async function assertCanCollectPayout(id) {
        const roll = await getRoll(id);
        const isResolved = roll.result.gt(0);
        const result = await dice.getRollResult(id);
        const didWin = !result.gt(roll.number);
        const expPayout = didWin && !roll.isPaid
            ? getPayout(roll.number, roll.bet)
            : new BigNumber(0);
        const logCount = (!isResolved ? 1 : 0) + (expPayout.gt(0) ? 1 : 0);

        const txTester = createDefaultTxTester()
            .startLedger([dice, roll.user])
            .doTx([dice, "collectPayout", id])
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

    async function assertCanRoll(player, bet, number) {
        bet = new BigNumber(bet);
        number = new BigNumber(number);
        const txTester = createDefaultTxTester();

        const curId = await dice.curId();
        const curBankroll = await dice.bankroll();
        const totalWon = await dice.totalWon();
        const totalWagered = await dice.totalWagered();

        const expId = curId.plus(1);
        const expBlock = testUtil.getBlockNumber()+1;
        const expPayout = getPayout(number, bet);
        const expTotalWagered = totalWagered.plus(bet);
        var expBankroll = curBankroll.minus(expPayout).plus(bet);
        var expUserWinnings = new BigNumber(0);
        var expNumLogs = 1;

        // if there is a previous roll, we want to test that it resolves correctly.      
        const prevRoll = await getRoll(curId);
        const hasPrevRoll = prevRoll.id.gt(0) && prevRoll.result.equals(0);
        var expPrevPayout = new BigNumber(0);
        var expPrevResult;
        if (hasPrevRoll) {
            expNumLogs++;
            const prevPayout = getPayout(prevRoll.number, prevRoll.bet);
            expPrevResult = await dice.getRollResult(curId);
            expPrevPayout = expPrevResult.gt(prevRoll.number)
                ? new BigNumber(0)
                : prevPayout;
            const wonStr = expPrevPayout.equals(0) ? "lost" : "won";
            console.log(`Previous roll ${wonStr} with result ${expPrevResult} and payout of ${expPrevPayout}.`);

            if (expPrevPayout.equals(0)) {
                console.log(`Expecting bankroll to be higher by ${prevPayout}`);
                expBankroll = expBankroll.plus(prevPayout);
            } else {
                expNumLogs++;
                if (prevRoll.user == player) {
                    expUserWinnings = expPrevPayout;
                    console.log(`Current player won the last bet.`);
                }
            }
        }

        // assert things about the current wager
        txTester
            .startLedger([player, dice])
            .doTx([dice, "roll", number, {value: bet, from: player}])
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
                [expId, player, bet, number, expBlock+1, 0])

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
            .doFn(async function(){
                const result = await dice.getRollResult(expId);
                const payout = await dice.getRollPayout(expId);
                console.log(`This roll will have a result of ${result}, winning ${payout}.`);
                const balance = testUtil.getBalance(dice);
                const bankroll = await dice.bankroll();
                assert(!bankroll.gt(balance), "Bankroll should never be more than balance.");
            })

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

    function getPayout(number, bet) {
        return (new BigNumber(100)).div(number).mul(bet).mul(10000-FEE_BIPS).div(10000);
    }
});

