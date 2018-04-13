var Registry = artifacts.require("Registry.sol");
var Treasury = artifacts.require("Treasury.sol");
var PennyAuctionController = artifacts.require("PennyAuctionController.sol");
var PennyAuctionFactory = artifacts.require("PennyAuctionFactory.sol");
var PennyAuction = artifacts.require("PennyAuction.sol");
var ExpensivePayableBidder = artifacts.require("ExpensivePayableBidder.sol");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
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

const DEF_1 = Object.assign({}, DEFAULT_DEF);
    DEF_1.summary = "1st Auction";
const DEF_2 = Object.assign({}, DEFAULT_DEF);
    DEF_2.summary = "2nd Auction (Invalid BID_ADD_BLOCKS_1)";
    DEF_2.bidAddBlocks = new BigNumber(0);
const DEF_3 = Object.assign({}, DEFAULT_DEF);
    DEF_3.summary = "3rd auction (huge initialPrize)";
    DEF_3.initialPrize = new BigNumber(100e18);
const DEF_4 = Object.assign({}, DEFAULT_DEF);
    DEF_4.summary = "4th auction";
    DEF_4.initialBlocks = DEF_3.initialBlocks.plus(10);
const DEF_5 = Object.assign({}, DEFAULT_DEF);
    DEF_5.summary = "5th auction";
const DEFS = [null, DEF_1, DEF_2, DEF_3, DEF_4, DEF_5];

const accounts = web3.eth.accounts;

describe('PennyAuctionController', function(){    
    const owner = accounts[1]
    const admin = accounts[2];
    const dummyTreasury = accounts[3];
    const bidder1 = accounts[4];
    const bidder2 = accounts[5];
    const auctionWinner = accounts[6];
    const anon = accounts[7];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";

    var registry;
    var pac;
    var paf;
    var expensiveBidder;

    before("Set up Registry, PAC, PAF, and ExpensivePayableBidder", async function(){
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

        this.logInfo("Create ExpensivePayableBidder");
        expensiveBidder = await ExpensivePayableBidder.new({from: anon});
        await createDefaultTxTester()
            .addAddresses({expensiveBidder: expensiveBidder})
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
            return assertCannotEditAuction(1, anon, -1);
        })
        it("Cannot edit with too high of an index", async function(){
            return assertCannotEditAuction(2, admin, "Index out of bounds.");
        });
        it("Adds definedAuction correctly", async function(){
            return assertCanEditAuction(1, admin);
        });
        it("Cannot edit with too high an index", async function(){
            return assertCannotEditAuction(3, admin, "Index out of bounds.");
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
        it("Adds another definedAuction correctly", async function(){
            return assertCanEditAuction(5, admin);
        });
        it("Edits an existing auction correctly", function(){
            DEFS[3].summary += " (edited)";
            return assertCanEditAuction(3, admin);
        })
    });

    describe(".enableDefinedAuction(true)", function(){
        before("auction 1 is disabled", async function(){
            assert.strEqual(await pac.getIsEnabled(1), false);
        });
        it("is only callable by admin", function(){
            const callParams = [pac, "enableDefinedAuction", 1, true, {from: anon}];
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });
        it("Fails if index too high", function(){
            const callParams = [pac, "enableDefinedAuction", 6, true, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, false)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyErrorLog("Index out of bounds.")
                .start();
        });
        it("Works", function(){
            const callParams = [pac, "enableDefinedAuction", 1, true, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, true)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("DefinedAuctionEnabled", {
                    time: null,
                    index: 1,
                    isEnabled: true
                })
                .assertCallReturns(() => [pac, "getIsEnabled", 1], true)
                .start();
        });
    });

    describe(".enableDefinedAuction(false)", function(){
        before("auction 1 is enabled", async function(){
            assert.strEqual(await pac.getIsEnabled(1), true);
        });
        it("is only callable by admin", function(){
            const callParams = [pac, "enableDefinedAuction", 1, false, {from: anon}];
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });
        it("Fails if index too high", function(){
            const callParams = [pac, "enableDefinedAuction", 6, false, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, false)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyErrorLog("Index out of bounds.")
                .start();
        });
        it("Works", function(){
            const callParams = [pac, "enableDefinedAuction", 1, false, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, true)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("DefinedAuctionEnabled", {
                    time: null,
                    index: 1,
                    isEnabled: false
                })
                .assertCallReturns([pac, "getIsEnabled", 1], false)
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
        before("enable all auctions (except 5)", async function(){
            assert.strEqual(await pac.numDefinedAuctions(), 5);
            await pac.enableDefinedAuction(1, true, {from: admin});
            await pac.enableDefinedAuction(2, true, {from: admin});
            await pac.enableDefinedAuction(3, true, {from: admin});
            await pac.enableDefinedAuction(4, true, {from: admin});
        });
        it("Fails when index out of bounds", function(){
            return assertCannotStartAuction(6, "Index out of bounds.");
        });
        it("Fails when not enabled", function(){
            return assertCannotStartAuction(5, "DefinedAuction is not enabled.");
        });
        it("Fails when when initialPrize is too large", function(){
            return assertCannotStartAuction(3, "Not enough funds to start this auction.");
        });
        it("Fails when starting auction with bad params", async function(){
            return assertCannotStartAuction(2, "PennyAuctionFactory could not create auction (invalid params?)");
        });
        it("Fails if PAF would set collector to a different contract", async function(){
            this.logInfo("First, set registry.PENNY_AUCTION_CONTROLLER to another value");
            await createDefaultTxTester()
                .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", anon, {from: owner}])
                .assertSuccess().start();

            this.logInfo("");
            this.logInfo("Run test.");
            await assertCannotStartAuction(1, "PAF.getCollector() points to a different contract.");

            this.logInfo("");
            this.logInfo("Restore registry.PENNY_AUCTION_CONTROLLER");
            await createDefaultTxTester()
                .doTx([registry, "register", "PENNY_AUCTION_CONTROLLER", pac.address, {from: owner}])
                .assertSuccess().start();
        });
        it("starts auction 1", async function(){
            return assertCanStartAuction(1);
        });
        it("Fails when already started", function(){
            return assertCannotStartAuction(1, "Auction is already started.");
        });
        it("starts auction 4", async function(){
            return assertCanStartAuction(4);
        })
    });

    describe(".getIsStartable()", function(){
        it("Returns correct values", function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getIsStartable", 1], false) // already started
                .assertCallReturns([pac, "getIsStartable", 2], true)  // startable
                .assertCallReturns([pac, "getIsStartable", 3], false) // not enough funds
                .assertCallReturns([pac, "getIsStartable", 4], false) // already started
                .assertCallReturns([pac, "getIsStartable", 5], false) // not enabled
                .start();
        })
    });

    // At this point, definedAuctions[1] is started
    describe("With active auctions", async function(){
        var auction1;
        var auction4;
        before("There are open auctions", async function(){
            auction1 = PennyAuction.at(await pac.getAuction(1));
            assert.notEqual(auction1.address, NO_ADDRESS);
            auction4 = PennyAuction.at(await pac.getAuction(4));
            assert.notEqual(auction4.address, NO_ADDRESS);
        });
        it("Bids on auctions twice", async function(){
            await auction1.sendTransaction({from: bidder1, value: DEF_1.bidPrice});
            await auction1.sendTransaction({from: bidder2, value: DEF_1.bidPrice});
            await auction4.sendTransaction({from: bidder2, value: DEF_4.bidPrice});
            await auction4.sendTransaction({from: bidder1, value: DEF_4.bidPrice});
        });
        it(".getAvailableFees() returns expected amount", async function(){
            const expFees = DEF_1.feeIncr().mul(2).plus(DEF_4.feeIncr().mul(2));
            return createDefaultTxTester()
                .assertCallReturns([pac, "getAvailableFees"], expFees)
                .start();
        });
        it(".getNumEndableAuctions() is zero", async function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getNumEndableAuctions"], 0)
                .start();
        });
        it(".refreshAuctions() collects fees, ends no games", async function(){
            const expFees = DEF_1.feeIncr().mul(2).plus(DEF_4.feeIncr().mul(2));
            const callParams = [pac, "refreshAuctions", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, expFees])
                .startLedger([pac])
                .startWatching([auction1, auction4])
                .doTx(callParams)
                .assertSuccess()
                    .assertLog("FeesCollected", {
                        time: null,
                        amount: expFees
                    })
                .stopLedger()
                    .assertDelta(pac, expFees)
                .stopWatching()
                    .assertOnlyEvent(auction1, "FeesSent")
                    .assertOnlyEvent(auction4, "FeesSent")
                .assertCallReturns([pac, "totalFees"], expFees)
                .assertCallReturns([pac, "getAvailableFees"], 0)
                .assertCallReturns([auction1, "fees"], 0)
                .assertCallReturns([auction4, "fees"], 0)
                .assertCallReturns([auction1, "isPaid"], false)
                .assertCallReturns([auction4, "isPaid"], false)
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
        var auction1;
        before("Fast forwards until an auction is ended", async function(){
            auction1 = PennyAuction.at(await pac.getAuction(1));
            const blocksRemaining = await auction1.getBlocksRemaining();
            console.log(`Mining ${blocksRemaining} blocks so auction1 ends...`);
            await testUtil.mineBlocks(blocksRemaining);
        });
        it(".getNumEndableAuctions() should return 1", async function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getNumEndableAuctions"], 1)
                .start();
        });
        it(".refreshAuctions() returns 1 auction ended, and 0 fees collected", async function(){
            const winner = await auction1.currentWinner();
            const prize = await auction1.prize();
            const expectedFees = await pac.totalFees();
            const expectedBids = await auction1.numBids();
            const expectedPrizes = await auction1.prize();
            const callParams = [pac, "refreshAuctions", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [1, 0])
                .startLedger([pac, winner])
                .startWatching([auction1])
                .doTx(callParams)
                .assertSuccess()
                    .assertOnlyLog("AuctionEnded", {
                        time: null,
                        index: 1,
                        winner: winner,
                        addr: auction1.address
                    })
                .stopLedger()
                    .assertDelta(winner, prize)
                    .assertNoDelta(pac)
                .stopWatching()
                    .assertEvent(auction1, "SendPrizeSuccess", {
                        time: null,
                        redeemer: pac.address,
                        recipient: winner,
                        amount: prize,
                        gasLimit: null
                        //gasLimit: 2300 // ganache bug mis-reports this as 4600.
                    })
                .assertCallReturns([pac, "getIsStartable", 1], true)
                .assertCallReturns([pac, "getAuction", 1], NO_ADDRESS)
                .assertCallReturns([pac, "numEndedAuctions"], 1)
                .assertCallReturns([pac, "endedAuctions", 0], auction1.address)
                .assertCallReturns([pac, "totalFees"], expectedFees)
                .assertCallReturns([pac, "totalBids"], expectedBids)
                .assertCallReturns([pac, "totalPrizes"], expectedPrizes)
                .assertCallReturns([auction1, "isPaid"], true)
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
    describe("Auction with an expensiveBidder winner", async function(){
        var auction4;
        before("Bid on auction4 with expensiveBidder, end it...", async function(){
            this.logInfo("Confirming auction4 is active...");
            auction4 = PennyAuction.at(await pac.getAuction(4));
            assert((await auction4.getBlocksRemaining()).gt(0), "auction4 has not ended yet");

            // fund expensiveBidder bidder, and bid on auction4
            this.logInfo("Making expensiveBidder bid on auction4...");
            const toSend = DEF_4.bidPrice.mul(2);
            await expensiveBidder.fund({value: toSend, from: anon});
            assert.strEqual(await testUtil.getBalance(expensiveBidder), toSend);
            await expensiveBidder.doBid(auction4.address, {from: anon});
            assert.strEqual(await auction4.currentWinner(), expensiveBidder.address);

            // fast-forward
            const blocksRemaining = await auction4.getBlocksRemaining();
            this.logInfo(`Mining ${blocksRemaining} blocks so auction4 ends...`)
            await testUtil.mineBlocks(blocksRemaining);
        });
        it(".refreshAuctions() ends auction, collects fees, but doesnt pay expensiveBidder", async function(){
            const callParams = [pac, "refreshAuctions", {from: anon}];
            const expPrize = await auction4.prize();
            const expFees = await auction4.fees();
            const expTotalFees = (await pac.totalFees()).plus(expFees);
            const expTotalBids = (await pac.totalBids()).plus(await auction4.numBids());
            const expTotalPrizes = (await pac.totalPrizes()).plus(expPrize);
            return createDefaultTxTester()
                .assertCallReturns(callParams, [1, expFees])
                .startLedger([pac, expensiveBidder, anon])
                .startWatching([auction4])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("AuctionEnded", {
                        time: null,
                        index: 4,
                        addr: auction4.address
                    })
                    .assertLog("FeesCollected", {
                        time: null,
                        amount: expFees
                    })
                .stopLedger()
                    .assertDelta(pac, expFees)
                    .assertNoDelta(expensiveBidder)
                    .assertLostTxFee(anon)
                .stopWatching()
                    .assertEventCount(auction4, 2)
                    .assertEvent(auction4, "FeesSent", {
                        time: null,
                        amount: expFees
                    })
                    .assertEvent(auction4, "SendPrizeFailure", {
                        time: null,
                        redeemer: pac.address,
                        recipient: expensiveBidder.address,
                        amount: expPrize,
                        gasLimit: null
                        // gasLimit: 2300 // ganache bug misreports this
                    })
                .assertCallReturns([pac, "getIsStartable", 4], true)
                .assertCallReturns([pac, "getAuction", 4], NO_ADDRESS)
                .assertCallReturns([pac, "numEndedAuctions"], 2)
                .assertCallReturns([pac, "endedAuctions", 1], auction4.address)
                .assertCallReturns([pac, "totalFees"], expTotalFees)
                .assertCallReturns([pac, "totalBids"], expTotalBids)
                .assertCallReturns([pac, "totalPrizes"], expTotalPrizes)
                .assertCallReturns([auction4, "isPaid"], false)
                .assertCallReturns([auction4, "fees"], 0)
                .start()
        });
    });

    describe(".startDefinedAuctionManually()", function(){
        before("Assert auction1 is startable", function(){
            return createDefaultTxTester()
                .assertCallReturns([pac, "getIsStartable", 1], true)
                .start();
        })
        it("Refunds if invalid amount sent", function(){
            const initialPrize = DEF_1.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, pac])
                .doTx([pac, "startDefinedAuctionManually", 1, {from: anon, value: initialPrize.plus(1)}])
                .assertSuccess()
                    .assertOnlyLog("Error", {msg: "Value sent does not match initialPrize."})
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(pac)
                .start();
        });
        it("Refunds if fails to start game (invalid params on defined auction)", function(){
            const initialPrize = DEF_2.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, pac])
                .doTx([pac, "startDefinedAuctionManually", 2, {from: anon, value: initialPrize}])
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("DefinedAuctionFailedCreation")
                    .assertLog("Error")
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(pac)
                .start();
        });
        it("Works", function(){
            const initialPrize = DEF_1.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, pac])
                .doTx([pac, "startDefinedAuctionManually", 1, {from: anon, value: initialPrize}])
                .assertSuccess()
                    .assertOnlyLog("AuctionStarted", {index: 1})
                .stopLedger()
                    .assertDeltaMinusTxFee(anon, initialPrize.mul(-1))
                    .assertNoDelta(pac)
                .assertCallReturns([pac, "getAuction", 1], {not: NO_ADDRESS})
                .start();
        });
    });

    async function assertCanEditAuction(index, acct) {
        const curNum = await pac.numDefinedAuctions();
        var expNumDefined;
        if (index-1 == curNum) {
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
            .assertCallReturns(callParams, {not: NO_ADDRESS})
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
            expLogs.push(["DefinedAuctionFailedCreation", {index: index}])
        }
        
        const txTester = createDefaultTxTester()
            .assertCallReturns(callParams, NO_ADDRESS)
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