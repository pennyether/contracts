const VideoPokerUtils = artifacts.require("VideoPokerUtils");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;
const pUtils = require("../helpers/PokerUtils.js").Create(web3);
const Hand = pUtils.Hand;
const getCardsFromHash = pUtils.getCardsFromHash;
const drawCardsFromHash = pUtils.drawCardsFromHash;

describe('VideoPokerUtils', function(){
	const accounts = web3.eth.accounts;
    const anon = accounts[1];
    const NUM_HANDS = 1000;
    var vpu;

	before("Set up VideoPokerUtils contract.", async function(){
		const addresses = {anon: anon};
        await createDefaultTxTester().nameAddresses(addresses).start();

        await createDefaultTxTester()
            .doNewTx(VideoPokerUtils, [], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                vpu = res.contract;
                plugins.addAddresses({videoPokerUtils: vpu.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });


    async function assertRank(hand, rank, doPrint) {
		const jsRank = hand.getRank();
		if (jsRank !== rank)
			throw new Error(`Local: ${hand} expected to be ${rank}, but instead was ${jsRank}`);

		const vpuRank = (await vpu.getHandRank(hand.toNumber())).toNumber();
		if (vpuRank !== rank)
			throw new Error(`Solidity: ${hand} expected to be ${rank}, but instead was ${vpuRank}`);

		if (doPrint) console.log(`${hand} is rank ${rank}`);
	}

    describe("Library Tests", function(){
    	it("Detects Royal Flush", async function(){
    		await assertRank(new Hand([9,10,11,12,0]), 1);
    	});
    	it("Detects Straight Flush", async function(){
    		await assertRank(new Hand([20,21,22,23,24]), 2);
    	});
    	it("Detects Four of a Kind", async function(){
    		await assertRank(new Hand([5,18,31,0,44]), 3);
    	});
    	it("Detects Full House", async function(){
    		await assertRank(new Hand([2,15,28,5,18]), 4);
    	});
    	it("Detects Full House (Ace Trips)", async function(){
    		await assertRank(new Hand([0,13,26,5,18]), 4);
    	});
    	it("Detects Full House (Ace Pair)", async function(){
    		await assertRank(new Hand([0,13,31,5,18]), 4);
    	});
    	it("Detects Flush", async function(){
    		await assertRank(new Hand([15,16,18,19,20]), 5);
    	});
    	it("Detects Straight", async function(){
    		await assertRank(new Hand([3,17,31,45,20]), 6);
    	});
    	it("Detects Straight (Ace High)", async function(){
    		await assertRank(new Hand([9,23,37,51,0]), 6);
    	});
    	it("Detects Straight (Ace Low)", async function(){
    		await assertRank(new Hand([4,14,28,42,0]), 6);
    	});
    	it("Detects Three of a Kind", async function(){
    		await assertRank(new Hand([2, 15, 28, 29, 4]), 7);
    	});
    	it("Detects Three of a Kind (Aces)", async function(){
    		await assertRank(new Hand([0, 13, 26, 29, 4]), 7);
    	});
    	it("Detects Two Pair", async function(){
    		await assertRank(new Hand([5, 18, 16, 29, 4]), 8);
    	});
    	it("Detects Two Pair (Aces)", async function(){
    		await assertRank(new Hand([0, 13, 16, 29, 4]), 8);
    	});
    	it("Detects Jacks or Better", async function(){
    		await assertRank(new Hand([0, 13, 14, 15, 16]), 9);
    	});
    	it("Detects Jacks or Better (Aces)", async function(){
    		await assertRank(new Hand([0, 13, 14, 15, 16]), 9);
    	});
    	it("Detects High Card", async function(){
    		await assertRank(new Hand([5, 6, 7, 8, 44]), 10);
    	});
    	it("Detects High Card (low pair)", async function(){
    		await assertRank(new Hand([9, 22, 5, 6, 7]), 10);
    	});
    	it("Detects NonComputable (0)", async function(){
    		await assertRank(new Hand([0,0,0,0,0]), 11);
    	});
    	it("Detects NonComputable (Invalid Card)", async function(){
    		await assertRank(new Hand([0,1,2,3,52]), 11);
    	});
    });

    describe("Test card generation algorithm.", async function(){
    	function testCardFrequency(hands) {
    		const counts = {};
        	for (var i=0; i<52; i++) counts[i] = 0;
        	hands.forEach(hand => {
        		hand.cards.forEach(c => {
        			counts[c.cardNum]++;
        		});
        	});
        	// Test that all cards occur within 3 stddevs of expected count:
        	//  https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval
        	(function(){
        		const p = 1 / 52;
	    		const avg = (NUM_HANDS*5) / 52;
	    		const stdDev = Math.sqrt(NUM_HANDS*5*p*(1-p));
	    		const minCount = Math.floor(avg - 3*stdDev);
	    		const maxCount = Math.ceil(avg + 3*stdDev);
	        	Object.keys(counts).forEach(cardNum => {
	        		if (cardNum > 51)
	        			throw new Error('Invalid card: ${cardNum}');
	        		
	        		const count = counts[cardNum];
	        		if (count < minCount || count > maxCount){
	        			console.log("Card Distribution:", counts);
	        			throw new Error(`${cardNum} was drawn ${count} times. Average is ${avg}.`);
	        		}
	        	})
	        	console.log(`Frequencies of each card were within: ${minCount} and ${maxCount}.`);
        		console.log(`Mean: ${avg}, stdDev: ${stdDev}`);
        	}());
    	}

    	function testRankFrequency(hands) {
    		const expectedFreq = {
    			1: 1/649740,
    			2: 1/72193,
    			3: 1/4165,
    			4: 1/694,
    			5: 1/509,
    			6: 1/255,
    			7: 1/47,
    			8: 1/21,
    			9: 1/7.69
    		};
    		const counts = {}
    		hands.forEach(hand => {
    			const rank = hand.getRank();
    			counts[rank] = counts[rank] ? counts[rank]+1 : 1;
    		});
    		Object.keys(expectedFreq).forEach(rank => {
    			const p = expectedFreq[rank];
    			const avg = NUM_HANDS * p;
    			const stdDev = Math.sqrt(hands.length * p * (1-p));
    			const minCount = Math.floor(avg - 3*stdDev);
    			const maxCount = Math.ceil(avg + 3*stdDev);
    			const count = counts[rank] || 0;
    			const probStr = `${avg} +/- ${3*stdDev}`;
    			if (count < minCount || count > maxCount){
    				throw new Error(`Rank: ${rank} occurred ${count} times. Expected: ${probStr}`);
    			}
    			console.log(`Rank ${rank} occurred ${count} times. Expected: ${probStr}`);
    		});
    		console.log(`Frequencies of hand ranks were acceptable.`);
    	}

    	function getBestHand(hands) {
    		var bestHand;
    		for (var i=0; i<hands.length; i++) {
    			const hand = hands[i];
    			if (!bestHand) bestHand = hand;
    			if (hand.getRank() < bestHand.getRank()) bestHand = hand;
    		}
    		return bestHand;
    	}

    	const I_HANDS = [];
    	describe("Test drawing initial cards", function(){
    		it(`Generate and rank ${NUM_HANDS} hands.`, async function(){
	        	for (var i=0; i<NUM_HANDS; i++) {
	        		const seed = web3.sha3(Math.random().toString());
	        		const hand = new Hand(await vpu.getHand(new BigNumber(seed)));
	        		const expHand = new Hand(getCardsFromHash(seed, 5));
	        		if (hand.toNumber() !== expHand.toNumber()) {
	        			throw new Error(`Expected ${expHand}, but got ${hand}`);
	        		} else {
	        			const chunkSize = Math.floor(NUM_HANDS/10);
	        			const numHands = i+1;
	        			if (numHands >= chunkSize && numHands % chunkSize == 0)
	        				console.log(`Generated and ranked ${numHands} hands correctly. Latest one: ${hand}`);
	        		}
	        		I_HANDS.push(expHand);
	        	}
	        	console.log(`Done. Best hand: ${getBestHand(I_HANDS)}`);
	        });
	        it("Ensure no duplicate or invalid cards.", function(){
	        	I_HANDS.forEach(hand => {
	        		if (!hand.isValid()) throw new Error(`Drew invalid hand: ${hand}`);
	        	});
	        });
	        it("Ensure card distribution is correct.", function(){
	        	testCardFrequency(I_HANDS);
	        });
	        it("Ensure hand rank distribution is correct", function(){
	        	testRankFrequency(I_HANDS);
	        });
    	});

    	describe("Test drawing cards", async function(){
            const D_HANDS = [];
	    	it("Draw cards randomly, ensure algorithm is correct.", async function(){
	    		for (var i=0; i<I_HANDS.length; i++){
	    			const iHand = I_HANDS[i];
	    			const drawsNum = Math.floor(Math.random()*32);
	    			const seed = web3.sha3(Math.random().toString());
	    			const expDHand = new Hand(drawCardsFromHash(seed, iHand.toNumber(), drawsNum));
	    			const dHand = new Hand(await vpu.drawToHand(seed, iHand.toNumber(), drawsNum));
	    			if (dHand.toNumber() !== expDHand.toNumber()) {
	        			 throw new Error(`Local: ${expDHand}, remote: ${dHand}, iHand: ${iHand}, drawsNum: ${drawsNum}`);
	        		} else {
	        			await assertRank(dHand, expDHand.getRank(), false);
	        			const chunkSize = Math.floor(NUM_HANDS/10);
	        			const numHands = i+1;
	        			if (numHands >= chunkSize && numHands % chunkSize == 0)
	        				console.log(`Generated and ranked ${numHands} hands correctly. Latest one: ${dHand}`);
	        		}
	        		D_HANDS.push(expDHand);
	    		}
	    		console.log(`Done. Best hand: ${getBestHand(D_HANDS)}`);
	        });
	        it("Ensure no duplicate or invalid cards.", function(){
	        	D_HANDS.forEach(hand => {
	        		if (!hand.isValid()) throw new Error(`Drew invalid hand: ${hand}`);
	        	});
	        });
	        it("Ensure card distribution is correct.", function(){
	        	testCardFrequency(D_HANDS);
	        });
	        it("Ensure hand rank distribution is correct", function(){
	        	testRankFrequency(D_HANDS);
	        });
	    });

        describe("Test drawing against invalid hands", async function(){
            const D_HANDS = [];
            it("Draw cards randomly, ensure algorithm is correct.", async function(){
                for (var i=0; i<I_HANDS.length; i++){
                    const iHand = new Hand(0);
                    const drawsNum = 31;
                    const seed = web3.sha3(Math.random().toString());
                    const expDHand = new Hand(drawCardsFromHash(seed, iHand.toNumber(), drawsNum));
                    const dHand = new Hand(await vpu.drawToHand(seed, iHand.toNumber(), drawsNum));
                    if (dHand.toNumber() !== expDHand.toNumber()) {
                        throw new Error(`Local: ${expDHand}, remote: ${dHand}, iHand: ${iHand}, drawsNum: ${drawsNum}`);
                    } else {
                        await assertRank(dHand, expDHand.getRank(), false);
                        const chunkSize = Math.floor(NUM_HANDS/10);
                        const numHands = i+1;
                        if (numHands >= chunkSize && numHands % chunkSize == 0)
                            console.log(`Generated and ranked ${numHands} hands correctly. Latest one: ${dHand}`);
                    }
                    D_HANDS.push(expDHand);
                }
                console.log(`Done. Best hand: ${getBestHand(D_HANDS)}`);
            });
            it("Ensure no duplicate or invalid cards.", function(){
                D_HANDS.forEach(hand => {
                    if (!hand.isValid()) throw new Error(`Drew invalid hand: ${hand}`);
                });
            });
            it("Ensure card distribution is correct.", function(){
                testCardFrequency(D_HANDS);
            });
            it("Ensure hand rank distribution is correct", function(){
                testRankFrequency(D_HANDS);
            });
        });
    });

});