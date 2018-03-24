var Registry = artifacts.require("Registry.sol");
var Treasury = artifacts.require("Treasury.sol");
var PennyAuctionController = artifacts.require("PennyAuctionController.sol");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory.sol");
var PennyAuction = artifacts.require("PennyAuction.sol");
var UnpayableBidder = artifacts.require("UnpayableBidder.sol");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;


const DEFAULT_DEF = {
    summary: "",
    initialPrize: new BigNumber(.01e18),
    bidPrice: new BigNumber(.001e18),
    bidIncr: new BigNumber(.0001e18),
    bidAddBlocks: new BigNumber(2),
    initialBlocks: new BigNumber(10),
    feeIncr: function(){
        return this.bidPrice.minus(this.bidIncr)
    },
    toArr: function(){
        return [
            this.summary,
            this.initialPrize,
            this.bidPrice,
            this.bidIncr,
            this.bidAddBlocks,
            this.initialBlocks
        ];
    }
};

const DEF_0 = Object.assign({}, DEFAULT_DEF);
DEF_0.summary = "0th Auction";

const DEF_1 = Object.assign({}, DEFAULT_DEF);
DEF_1.summary = "1st Auction (Invalid BID_ADD_BLOCKS_1)";
DEF_1.bidAddBlocks = new BigNumber(0);

const DEF_2 = Object.assign({}, DEFAULT_DEF);
DEF_2.summary = "2nd auction (huge initialPrize)";
DEF_2.initialPrize = new BigNumber(100e18);

const DEF_3 = Object.assign({}, DEFAULT_DEF);
DEF_3.summary = "3rd auction";
DEF_3.initialBlocks = DEF_3.initialBlocks.plus(10);

const DEF_4 = Object.assign({}, DEFAULT_DEF);
DEF_4.summary = "4th auction";

const DEFS = [DEF_0, DEF_1, DEF_2, DEF_3, DEF_4];


const accounts = web3.eth.accounts;
const NO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe('PennyAuctionController', function(){    
    const owner = accounts[1]
    const admin = accounts[2];
    const dummyTreasury = accounts[3];
    const bidder1 = accounts[4];
    const bidder2 = accounts[5];
    const auctionWinner = accounts[6];
    const anon = accounts[7];

    var registry;
    var pac;
    var paf;
    var unpayableBidder;

    before("Set up Registry, PAC, PAF, and UnpayableBidder", async function(){
        const addresses = {
            owner: owner,
            admin: admin,
            dummyTreasury: dummyTreasury,
            bidder1: bidder1,
            bidder2: bidder2,
            auctionWinner: auctionWinner,
            anon: anon,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create Registry, register ADMIN");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();

        this.logInfo("Create PennyAuctionController.");
        await createDefaultTxTester()
            .doNewTx(PennyAuctionController, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                pac = txRes.contract;
                plugins.addAddresses({pac: pac});
            }).start();

        this.logInfo("Create PennyAuctionFactory.");
        await createDefaultTxTester()
            .doNewTx(PennyAuctionFactory, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                paf = txRes.contract;
                plugins.addAddresses({paf: paf});
            }).start();

        this.logInfo("Register ADMIN, TREAUSRY, PAC, and PAF.");
        await createDefaultTxTester()
            .doTx([registry, "register", "ADMIN", admin, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "TREASURY", dummyTreasury, {from: owner}])
            .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", pac.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "PENNY_AUCTION_FACTORY", paf.address, {from: owner}])
                .assertSuccess()
            .start();

        this.logInfo("Create UnpayableBidder");
        unpayableBidder = await UnpayableBidder.new({from: anon});
        await createDefaultTxTester()
            .addAddresses({unpayableBidder: unpayableBidder})
            .printNamedAddresses()
            .start();
    });

    describe("Initial state is correct", function(){
        it("Points to correct PAF and TREASURY", function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getAdmin"], admin)
                .assertCallReturns([pac, "getPennyAuctionFactory"], paf.address)
                .start();
        });
    });

    describe(".editDefinedAuction()", async function(){
        it("Cannot edit from non-admin", async function(){
            return assertCannotEditAuction(0, anon, -1);
        })
        it("Cannot edit with too high of an index", async function(){
            return assertCannotEditAuction(1, admin, "Index out of bounds.");
        });
        it("Adds definedAuction correctly", async function(){
            return assertCanEditAuction(0, admin);
        });
        it("Cannot edit with too high an index", async function(){
            return assertCannotEditAuction(2, admin, "Index out of bounds.");
        });
        it("Adds another definedAuction correctly", async function(){
            return assertCanEditAuction(1, admin);
        });
        it("Adds another definedAuction correctly", async function(){
            return assertCanEditAuction(2, admin);
        });
        it("Adds another definedAuction correctly", async function(){
            return assertCanEditAuction(3, admin);
        });
        it("Adds another definedAuction correctly", async function(){
            return assertCanEditAuction(4, admin);
        });
        it("Edits an existing auction correctly", function(){
            DEFS[2].summary += " (edited)";
            return assertCanEditAuction(2, admin);
        })
    });

    describe(".enableDefinedAuction()", function(){
        before("auction 0 is disabled", async function(){
            assert.strEqual(await pac.getIsEnabled(0), false);
        });
        it("is only callable by admin", function(){
            const callParams = [pac, "enableDefinedAuction", 0, {from: anon}];
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });
        it("Fails if index too high", function(){
            const callParams = [pac, "enableDefinedAuction", 5, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, false)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyErrorLog("Index out of bounds.")
                .start();
        });
        it("Works", function(){
            const callParams = [pac, "enableDefinedAuction", 0, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, true)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("DefinedAuctionEdited", {time: null, index: 0})
                .assertCallReturns(() => [pac, "getIsEnabled", 0], true)
                .start();
        });
    });

    describe(".disabledDefinedAuction()", function(){
        before("auction 0 is enabled", async function(){
            assert.strEqual(await pac.getIsEnabled(0), true);
        });
        it("is only callable by admin", function(){
            const callParams = [pac, "disableDefinedAuction", 0, {from: anon}];
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });
        it("Fails if index too high", function(){
            const callParams = [pac, "disableDefinedAuction", 5, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, false)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyErrorLog("Index out of bounds.")
                .start();
        });
        it("Works", function(){
            const callParams = [pac, "disableDefinedAuction", 0, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, true)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("DefinedAuctionEdited", {time: null, index: 0})
                .assertCallReturns([pac, "getIsEnabled", 0], false)
                .start();
        }); 
    });

    describe(".addBankroll() and whitelist works", function(){
        it("Non-admin cannot change whitelist", function(){
            return createDefaultTxTester()
                .doTx([pac, "addToWhitelist", anon, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Admin can set whitelist", function(){
           return createDefaultTxTester()
                .doTx([pac, "addToWhitelist", anon, {from: admin}])
                .assertSuccess()
                .start(); 
        });
        it("Whitelisted address can bankroll", function(){
            return createDefaultTxTester()
                .doTx([pac, "addBankroll", {from: anon, value: .1e18}])
                .assertSuccess()
                .assertCallReturns([pac, "bankroll"], .1e18)
                .start();
        });
        it("Non-whitelisted address cannot bankroll", function(){
           return createDefaultTxTester()
                .doTx([pac, "addBankroll", {from: bidder1, value: 1e12}])
                .assertInvalidOpCode()
                .start(); 
        });
        it("Admin can remove from whitelist", function(){
            return createDefaultTxTester()
                .doTx([pac, "removeFromWhitelist", anon, {from: admin}])
                .assertSuccess()
                .start(); 
        });
    });

    describe(".startDefinedAuction()", function(){
        before("enable all auctions (except 4)", async function(){
            assert.strEqual(await pac.numDefinedAuctions(), 5);
            await pac.enableDefinedAuction(0, {from: admin});
            await pac.enableDefinedAuction(1, {from: admin});
            await pac.enableDefinedAuction(2, {from: admin});
            await pac.enableDefinedAuction(3, {from: admin});
        });
        it("Fails when index out of bounds", function(){
            return assertCannotStartAuction(5, "Index out of bounds.");
        });
        it("Fails when not enabled", function(){
            return assertCannotStartAuction(4, "DefinedAuction is not enabled.");
        });
        it("Fails when when initialPrize is too large", function(){
            return assertCannotStartAuction(2, "Not enough funds to start this auction.");
        });
        it("Fails when starting auction with bad params", async function(){
            return assertCannotStartAuction(1, "PennyAuctionFactory could not create auction (invalid params?)");
        });
        it("Fails if PAF would set collector to a different contract", async function(){
            this.logInfo("First, set registry.PENNY_AUCTION_CONTROLLER to another value");
            await createDefaultTxTester()
                .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", anon, {from: owner}])
                .assertSuccess().start();

            this.logInfo("");
            this.logInfo("Run test.");
            await assertCannotStartAuction(0, "PAF.getCollector() points to a different contract.");

            this.logInfo("");
            this.logInfo("Restore registry.PENNY_AUCTION_CONTROLLER");
            await createDefaultTxTester()
                .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", pac.address, {from: owner}])
                .assertSuccess().start();
        });
        it("starts auction 0", async function(){
            return assertCanStartAuction(0);
        });
        it("Fails when already started", function(){
            return assertCannotStartAuction(0, "Auction is already started.");
        });
        it("starts auction 3", async function(){
            return assertCanStartAuction(3);
        })
    });

    describe(".getIsStartable()", function(){
        it("Returns correct values", function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getIsStartable", 0], false) // already started
                .assertCallReturns([pac, "getIsStartable", 1], true)  // startable
                .assertCallReturns([pac, "getIsStartable", 2], false) // not enough funds
                .assertCallReturns([pac, "getIsStartable", 3], false) // already started
                .assertCallReturns([pac, "getIsStartable", 4], false) // not enabled
                .start();
        })
    });

    // At this point, definedAuctions[1] is started
    describe("With active auctions", async function(){
        var auction0;
        var auction3;
        before("There are open auctions", async function(){
            auction0 = PennyAuction.at(await pac.getAuction(0));
            assert.notEqual(auction0.address, NO_ADDRESS);
            auction3 = PennyAuction.at(await pac.getAuction(3));
            assert.notEqual(auction3.address, NO_ADDRESS);
        });
        it("Bids on auctions twice", async function(){
            await auction0.sendTransaction({from: bidder1, value: DEF_0.bidPrice});
            await auction0.sendTransaction({from: bidder2, value: DEF_0.bidPrice});
            await auction3.sendTransaction({from: bidder2, value: DEF_2.bidPrice});
            await auction3.sendTransaction({from: bidder1, value: DEF_2.bidPrice});
        });
        it(".getAvailableFees() returns expectd amount", async function(){
            const expFees = DEF_0.feeIncr().mul(2).plus(DEF_3.feeIncr().mul(2));
            return createDefaultTxTester()
                .assertCallReturns([pac, "getAvailableFees"], expFees)
                .start();
        });
        it(".getNumEndedAuctions() is zero", async function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getNumEndedAuctions"], 0)
                .start();
        });
        it(".refreshAuctions() collects fees, ends no games", async function(){
            const expFees = DEF_0.feeIncr().mul(2).plus(DEF_3.feeIncr().mul(2));
            const callParams = [pac, "refreshAuctions", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, expFees])
                .startLedger([pac])
                .startWatching([auction0, auction3])
                .doTx(callParams)
                .assertSuccess()
                    .assertLog("FeesCollected", {
                        time: null,
                        amount: expFees
                    })
                .stopLedger()
                    .assertDelta(pac, expFees)
                .stopWatching()
                    .assertOnlyEvent(auction0, "FeesSent")
                    .assertOnlyEvent(auction3, "FeesSent")
                .assertCallReturns([pac, "totalFees"], expFees)
                .assertCallReturns([pac, "getAvailableFees"], 0)
                .assertCallReturns([auction0, "fees"], 0)
                .assertCallReturns([auction3, "fees"], 0)
                .assertCallReturns([auction0, "isPaid"], false)
                .assertCallReturns([auction3, "isPaid"], false)
                .start();
        });
        it(".refreshAuctions() collects no fees, ends no games", async function(){
            const callParams = [pac, "refreshAuctions", {from: anon}];
            const expFees = await pac.totalFees();
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, 0])
                .startLedger([pac])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(0)
                .stopLedger()
                    .assertNoDelta(pac)
                .assertCallReturns([pac, "totalFees"], expFees)
                .start(); 
        });
    });


    describe("When an auction ends", function(){
        var auction0;
        before("Fast forwards until an auction is ended", async function(){
            auction0 = PennyAuction.at(await pac.getAuction(0));
            const blocksRemaining = await auction0.getBlocksRemaining();
            console.log(`Mining ${blocksRemaining} blocks so auction0 ends...`);
            await testUtil.mineBlocks(blocksRemaining);
        });
        it(".getNumEndedAuctions() should return 1", async function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getNumEndedAuctions"], 1)
                .start();
        });
        it(".refreshAuctions() returns 1 auction ended, and 0 fees collected", async function(){
            const winner = await auction0.currentWinner();
            const prize = await auction0.prize();
            const expectedFees = await pac.totalFees();
            const expectedBids = await auction0.numBids();
            const expectedPrizes = await auction0.prize();
            const callParams = [pac, "refreshAuctions", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [1, 0])
                .startLedger([pac, winner])
                .startWatching([auction0])
                .doTx(callParams)
                .assertSuccess()
                    .assertOnlyLog("AuctionEnded", {
                        time: null,
                        index: 0,
                        winner: winner,
                        addr: auction0.address
                    })
                .stopLedger()
                    .assertDelta(winner, prize)
                    .assertNoDelta(pac)
                .stopWatching()
                    .assertEvent(auction0, "SendPrizeSuccess", {
                        time: null,
                        redeemer: pac.address,
                        recipient: winner,
                        amount: prize,
                        gasLimit: null
                        //gasLimit: 2300 // ganache bug mis-reports this as 4600.
                    })
                .assertCallReturns([pac, "getIsStartable", 0], true)
                .assertCallReturns([pac, "getAuction", 0], NO_ADDRESS)
                .assertCallReturns([pac, "endedAuctions", 0], auction0.address)
                .assertCallReturns([pac, "numEndedAuctions"], 1)
                .assertCallReturns([pac, "totalFees"], expectedFees)
                .assertCallReturns([pac, "totalBids"], expectedBids)
                .assertCallReturns([pac, "totalPrizes"], expectedPrizes)
                .assertCallReturns([auction0, "isPaid"], true)
                .start()
        });
        it(".refreshAuctions() returns 0 auctions ended, and 0 fees collected", async function(){
            const expectedFees = await pac.totalFees();
            const expectedBids = await pac.totalBids();
            const expectedPrizes = await pac.totalPrizes();
            const callParams = [pac, "refreshAuctions", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, 0])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(0)
                .assertCallReturns([pac, "totalFees"], expectedFees)
                .assertCallReturns([pac, "totalBids"], expectedBids)
                .assertCallReturns([pac, "totalPrizes"], expectedPrizes)
                .start()
        });
    });

    // Should still end auction as expected, and shouldn't stall controller
    describe("Auction with an unpayable winner", async function(){
        var auction3;
        before("Bid on auction3 with UnpayableBidder, end it...", async function(){
            this.logInfo("Confirming auction3 is active...");
            auction3 = PennyAuction.at(await pac.getAuction(3));
            assert((await auction3.getBlocksRemaining()).gt(0), "auction3 has not ended yet");

            // fund unpayable bidder, and bid on auction3
            this.logInfo("Making UnpayableBidder bid on auction3...");
            const toSend = DEF_3.bidPrice.mul(2);
            await unpayableBidder.fund({value: toSend, from: anon});
            assert.strEqual(await testUtil.getBalance(unpayableBidder), toSend);
            await unpayableBidder.doBid(auction3.address, {from: anon});
            assert.strEqual(await auction3.currentWinner(), unpayableBidder.address);

            // fast-forward
            const blocksRemaining = await auction3.getBlocksRemaining();
            this.logInfo(`Mining ${blocksRemaining} blocks so auction3 ends...`)
            await testUtil.mineBlocks(blocksRemaining);
        });
        it(".refreshAuctions() ends auction, collects fees, but doesnt pay unpayableBidder", async function(){
            const callParams = [pac, "refreshAuctions", {from: anon}];
            const expPrize = await auction3.prize();
            const expFees = await auction3.fees();
            const expTotalFees = (await pac.totalFees()).plus(expFees);
            const expTotalBids = (await pac.totalBids()).plus(await auction3.numBids());
            const expTotalPrizes = (await pac.totalPrizes()).plus(expPrize);
            return createDefaultTxTester()
                .assertCallReturns(callParams, [1, expFees])
                .startLedger([pac, unpayableBidder, anon])
                .startWatching([auction3])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("AuctionEnded", {
                        time: null,
                        index: 3,
                        addr: auction3.address
                    })
                    .assertLog("FeesCollected", {
                        time: null,
                        amount: expFees
                    })
                .stopLedger()
                    .assertDelta(pac, expFees)
                    .assertNoDelta(unpayableBidder)
                    .assertLostTxFee(anon)
                .stopWatching()
                    .assertEventCount(auction3, 2)
                    .assertEvent(auction3, "FeesSent", {
                        time: null,
                        amount: expFees
                    })
                    .assertEvent(auction3, "SendPrizeFailure", {
                        time: null,
                        redeemer: pac.address,
                        recipient: unpayableBidder.address,
                        amount: expPrize,
                        gasLimit: null
                        // gasLimit: 2300 // ganache bug misreports this
                    })
                .assertCallReturns([pac, "getIsStartable", 3], true)
                .assertCallReturns([pac, "getAuction", 3], NO_ADDRESS)
                .assertCallReturns([pac, "endedAuctions", 1], auction3.address)
                .assertCallReturns([pac, "numEndedAuctions"], 2)
                .assertCallReturns([pac, "totalFees"], expTotalFees)
                .assertCallReturns([pac, "totalBids"], expTotalBids)
                .assertCallReturns([pac, "totalPrizes"], expTotalPrizes)
                .assertCallReturns([auction3, "isPaid"], false)
                .assertCallReturns([auction3, "fees"], 0)
                .start()
        });
    });

    describe(".startDefinedAuctionManually()", function(){
        before("Assert auction0 is startable", function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getIsStartable", 0], true)
                .start();
        })
        it("Refunds if invalid amount sent", function(){
            const initialPrize = DEF_0.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, pac])
                .doTx([pac, "startDefinedAuctionManually", 0, {from: anon, value: initialPrize.plus(1)}])
                .assertSuccess()
                    .assertOnlyLog("Error", {msg: "Value sent does not match initialPrize."})
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(pac)
                .start();
        });
        it("Refunds if fails to start game (invalid params on defined auction)", function(){
            const initialPrize = DEF_1.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, pac])
                .doTx([pac, "startDefinedAuctionManually", 1, {from: anon, value: initialPrize}])
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("DefinedAuctionInvalid")
                    .assertLog("Error")
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(pac)
                .start();
        });
        it("Works", function(){
            const initialPrize = DEF_0.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, pac])
                .doTx([pac, "startDefinedAuctionManually", 0, {from: anon, value: initialPrize}])
                .assertSuccess()
                    .assertOnlyLog("AuctionStarted", {index: 0})
                .stopLedger()
                    .assertDeltaMinusTxFee(anon, initialPrize.mul(-1))
                    .assertNoDelta(pac)
                .assertCallReturns([pac, "getAuction", 0], {not: NO_ADDRESS})
                .start();
        });
    });

    async function assertCanEditAuction(index, acct) {
        const curNum = await pac.numDefinedAuctions();
        var expNumDefined;
        if (index == curNum) {
            console.log("This should add the auction and increase numDefinedAuctions.")
            expNumDefined = curNum.plus(1);
        } else {
            console.log("This should edit an existing defined auction.")
            expNumDefined = curNum;
        }

        const DEF = DEFS[index].toArr();
        const callParams = [pac, "editDefinedAuction", index].concat(DEF, {from: acct});
        return createDefaultTxTester()
            .assertCallReturns(callParams, true)
            .doTx(callParams)
            .assertSuccess()
            .assertOnlyLog("DefinedAuctionEdited", {time: null, index: index})
            .assertCallReturns([pac, "numDefinedAuctions"], expNumDefined)
            .assertCallReturns([pac, "definedAuctions", index], 
                [
                    "0x0000000000000000000000000000000000000000",
                    false
                ].concat(DEF)
            )
            .start()
    }
    async function assertCannotEditAuction(index, acct, errMsg) {
        const DEF = DEFS[index].toArr();
        const callParams = [pac, "editDefinedAuction", index].concat(DEF, {from: acct})
        if (errMsg == -1){
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        }

        return createDefaultTxTester()
            .assertCallReturns(callParams, false)
            .doTx(callParams)
            .assertSuccess()
            .assertOnlyLog("Error", {
                msg: errMsg
            })
            .start();
    }

    async function assertCanStartAuction(index) {
        const DEF = await getDefinedAuction(index);

        var auction;
        const callParams = [pac, "startDefinedAuction", index, {from: anon}];
        await createDefaultTxTester()
            .assertCallReturns(callParams, [true, null])
            .startLedger([pac])
            .startWatching([paf])
            .doTx(callParams)
            .assertSuccess()
                .assertOnlyLog("AuctionStarted")
                .withTxResult((txRes, plugins) => {
                    auction = PennyAuction.at(txRes.logs[0].args.addr);
                    const obj = {};
                    obj[`auction@${index}`] = auction.address;
                    plugins.addAddresses(obj);
                })
                .assertOnlyLog("AuctionStarted", {
                    time: null,
                    index: index,
                    addr: ()=>auction.address,
                    initialPrize: DEF.initialPrize
                })
            .stopWatching()
                .assertEvent(paf, "AuctionCreated", {
                    time: null,
                    addr: ()=>auction.address,
                    collector: pac.address,
                    initialPrize: DEF.initialPrize,
                    bidPrice: DEF.bidPrice,
                    bidAddBlocks: DEF.bidAddBlocks,
                    bidIncr: DEF.bidIncr,
                    initialBlocks: DEF.initialBlocks
                })
            .stopLedger()
                .assertDelta(pac, DEF.initialPrize.mul(-1))
            .assertBalance(()=>auction, DEF.initialPrize)
            .assertCallReturns([pac, "getAuction", index], ()=>auction.address)
            .assertCallReturns([pac, "getIsStartable", index], false)
            .assertCallReturns(()=>[auction, "prize"], DEF.initialPrize)
            .assertCallReturns(()=>[auction, "bidPrice"], DEF.bidPrice)
            .assertCallReturns(()=>[auction, "bidAddBlocks"], DEF.bidAddBlocks)
            .assertCallReturns(()=>[auction, "bidIncr"], DEF.bidIncr)
            .assertCallReturns(()=>[auction, "currentWinner"], pac.address)
            .start();
    }

    async function assertCannotStartAuction(index, msg) {
        const callParams = [pac, "startDefinedAuction", index, {from: anon}];
        const expLogs = [["Error", {msg: msg}]];
        if (msg === "PennyAuctionFactory could not create auction (invalid params?)") {
            expLogs.push(["DefinedAuctionInvalid", {index: index}])
        }
        
        const txTester = createDefaultTxTester()
            .assertCallReturns(callParams, [false, NO_ADDRESS])
            .startLedger([pac, anon])
            .doTx(callParams)
            .assertSuccess()
            .assertLogCount(expLogs.length);
        
        expLogs.forEach(l=>{
            txTester.assertLog(l[0], l[1]);
        })

        return txTester
            .stopLedger()
                .assertLostTxFee(anon)
                .assertNoDelta(pac)
            .start();
    }

    async function getDefinedAuction(index) {
        arr = await pac.definedAuctions(index);
        return {
            auction: arr[0],
            isEnabled: arr[1],
            summary: arr[2],
            initialPrize: arr[3],
            bidPrice: arr[4],
            bidIncr: arr[5],
            bidAddBlocks: arr[6],
            initialBlocks: arr[7]
        };
    }
});