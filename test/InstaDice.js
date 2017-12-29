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
    var dice;

    before("Set up registry, treasury, and create comptroller.", async function(){
        dice = await InstaDice.new({from: owner});
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
        it("Player2 can roll", function(){
            return assertCanRoll(player2, .01e18, 20);
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

    async function assertCanRoll(player, bet, number) {
        bet = new BigNumber(bet);
        number = new BigNumber(number);
        const txTester = createDefaultTxTester();

        const curId = await dice.curId();
        const curBankroll = await dice.bankroll();
        const totalWon = await dice.totalWon();
        const totalWagered = await dice.totalWagered();
        const curUserBalance = await dice.getBalance(player);
        var expUserBalance;

        const expId = curId.plus(1);
        const expBlock = testUtil.getBlockNumber()+1;
        const expPayout = getPayout(number, bet);
        const expTotalWagered = totalWagered.plus(bet);
        var expBankroll = curBankroll.minus(expPayout).plus(bet);

        // if there is a previous roll, we want to test that it resolves correctly.      
        const prevRoll = await getRoll(curId);
        const hasPrevRoll = prevRoll.id.gt(0) && prevRoll.result.equals(0);
        if (hasPrevRoll) {
            var expPrevResult = await dice.getRollResult(curId);
            var prevUserBalance = await dice.balance(prevRoll.user);
            var expPrevPayout = expPrevResult.gt(prevRoll.number)
                ? new BigNumber(0)
                : getPayout(prevRoll.number, prevRoll.bet);
            var expPrevUserBalance = prevUserBalance.plus(expPrevPayout);
            const wonStr = expPrevPayout.equals(0) ? "lost" : "won";
            console.log(`Previous roll ${wonStr} with result ${expPrevResult} and payout of ${expPrevPayout}.`);

            if (expPrevPayout.equals(0)) {
                const prevPayout = await dice.getPayout(prevRoll.bet, prevRoll.number);
                console.log(`Expecting bankroll to be higher by ${prevPayout}`);
                expBankroll = expBankroll.plus(prevPayout);
            }
        }

        txTester
            .startLedger([player, dice])
            .doTx([dice, "roll", number, {value: bet, from: player}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, bet)
                .assertDeltaMinusTxFee(player, bet.mul(-1))
            .assertLogCount(hasPrevRoll ? 2 : 1)
            .assertLog("RollWagered", {
                time: null,
                id: expId,
                user: player,
                bet: bet,
                number: number
            })
            .assertCallReturns([dice, "getPayout", bet, number], expPayout)
            .assertCallReturns([dice, "totalWagered"], expTotalWagered)
            .assertCallReturns([dice, "rolls", expId],
                [expId, player, bet, number, expBlock+1, 0])

        if (hasPrevRoll){
            txTester
                .assertLog("RollResolved", {
                    time: null,
                    id: curId,
                    user: prevRoll.user,
                    bet: prevRoll.bet,
                    number: prevRoll.number,
                    result: expPrevResult,
                    payout: expPrevPayout
                })
                .assertCallReturns([dice, "balance", prevRoll.user], expPrevUserBalance)
                .assertCallReturns([dice, "rolls", curId],
                    [curId, prevRoll.user, prevRoll.bet, prevRoll.number, prevRoll.block, expPrevResult])
        }

        
        txTester
            .assertCallReturns([dice, "bankroll"], expBankroll)
            .doFn(async function(){
                const result = await dice.getRollResult(curId.plus(1));
                const payout = await dice.getRollPayout(curId.plus(1));
                expUserBalance = curUserBalance.plus(payout);
                console.log(`This roll will have a result of ${result}, winning ${payout}.`);
            })
            .assertCallReturns([dice, "getBalance", player], ()=>expUserBalance,
                "Balance should reflect win/loss of current roll");

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
            result: arr[5]
        };
    }

    function getPayout(number, bet) {
        return (new BigNumber(100)).div(number).mul(bet).mul(10000-FEE_BIPS).div(10000);
    }
});

