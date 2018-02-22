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
    const dummyTreasury = accounts[5];
    const anon = accounts[6];
    var vp;
    var registry;

    const MIN_BET = new BigNumber(.001e18);
    const MAX_BET = new BigNumber(.5e18);

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
            describe("Removes all funding when passed large number", function(){
                it("remove all funding", function(){
                    return assertRemovesFunding(10e18);  
                });
                it("Add some funding back", function(){
                    return assertAddsFunding(2e18);    
                });
            });
        });
    });

    describe("Admin Functions", function(){

    });

    describe("Do some games", async function(){
        assertDoesAGame();
        assertDoesAGame();
        assertDoesAGame();
    });

    function assertDoesAGame(){
        const BET = new BigNumber(.001e18);
        var iBlockhash;
        var GAME_ID;
        var DRAW_ARR = [1, 0, 0, 1, 1];
        var DRAW_UINT8 = DRAW_ARR.reduce((c,e,i) => e ? c + Math.pow(2, i) : c, 0);
        var expIHand;
        var expDHand;
        var expHandRank;
        it("Accepts a bet", async function(){
            GAME_ID = (await vp.curId()).plus(1)
            await createDefaultTxTester()
                .doTx([vp, "bet", {value: .001e18, from: player1}])
                .assertSuccess()
                .assertGasUsedLt(73000)
                .assertOnlyLog("BetSuccess", {})
                .withTxResult((res)=>{
                    iBlockhash = new BigNumber(res.receipt.blockHash);
                    expIHand = getIHand(iBlockhash, GAME_ID);
                    console.log(`Initial hand should be: ${expIHand}`);
                    return testUtil.mineBlocks(1);
                })
                .assertCallReturns([vp, "getIHand", GAME_ID], ()=>expIHand.toNumber())
                .start();
        });
        it("Draws", async function(){
            await createDefaultTxTester()
                .doTx([vp, "draw", GAME_ID, DRAW_UINT8, iBlockhash, {from: player1}])
                .assertSuccess()
                .assertGasUsedLt(42000)
                .assertOnlyLog("DrawSuccess")
                .withTxResult((res)=>{
                    const dBlockhash = res.receipt.blockHash;
                    expDHand = getDHand(dBlockhash, GAME_ID, expIHand, DRAW_ARR);
                    expHandRank = expDHand.getRank();
                    console.log(`Final hand should be: ${expDHand}, with rank: ${expHandRank}`);
                    return testUtil.mineBlocks(1);
                })
                .assertCallReturns([vp, "getDHand", GAME_ID], ()=>expDHand.toNumber())
                .assertCallReturns([vp, "getDHandRank", GAME_ID], ()=>expHandRank)
                .start();
        });
        it("Finalizes", async function(){
            var game;
            await createDefaultTxTester()
                .doTx([vp, "finalize", GAME_ID, false, {from: player1}])
                .assertSuccess()
                .assertGasUsedLt(75000)
                .assertOnlyLog("FinalizeSuccess")
                .start(); 
        })
    }

    async function getGame(id) {
        const arr = await vp.games(id);
        return {
            id: arr[0],
            user: arr[1],
            bet: arr[2],
            payTableId: arr[3],
            iBlock: arr[4],
            iHand: arr[5],
            draws: arr[6],
            dBlock: arr[7],
            dHand: arr[8],
            handRank: arr[9]
        };
    }

    async function assertBets(player, bet) {
        await createDefaultTxTester()
                .doTx([vp, "bet", {value: .1e18, from: player1}])
                .assertSuccess()
                .assertGasUsedLt(71000)
                .assertOnlyLog("BetSuccess", {})
                .withTxResult((res)=>{
                    const blockhash = res.receipt.blockHash;
                    expIHand = getIHand(blockhash, GAME_ID);
                    console.log(`Initial hand should be: ${expIHand}`);
                    return testUtil.mineBlocks(1);
                })
                .assertCallReturns([vp, "getIHand", GAME_ID], ()=>expIHand.toNumber())
                .start();
    }
    async function assertDraws(player, id) {

    }
    async function assertFinalizes(player, id) {

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

