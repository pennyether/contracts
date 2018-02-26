const Registry = artifacts.require("Registry");
const VideoPoker = artifacts.require("VideoPoker");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('VideoPoker', function(){
    const accounts = web3.eth.accounts;
    const regOwner = accounts[0];
    const admin = accounts[1];
    const player1 = accounts[2];
    const player2 = accounts[3];
    const player3 = accounts[4];
    const players = [player1, player2, player3];
    const dummyTreasury = accounts[5];
    const anon = accounts[6];
    var vp;
    var registry;

    const DEFAULT_MIN_BET = new BigNumber(.001e18);
    const DEFAULT_MAX_BET = new BigNumber(.5e18);
    const DEFAULT_PAYTABLE = [0, 800, 50, 25, 9, 6, 4, 3, 2, 1, 0];
    const MIN_BET = new BigNumber(.0005e18);
    const MAX_BET = new BigNumber(.2e18);
    const PAYTABLE = DEFAULT_PAYTABLE.slice().map(x=> x>0 ? x+1 : 0);

    before("Set up VideoPoker contract.", async function(){
        const addresses = {
            admin: admin,
            player1: player1, 
            player2: player2,
            player3: player3,
            dummyTreasury: dummyTreasury,
            anon: anon
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a Registry, with ADMIN and TREASURY set.");
        await createDefaultTxTester()
            .doNewTx(Registry, [regOwner], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                registry = res.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();
        await createDefaultTxTester()
            .doTx([registry, "register", "ADMIN", admin, {from: regOwner}])
            .assertSuccess().start();
        await createDefaultTxTester()
            .doTx([registry, "register","TREASURY", dummyTreasury, {from: regOwner}])
            .assertSuccess().start();

        this.logInfo("Create the VideoPoker instance.");
        await createDefaultTxTester()
            .doNewTx(VideoPoker, [registry.address], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                vp = res.contract;
                plugins.addAddresses({videoPoker: vp.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe("Check settings", function(){
        it("Current paytable is the default", function(){
            return createDefaultTxTester()
                .assertCallReturns([vp, "curPayTableId"], 0)
                .assertCallReturns([vp, "numPayTables"], 1)
                .assertCallReturns([vp, "getPayTable", 0], DEFAULT_PAYTABLE)
                .start();
        });
        it("minBet and maxBet are as expected", function(){
            return createDefaultTxTester()
                .assertCallReturns([vp, "minBet"], DEFAULT_MIN_BET)
                .assertCallReturns([vp, "maxBet"], DEFAULT_MAX_BET)
                .assertCallReturns([vp, "curMaxBet"], 0)
                .start();
        });
        it("curMaxBet is 0, since there's no balance", function(){
            return createDefaultTxTester()
                .assertCallReturns([vp, "curMaxBet"], 0)
                .start();
        });
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
                    .doTx([vp, "removeFunding", .1e18, {from: anon}])
                    .assertInvalidOpCode()
                    .start();
            });
            it("Works for admin", function(){
                return assertRemovesFunding(.1e18)
            });
            it("Removes all funding when passed large number", function(){
                return assertRemovesFunding(10e18);  
            });
            it("Add some funding back", function(){
                return assertAddsFunding(5e18);    
            });
        });

        it(".curMaxBet() is correct value.", async function(){
            return assertCurMaxBet();
        });
    });

    describe("Admin Functions", function(){
        // todo: test setting paytables
        describe(".addPayTable()", function(){
            const newPayTable = PAYTABLE.slice(1, -1);
            const callParams = [vp, "addPayTable"].concat(newPayTable);
            it("is not callable from anon", function(){
                return createDefaultTxTester()
                    .doTx(callParams.concat({from: anon}))
                    .assertInvalidOpCode()
                    .start();
            });
            it("works from admin", async function(){
                const expPtId = await vp.numPayTables();
                return createDefaultTxTester()
                    .doTx(callParams.concat({from: admin}))
                    .assertSuccess()
                    .assertOnlyLog("PayTableAdded", {
                        time: null,
                        admin: admin,
                        payTableId: expPtId
                    })
                    .assertCallReturns([vp, "getPayTable", expPtId], PAYTABLE)
                    .assertCallReturns([vp, "numPayTables"], expPtId.plus(1))
                    .start();
            });
        });

        describe(".changeSettings()", function(){
            const callParams = [vp, "changeSettings", MIN_BET, MAX_BET, 1];
            it("is not callable from anon", function(){
                return createDefaultTxTester()
                    .doTx(callParams.concat({from: anon}))
                    .assertInvalidOpCode()
                    .start();
            });
            it("works from admin", function(){
                return createDefaultTxTester()
                    .doTx(callParams.concat({from: admin}))
                    .assertSuccess()
                    .assertOnlyLog("SettingsChanged", {
                        time: null,
                        admin: admin
                    })
                    .assertCallReturns([vp, "minBet"], MIN_BET)
                    .assertCallReturns([vp, "maxBet"], MAX_BET)
                    .start();
            });
        })
    });


    describe("Do a bunch of games.", async function(){
        const minBet = await vp.minBet();
        const maxBet = await vp.maxBet();
        //describeDoesGame(playerNum, betSize, drawsArr, iHandTimeout, dHandTimeout)
        describeDoesGame("Bet too small", 1, minBet.minus(1));
        describeDoesGame("Bet too large", 2, minBet.plus(1));
        describeDoesGame("Bet above curMaxBet", 1, "curMaxBet");
        describeDoesGame("Bet and draw", 2, minBet, [0,0,0,0,1]);
        describeDoesGame("Bet and draw", 1, minBet, [0,0,0,1,0]);
        describeDoesGame("Bet and draw", 2, minBet, [0,0,1,0,0]);
        describeDoesGame("Bet and draw", 1, minBet, [0,1,0,0,0]);
        describeDoesGame("Bet and draw", 2, minBet, [1,0,0,0,0]);
        describeDoesGame("Bet and draw all cards", 1, minBet, [1,1,1,1,1]);
        describeDoesGame("Bet and draw", 2, minBet, [0,0,0,0,0]);
        describeDoesGame("Bet and draw", 1, minBet, [0,1,0,1,0]);
        describeDoesGame("Bet and draw, timeout initial hand", 2, minBet, [0,0,1,1,0], true);
        describeDoesGame("Bet and draw nothing, timeout initial hand", 1, minBet, [0,0,0,0,0], true);
        describeDoesGame("Bet and draw all cards, timeout initial hand", 2, minBet, [1,1,1,1,1], true);
        describeDoesGame("Bet and draw, timeout dHand", 1, minBet, [0,1,0,1,1], false, true);
        describeDoesGame("Bet and dont draw, timeout dHand", 2, minBet, [0,0,0,0,0], false, true);
        describeDoesGame("Bet and draw all cards, timeout dHand", 1, minBet, [1,1,1,1,1], false, true);
        describeDoesGame("Bet and draw, timeout both hands", 2, minBet, [1,0,1,0,1], true, true);
        describeDoesGame("Bet and dont draw, timeout both hands", 1, minBet, [0,0,0,0,0], true, true);
        describeDoesGame("Bet and draw all, timeout both hands", 3, minBet, [1,1,1,1,1], true, true);
        describeDoesGame("Bet and draw, timeout both hands", 3, minBet, [0,1,1,1,1], true, true);
    });

    // Some things to test:
    //   - Drawing 0 cards (skip to finalize)
    //   - Drawing 5 cards
    //   - Make sure finalizing fails before drawing
    //   - Try to double-finalize
    //   - Betting:
    //      - can't bet above curMax()
    //      - can't be above max
    //      - can't be below min
    //   - Drawing:
    //      - check for:
    //          - invalid game
    //          - wrong user
    //          - must wait for initial block
    //          - between 1 and 4 draws
    //          - not already called
    //      - test hashCheck works
    //      - warning: sets to full draw if initial hand is old
    //   - Finalizing:
    //      - check for:
    //          - invalid game
    //          - wrong user
    //          - no initial hand
    //          - same block
    //          - already finalized
    //      - 1-5 draws:
    //          - if dBlock is fresh:
    //              - works
    //          - if dBlock is old:
    //              - warning: use iHand
    //      - 0 draws:
    //          - if iBlock is fresh:
    //              - use initial hand
    //          - if iBlock is old:
    //              - fail: set draws to 5, recall.
    //      - On win:
    //          - credits account
    //          - increments total owed


    // Ensure all of these conditions are met via calls to describeDoesGame.
    var conditions = {
        bet: {
            minBet: false,
            maxBet: false,
            curMaxBet: false
        },
        draw: {
            permutation: {
                // 0 - 32
            },
            iHandTimeout: false,
        },
        finalize: {
            iHandTimeout: false,
            dHandTimeout: false,
            bothHandTimeout: false,
            noDraws: {
                iHandTimeout: false,
                bothHandTimeout: false
            },
            win: false
        },
    };

    async function describeDoesGame(title, playerNum, betSize, drawsArr, iHandTimeout, dHandTimeout) {
        if (!drawsArr) drawsArr = [0,0,0,0,];
        const drawsNum = drawsArr.reduce((c,e,i) => e ? c + Math.pow(2, i) : c, 0);

        describe(title, async function(){
            betSize = betSize == "curMaxBet"
                ? (await vp.curMaxBet()).plus(1)
                : new BigNumber(betSize);

            // determine if bet is too large, and assert if it can or cannot bet.
            var shouldPass = true;
            const expectedId = (await vp.curId()).plus(1);

            // Do initial bet, which we may expect to fail.
            const logInfo = this.logInfo;
            await (async function(){
                const curMaxBet = await vp.curMaxBet();
                const maxBet = await vp.maxBet();
                const minBet = await vp.minBet();
                var shouldPass = true;
                if (betSize.lt(minBet)) {
                    conditions.bet.minBet = true;
                    logInfo(`This tests the minBet condition.`);
                    shouldPass = false;
                }
                if (betSize.gt(maxBet)) {
                    conditions.bet.maxBet = true;
                    logInfo(`This tests the maxBet condition.`);
                    shouldPass = false;
                }
                if (betSize.gt(curMaxBet)) {
                    conditions.bet.curMaxBet = true;
                    logInfo(`This tests the curMaxBet condition.`);
                    logInfo(`VideoPoker cannot afford to pay out two max-bet Royal Flushes.`);
                    shouldPass = false;
                }
                // Make sure it bets correctly. This includes failures for any reason.
                itBets(playerNum, betSize);
            }());

            if (!shouldPass) {
                this.logInfo("Will not test drawing or finalizing -- the bet should fail.");
                return;
            }

            // Update conditions, and do draw.
            conditions.draw.permutation[drawsNum] = true;
            if (iHandTimeout) conditions.draw.iHandTimeout = true;
            // Make sure it draws correctly. This includes failures/warnings.
            itDraws(expectedId, playerNum, drawsNum, iHandTimeout);
            
            // todo: remove
            this.logInfo("Not testing anything else yet...");
            return;

            // Update conditions, and do finalization.
            if (drawsNum != 0) {
                if (iHandTimeout && !dHandTimeout)
                    conditions.finalize.iHandTimeout = true;
                if (!iHandTimeout && dHandTimeout)
                    conditions.finalize.dHandTimeout = true;    
            } else {
                if (iHandTimeout && !dHandTimeout)
                    conditions.finalize.noDraws.iHandTimeout = true;
                if (iHandTimeout && dHandTimeout)
                    conditions.finalize.noDraws.bothHandTimeout = true;
                
            }
            // Make sure it finalizes correctly. This includes failures/warnings.
            itFinalizes(expectedId, playerNum, dHandTimeout);
        });
    }

    // Tests that attempting to bet works properly.
    async function itBets(playerNum, betSize) {
        it(`Player ${playerNum+1} tries to bet ${eth(betSize)}.`, async function(){
            // computed expected gas, logs
            const player = players[playerNum-1];
            var expGas = new BigNumber(27000);
            var expLogs = [];
            var expSuccess = true;
            var expUserId;
            var expCurId = await vp.curId();
            const expGameId = expCurId.plus(1);

            // Test bet size, record expected error message.
            var errMsg;
            if (betSize.lt(await vp.minBet())) {
                errMsg = "Bet too small.";
            } else if (betSize.gt(await vp.maxBet())) {
                errMsg = "Bet too large.";
            } else if (betSize.gt(await vp.curMaxBet())) {
                errMsg = "The bankroll is too low.";
            }

            // Determine which log should be pushed.
            const shouldSucceed = !errMsg;
            if (shouldSucceed) {
                expLogs.push(["BetSuccess", {
                    time: null,
                    user: player,
                    id: expGameId,
                    bet: betSize
                }]);
                expGas = expGas.plus(26000);    // 1 write, 1 update, SLOADs
                expCurId = expGameId;
            } else {
                expLogs.push(["BetFailure", {
                    user: player,
                    bet: betSize,
                    msg: errMsg
                }]);
                expGas = expGas.plus(11000);    // refund ETH
            }

            // whether or not should create a new user id
            var expUserId = await vp.userIds(player);
            var expCurUserId = await vp.curUserId();
            if (shouldSucceed && expUserId.equals(0)) {
                expUserId = expCurUserId.plus(1);
                expCurUserId = expUserId;
                expGas = expGas.plus(41000);    // 2 writes, SLOADs
            }

            // do TX, and assert success and proper deltas and logs
            const txTester = createDefaultTxTester()
                .startLedger([vp, player])
                .doTx([vp, "bet", {from: player, value: betSize}])
                .stopLedger()
                .assertSuccess();

            // assert delta
            var expIHand;
            if (shouldSucceed) {
                txTester
                    .assertDelta(vp, betSize)
                    .assertDeltaMinusTxFee(player, betSize.mul(-1));
            } else {
                txTester
                    .assertNoDelta(vp)
                    .assertDeltaMinusTxFee(player, 0);
            }

            // assert logs
            txTester.assertLogCount(expLogs.length);
            expLogs.forEach(function(l){
                txTester.assertLog(l[0], l[1]);
            })

            // assert game is saved correctly, and .getIHand() works
            if (shouldSucceed) {
                const expPayTableId = await vp.curPayTableId();
                var expBlockNumber = testUtil.getBlock();
                var expIHand;
                txTester
                    .withTxResult((res)=>{
                        expBlockNumber = res.receipt.blockNumber;
                        expIHand = getIHand(res.receipt.blockHash, expGameId);
                        // mine a block so .getIHand() works in ganache
                        testUtil.mineBlocks(1);
                    })
                    .assertCallReturns([vp, "games", expGameId],
                        ()=>[expUserId, betSize, expPayTableId, expBlockNumber, 0, 0, 0, 0, 0])
                    .assertCallReturns([vp, "getIHand", expGameId], ()=>expIHand.toNumber());
            }

            // assert proper gasUsed
            return txTester
                .assertCallReturns([vp, "curId"], expCurId)
                .assertCallReturns([vp, "curUserId"], expCurUserId)
                .assertGasUsedLt(expGas)
                .start();
        });
    }

    // Tests that attempting to draw works properly.
    // If doTimeout is true, will mineBlocks to ensure hash is old and not used.
    async function itDraws(id, playerNum, draws, doTimeout) {
        // computed expected gas, logs
        it(`Draws game ${id} with ${draws}`, async function(){
            const player = players[playerNum-1];
            const game = await getGame(id);
            var expGas = new BigNumber(27000);
            var expLogs = [];
            var expSuccess = true;
            var expUserId;
        });

        // test that id is correct
        // test that player is correct (for given id)
        // test that draws is not 0, or > 63
        // test that is not already drawn

        // do TX with invalid hashCheck

        // do TX, assert success, no deltas, and proper logs

        // assert saved game has expected state


        // for successful cases, retest that drawing fails (already drawn)
    }

    // For the given game state, and doTimeout, ensure everything works as expected.
    // If doTimeout is true, will mineBlocks to ensure hash is old and not used.
    async function itFinalizes(id, player, doTimeout) {
        // computed expected gas
        // computed expected logs
        // test that id is correct
        // test that player is correct
        // test that is not already defined
    }

    function assertDoesAGame(){
        const BET = new BigNumber(.001e18);
        var game;
        var iBlockhash;
        var GAME_ID;
        var DRAW_ARR = [1, 0, 0, 1, 1];
        var DRAW_UINT8 = DRAW_ARR.reduce((c,e,i) => e ? c + Math.pow(2, i) : c, 0);
        var expIHand;
        var expDHand;
        var expHandRank;
        it("Accepts a bet", async function(){
            GAME_ID = (await vp.curId()).plus(1)
            const existingUser = (await vp.userIds(player1)).gt(0);
            const expGas = existingUser ? 54000 : 94000;
            await createDefaultTxTester()
                .doTx([vp, "bet", {value: .001e18, from: player1}])
                .assertSuccess()
                .assertOnlyLog("BetSuccess", {})
                .withTxResult(async function(res){
                    game = await getGame(GAME_ID);
                    iBlockhash = res.receipt.blockHash;
                    expIHand = getIHand(iBlockhash, GAME_ID);
                    console.log(`Initial hand should be: ${expIHand}`);
                    testUtil.mineBlocks(1);
                })
                .assertGasUsedLt(expGas)
                .assertCallReturns([vp, "getIHand", GAME_ID], ()=>expIHand.toNumber())
                .start();
        });
        it("Draws", async function(){
            await createDefaultTxTester()
                .doTx([vp, "draw", GAME_ID, DRAW_UINT8, iBlockhash, {from: player1}])
                .assertSuccess()
                .assertOnlyLog("DrawSuccess")
                .withTxResult((res)=>{
                    const dBlockhash = res.receipt.blockHash;
                    expDHand = getDHand(dBlockhash, GAME_ID, expIHand, DRAW_ARR);
                    expHandRank = expDHand.getRank();
                    console.log(`Final hand should be: ${expDHand}, with rank: ${expHandRank}`);
                    return testUtil.mineBlocks(1);
                })
                .assertGasUsedLt(37000)
                .assertCallReturns([vp, "getDHand", GAME_ID], ()=>expDHand.toNumber())
                .assertCallReturns([vp, "getDHandRank", GAME_ID], ()=>expHandRank)
                .start();
        });
        it("Finalizes", async function(){
            var game;
            const hasCredits = (await vp.credits(player1)).gt(0);
            const expGas = expHandRank <= 9
                ? (hasCredits ? 60000 : 72000)
                : 45000;
            await createDefaultTxTester()
                .doTx([vp, "finalize", GAME_ID, false, {from: player1}])
                .assertSuccess()
                .assertOnlyLog("FinalizeSuccess")
                .assertGasUsedLt(expGas)
                .start(); 
        })
    }

    async function getGame(id) {
        const arr = await vp.games(id);
        const userId = arr[0];
        const userAddr = await vp.userAddresses[userId];
        return {
            user: userAddr,
            bet: arr[1],
            payTableId: arr[2],
            iBlock: arr[3],
            iHand: arr[4],
            draws: arr[5],
            dBlock: arr[6],
            dHand: arr[7],
            handRank: arr[8]
        };
    }

    async function assertAddsFunding(amount) {
        amount = new BigNumber(amount);
        const expFunding = (await vp.funding()).plus(amount);
        return createDefaultTxTester()
            .startLedger([anon, vp])
            .doTx([vp, "addFunding", {from: anon, value: amount}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(vp, amount)
                .assertDeltaMinusTxFee(anon, amount.mul(-1))
            .assertOnlyLog("FundingAdded", {
                time: null,
                sender: anon,
                amount: amount,
                funding: expFunding
            })
            .assertCallReturns([vp, "funding"], expFunding)
            .start();
    }

    async function assertRemovesFunding(amount) {
        amount = new BigNumber(amount);
        const funding = await vp.funding();
        const credits = await vp.totalCredits();
        const balance = await testUtil.getBalance(vp);

        var expAmount = amount;
        const threshold = BigNumber.min(funding, balance).minus(credits);
        if (amount.gt(threshold)) {
            expAmount = balance;
            console.log(`${amount} exceeds threshold, should remove only ${expAmount}.`);
        }
        const expFunding = funding.minus(expAmount);

        return createDefaultTxTester()
            .startLedger([admin, vp, dummyTreasury])
            .doTx([vp, "removeFunding", amount, {from: admin}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(vp, expAmount.mul(-1))
                .assertDelta(dummyTreasury, expAmount)
                .assertLostTxFee(admin)
            .assertOnlyLog("FundingRemoved", {
                time: null,
                recipient: dummyTreasury,
                amount: expAmount,
                funding: expFunding
            })
            .assertCallReturns([vp, "funding"], expFunding)
            .start();
    }

    async function assertCurMaxBet(){
        const balance = await testUtil.getBalance(vp.address);
        const funding = await vp.funding();
        const min = BigNumber.min(balance, funding);
        const curPayTableId = await vp.curPayTableId();
        const rfMultiple = (await vp.getPayTable(curPayTableId))[1].mul(2);
        const expCurMaxBet = min.div(rfMultiple);
        return createDefaultTxTester()
            .assertCallReturns([vp, "curMaxBet"], expCurMaxBet)
            .start();
    }
});

function Hand(numOrArray) {
    const _cards = (function(){
        if (!numOrArray) return [];
        function cardFromNum(cardNum) {
            if (typeof cardNum !== "number" || cardNum > 51 || cardNum < 0) return null;
            return {
                cardNum: cardNum,
                val: cardNum % 13,
                suit: Math.floor(cardNum / 13),
                isAce: cardNum % 13 == 0
            };
        }

        var arr;
        if (Array.isArray(numOrArray)){
            arr = numOrArray.map(cardFromNum);  
        } else {
            numOrArray = numOrArray.toNumber ? numOrArray.toNumber() : numOrArray;
            arr = [0,1,2,3,4].map(i => {
                const mask = 63 * Math.pow(2, 6*i);
                const cardNum = (numOrArray & mask) / Math.pow(2, 6*i);
                return cardFromNum(cardNum);
            });
        }
        arr = arr.filter(c => !!c);
        if (arr.length != 5) arr = [];
        return arr;
    }());

    this.cards = _cards;
    
    this.clone = function(){
        return new Hand(_cards);
    }

    this.toNumber = function(){
        var num = 0;
        _cards.forEach((c,i) => {
            const mask = c.cardNum * Math.pow(2, 6*i);
            num = num + mask;
        });
        return num;
    }

    this.toString = function(){
        if (_cards.length == 0) return '[InvalidHand]';
        return _cards.map(c => {
            const valStr = (function(val){
                if (val == 0) return 'A';
                if (val <= 9) return `${val+1}`;
                if (val == 10) return "J";
                if (val == 11) return "Q";
                if (val == 12) return "K";
            }(c.val));
            const suitStr = (function(suit){
                if (suit == 0) return 's';
                if (suit == 1) return 'h';
                if (suit == 2) return 'd';
                if (suit == 3) return 'c';
            }(c.suit));
            return `${valStr}${suitStr}`;
        }).join(", ") + ` (${this.toNumber()})`;
    }

    this.getRank = function(){
        if (_cards.length == 5) {
            if (this.isRoyalFlush()) return 1;
            else if (this.isStraightFlush()) return 2;
            else if (this.isFourOfAKind()) return 3;
            else if (this.isFullHouse()) return 4;
            else if (this.isFlush()) return 5;
            else if (this.isStraight()) return 6;
            else if (this.isThreeOfAKind()) return 7;
            else if (this.isTwoPair()) return 8;
            else if (this.isJacksOrBetter()) return 9;
            else return 10;
        } else {
            return 11;
        }
    }

    this.isRoyalFlush = function() {
        const lowVal = min(_cards.map(c => c.val));
        return this.isStraightFlush() && lowVal == 9;
    }
    this.isStraightFlush = function() {
        return this.isStraight() && this.isFlush();
    }
    this.isFourOfAKind = function(){
        return hasCounts([4,1]);
    }
    this.isFullHouse = function(){
        return hasCounts([3,2]);
    }
    this.isFlush = function(){
        return _cards.every(c => c.suit == _cards[0].suit);
    }
    this.isStraight = function(){
        if (!hasCounts([1,1,1,1,1])) return;
        const hasAce = _cards.some(c => c.isAce);
        const highVal = max(_cards.map(c => c.val));
        const lowVal = min(_cards.map(c => c.val));
        return hasAce
            ? highVal == 4 || lowVal == 9
            : highVal - lowVal == 4;
    }
    this.isThreeOfAKind = function(){
        return hasCounts([3,1,1]);
    }
    this.isTwoPair = function(){
        return hasCounts([2,2,1]);
    }
    this.isJacksOrBetter = function(){
        if (!hasCounts([2,1,1,1])) return;
        const counts = (new Array(13)).fill(0);
        _cards.forEach(c => counts[c.val]++);
        return [10,11,12,13].some(val => counts[val]>1);
    }

    function min(arr){ return Math.min.apply(Math, arr); }
    function max(arr){ return Math.max.apply(Math, arr); }
    function hasCounts(arr) {
        var counts = (new Array(13)).fill(0);
        _cards.forEach(c => counts[c.val]++);
        counts = counts.filter(c => !!c).sort();
        return arr.sort().every((exp,i) => exp===counts[i]);
    }
}

// - blockhash: a string of hexEncoded 256 bit number
// - gameId: a number or BigNumber
function getIHand(blockhash, gameId) {
    const idHex = toPaddedHex(gameId, 32);
    const hexHash = web3.sha3(blockhash + idHex, {encoding: "hex"});
    const cardNums = getCardsFromHash(hexHash, 5);
    return new Hand(cardNums);
}

// - blockhash: a string of hexEncoded 256 bit number
// - gameId: a number or BigNumber
// - iHand: should be a Hand object of the original hand.
// - drawsArr: should be an array[5] => boolean
//      where "true" means to replace that card in iHand
function getDHand(blockhash, gameId, iHand, drawsArr) {
    // get 5 new cards
    const idHex = toPaddedHex(gameId, 32);
    const hexHash = web3.sha3(blockhash + idHex, {encoding: "hex"});
    const excludedCardNums = iHand.cards.map(c => c.cardNum);
    const newCards = getCardsFromHash(hexHash, 5, excludedCardNums);
    const oldCards = iHand.cards.map(c => c.cardNum);

    // get 5 cards
    const cards = drawsArr.map((useNew, i)=>{
        return useNew ? newCards[i] : oldCards[i];
    })
    return new Hand(cards);
}

function getCardsFromHash(hexHash, numCards, excludedCardNums) {
    if (!excludedCardNums) excludedCardNums = [];
    const cardNums = [];
    while (cardNums.length < numCards) {
        const cardNum = (new BigNumber(hexHash)).mod(52).toNumber();
        if (excludedCardNums.indexOf(cardNum) === -1) {
            excludedCardNums.push(cardNum);
            cardNums.push(cardNum);
        }
        hexHash = web3.sha3(hexHash, {encoding: "hex"});
    }
    return cardNums;
}

function toPaddedHex(num, bits) {
    num = new BigNumber(num);
    const targetLen = Math.ceil(bits / 4);
    const hexStr = num.toString(16);
    if (hexStr.length > targetLen)
        throw new Error(`Cannot convert ${num} to ${bits} bits... it's too large.`);
    const zeroes = (new Array(targetLen-hexStr.length+1)).join("0");
    return `${zeroes}${hexStr}`;
}

function cardToUnicode(i){
    const suit = String.fromCharCode(Math.floor(i/13) + 'A'.charCodeAt(0));
    var val = i % 13;
    if (val > 10) val = val+1;
    val = Number(val+1).toString(16);
    return String.fromCodePoint(code);
}

function eth(val) {
    val = new BigNumber(val);
    return val.div(1e18).toFixed(5) + " ETH";
}