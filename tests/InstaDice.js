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

    describe("Bankroll", function(){
        describe(".addFunding()", function(){
            it("Anyone can add funding", function(){
                return assertAddsFunding(.5e18, {from: anon});
            });
        })
        
        describe(".removeFunding()", function(){
            it("Anon cannot remove bankroll", function(){
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
                it("Add some bankroll back", function(){
                    return assertAddsFunding(.5e18, {from: anon});    
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
            it("Player2 can roll", function(){
                return assertCanRoll(player2, .01e18, 80);
            });
            it("Player2 can roll again", function(){
                return assertCanRoll(player2, .01e18, 80);
            });
        });
        describe("Cannot wager more than bankroll could afford to pay", function(){
            it("Reduce funding to small amount", async function(){
                this.logInfo(`Remove funding so that bankroll is very small.`);
                const funding = await dice.funding();
                const bankroll = await dice.bankroll();
                var amtToRemove;
                if (funding.gt(bankroll)){
                    console.log(`Bankroll is below funding. Will remove nearly entire bankroll.`);
                    amtToRemove = bankroll.minus(1);
                } else {
                    console.log(`Bankroll is above funding. Will remove nearly entire funding.`);
                    amtToRemove = funding.minus(1);
                }
                await assertRemovesFunding(amtToRemove);
            });
            it("Should not allow a bet", async function(){
                this.logInfo(`Player should not be able to place a wager that could result`);
                this.logInfo(` in a payout more than the bankroll.`);
                const bankroll = await dice.bankroll();
                return assertCannotRoll(player1, MAX_BET, MIN_NUMBER, "Bankroll too small.");
            });
        });
    });

    describe("Taking profits", function(){
        it("Try to generate a profit", async function(){
            this.logInfo(`Depending on the above rolls, may or may not have a profit.`);

            var profits = await dice.getProfits();
            const bankroll = await dice.bankroll();
            const funding = await dice.funding();
            if (profits.gt(0)) {
                this.logInfo(`InstaDice has profits of: ${profits}.`);
                return;
            }
            this.logInfo(`InstaDice has no profits. Will try to get some.`);
            this.logInfo(`Bankroll: ${bankroll}, Funding: ${funding}`);
            this.logInfo(`Upping funding first, so we can take a large bet.`);
            await assertAddsFunding(1e18);
            this.logInfo(`Now betting a large amount with small odds...`);
            await createDefaultTxTester()
                .doTx([dice, "roll", MIN_NUMBER, {from: player1, value: .05e18}])
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
            this.logInfo(`Should collect the difference between bankroll and funding.`);
            const expProfits = await dice.getProfits();
            const bankroll = await dice.bankroll();
            const funding = await dice.funding();
            this.logInfo(`Bankroll: ${bankroll}, Funding: ${funding}, Profits: ${expProfits}`);
            assert(bankroll.gt(funding), "Bankroll should be more than funding");
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
                    bankroll: funding
                })
                .assertCallReturns([dice, "bankroll"], funding)
                .assertCallReturns([dice, "funding"], funding)
                .doFn(assertBalanceGtBankroll)
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
        const bankroll = await dice.bankroll();
        return bankroll.gt(funding)
            ? bankroll.minus(funding)
            : 0;
    }

    async function assertAddsFunding(amount) {
        amount = new BigNumber(amount);
        const expBankroll = (await dice.bankroll()).plus(amount);
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
                funding: expFunding,
                bankroll: expBankroll
            })
            .assertCallReturns([dice, "bankroll"], expBankroll)
            .assertCallReturns([dice, "funding"], expFunding)
            .doFn(assertBalanceGtBankroll)
            .start();
    }

    async function assertRemovesFunding(amount) {
        amount = new BigNumber(amount);
        const balance = await testUtil.getBalance(dice);
        if (amount.gt(balance)) {
            console.log(`${amount} exceeds balance, should remove only ${balance}.`);
            amount = balance;
        }
        const expBankroll = (await dice.bankroll()).minus(amount);
        const expFunding = (await dice.funding()).minus(amount);
        return createDefaultTxTester()
            .startLedger([admin, dice, dummyTreasury])
            .doTx([dice, "removeFunding", amount, {from: admin}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(dice, amount.mul(-1))
                .assertDelta(dummyTreasury, amount)
                .assertLostTxFee(admin)
            .assertOnlyLog("FundingRemoved", {
                time: null,
                recipient: dummyTreasury,
                amount: amount,
                funding: expFunding,
                bankroll: expBankroll
            })
            .assertCallReturns([dice, "bankroll"], expBankroll)
            .assertCallReturns([dice, "funding"], expFunding)
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
            ? roll.payout
            : new BigNumber(0);
        const logCount = (!isResolved ? 1 : 0) + (expPayout.gt(0) ? 1 : 0);
        console.log(`IsResolved: ${isResolved}, expPayout: ${expPayout}`);

        const txTester = createDefaultTxTester()
            .startLedger([dice, roll.user])
            .doTx([dice, "payoutRoll", id, {from: anon}])
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

        const prevRollId = await dice.curId();
        const curBankroll = await dice.bankroll();
        const totalWagered = await dice.totalWagered();

        const expId = prevRollId.plus(1);
        const expBlock = testUtil.getBlockNumber()+1;
        const expPayout = computePayout(bet, number);
        const expTotalWagered = totalWagered.plus(bet);
        var expTotalWon = await dice.totalWon();
        var expBankroll = curBankroll.minus(expPayout).plus(bet);
        var expUserWinnings = new BigNumber(0);
        var expPrevPayout = new BigNumber(0);
        var expNumLogs = 1;
        var expPrevResult;

        // if there is a previous roll, we want to test that it resolves correctly.      
        const prevRoll = await getRoll(prevRollId);
        const hasPrevRoll = prevRoll.block.gt(0) && prevRoll.result.equals(0);
        if (hasPrevRoll) {
            expNumLogs++;
            const blockHash = (await testUtil.getBlock(prevRoll.block)).hash;
            const prevPayout = prevRoll.payout;
            expPrevResult = computeResult(blockHash, prevRollId);
            expPrevPayout = expPrevResult.gt(prevRoll.number)
                ? new BigNumber(0)
                : prevPayout;
            const wonStr = expPrevPayout.equals(0) ? "lost" : "won";
            console.log(`Last bet ${wonStr} with roll of ${expPrevResult} for payout of ${expPrevPayout}`);

            if (expPrevPayout.equals(0)) {
                console.log(`Expecting bankroll to be higher by ${prevPayout}`);
                expBankroll = expBankroll.plus(prevPayout);
            } else {
                expTotalWon = expTotalWon.plus(expPrevPayout);
                expNumLogs++;
                if (prevRoll.user == player) {
                    expUserWinnings = expPrevPayout;
                    console.log(`The last bet was by this user -- they should get some ETH back.`);
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
                number: number,
                payout: expPayout
            })
            .assertCallReturns([dice, "totalWagered"], expTotalWagered)
            .assertCallReturns([dice, "totalWon"], expTotalWon)
            .assertCallReturns([dice, "rolls", expId],
                [player, bet, number, expPayout, expBlock, 0])
            .assertCallReturns([dice, "getProfits"], ()=>getExpectedProfits())

        // assert things about the previous resolved roll
        if (hasPrevRoll){
            txTester.assertLog("RollResolved", {
                time: null,
                id: prevRollId,
                user: prevRoll.user,
                result: expPrevResult,
                payout: expPrevPayout
            });

            if (expPrevPayout.gt(0)) {
                txTester.assertLog("PayoutSuccess", {
                    time: null,
                    id: prevRollId,
                    user: prevRoll.user,
                    payout: expPrevPayout
                }).assertCallReturns([dice, "rolls", prevRollId],
                    [prevRoll.user, prevRoll.bet, prevRoll.number, prevRoll.payout, prevRoll.block, expPrevResult, true]
                );
            } else {
                txTester.assertCallReturns([dice, "rolls", prevRollId],
                    [prevRoll.user, prevRoll.bet, prevRoll.number, prevRoll.payout, prevRoll.block, expPrevResult, false]
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
                // note, there's a bug where block.number is incorrect in ganache.
                // https://github.com/trufflesuite/ganache/issues/204
                console.log(`Dice thinks this result will be: ${diceResult}. [may be incorrect]`);
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
            console.log(`✓ Balance >= bankroll (${balance} >= ${bankroll})`);
        } else {
            console.log(`Bankroll: ${bankroll}, balance: ${balance}`);
            throw new Error(`Bankroll should never be greater than balance!`);
        }
    }

    async function getRoll(id) {
        const arr = await dice.rolls(id);
        return {
            user: arr[0],
            bet: arr[1],
            number: arr[2],
            payout: arr[3],
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

