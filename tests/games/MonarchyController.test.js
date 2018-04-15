var Registry = artifacts.require("Registry.sol");
var Treasury = artifacts.require("Treasury.sol");
var MonarchyController = artifacts.require("MonarchyController.sol");
var MonarchyFactory = artifacts.require("MonarchyFactory.sol");
var MonarchyGame = artifacts.require("MonarchyGame.sol");
var MaliciousMonarchyPlayer = artifacts.require("MaliciousMonarchyPlayer.sol");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;


const DEFAULT_DEF = {
    summary: "",
    initialPrize: new BigNumber(.01e18),
    fee: new BigNumber(.001e18),
    prizeIncr: new BigNumber(.0001e18),
    reignBlocks: new BigNumber(10),
    initialBlocks: new BigNumber(100),
    feeIncr: function(){
        return this.fee.minus(this.prizeIncr)
    },
    toArr: function(){
        return [
            this.summary,
            this.initialPrize,
            this.fee,
            this.prizeIncr,
            this.reignBlocks,
            this.initialBlocks
        ];
    }
};

const DEF_1 = Object.assign({}, DEFAULT_DEF);
    DEF_1.summary = "1st Game";
const DEF_2 = Object.assign({}, DEFAULT_DEF);
    DEF_2.summary = "2nd Game (Invalid REIGN_BLOCKS)";
    DEF_2.reignBlocks = new BigNumber(0);
const DEF_3 = Object.assign({}, DEFAULT_DEF);
    DEF_3.summary = "3rd Game (huge initialPrize)";
    DEF_3.initialPrize = new BigNumber(100e18);
const DEF_4 = Object.assign({}, DEFAULT_DEF);
    DEF_4.summary = "4th Game";
    DEF_4.reignBlocks = DEF_3.reignBlocks.plus(10);
const DEF_5 = Object.assign({}, DEFAULT_DEF);
    DEF_5.summary = "5th Game";
const DEFS = [null, DEF_1, DEF_2, DEF_3, DEF_4, DEF_5];

const accounts = web3.eth.accounts;

describe('MonarchyController', function(){    
    const owner = accounts[1]
    const admin = accounts[2];
    const dummyTreasury = accounts[3];
    const player1 = accounts[4];
    const player2 = accounts[5];
    const winner = accounts[6];
    const anon = accounts[7];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";

    var registry;
    var monarchyController;
    var monarchyFactory;
    var maliciousPlayer;

    before("Set up Registry, MonarchyController, MonarhcyFactory, and MaliciousPlayer", async function(){
        const addresses = {
            owner: owner,
            admin: admin,
            dummyTreasury: dummyTreasury,
            player1: player1,
            player2: player2,
            winner: winner,
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

        this.logInfo("Create MonarchyController.");
        await createDefaultTxTester()
            .doNewTx(MonarchyController, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                monarchyController = txRes.contract;
                plugins.addAddresses({monarchyController: monarchyController});
            }).start();

        this.logInfo("Create MonarchyFactory.");
        await createDefaultTxTester()
            .doNewTx(MonarchyFactory, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                monarchyFactory = txRes.contract;
                plugins.addAddresses({monarchyFactory: monarchyFactory});
            }).start();

        this.logInfo("Register ADMIN, TREASURY, MonarchyController, and MonarchyFactory.");
        await createDefaultTxTester()
            .doTx([registry, "register", "ADMIN", admin, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "TREASURY", dummyTreasury, {from: owner}])
            .doTx([registry, "register", "MONARCHY_CONTROLLER", monarchyController.address, {from: owner}])
                .assertSuccess()
            .doTx([registry, "register", "MONARCHY_FACTORY", monarchyFactory.address, {from: owner}])
                .assertSuccess()
            .start();

        this.logInfo("Create MaliciousMonarchyPlayer");
        maliciousPlayer = await MaliciousMonarchyPlayer.new({from: anon});
        await createDefaultTxTester()
            .addAddresses({maliciousPlayer: maliciousPlayer})
            .printNamedAddresses()
            .start();
    });

    describe("Initial state is correct", function(){
        it("Points to correct MonarchyFactory and Admin", function(){
            return createDefaultTxTester()
                .assertCallReturns([monarchyController, "getAdmin"], admin)
                .assertCallReturns([monarchyController, "getMonarchyFactory"], monarchyFactory.address)
                .start();
        });
    });

    describe(".editDefinedGame()", async function(){
        it("Cannot edit from non-admin", async function(){
            return assertCannotEditGame(1, anon, -1);
        })
        it("Cannot edit with too high of an index", async function(){
            return assertCannotEditGame(2, admin, "Index out of bounds.");
        });
        it("Adds definedGame correctly", async function(){
            return assertCanEditGame(1, admin);
        });
        it("Cannot edit with too high an index", async function(){
            return assertCannotEditGame(3, admin, "Index out of bounds.");
        });
        it("Adds another definedGame correctly", async function(){
            return assertCanEditGame(2, admin);
        });
        it("Adds another definedGame correctly", async function(){
            return assertCanEditGame(3, admin);
        });
        it("Adds another definedGame correctly", async function(){
            return assertCanEditGame(4, admin);
        });
        it("Adds another definedGame correctly", async function(){
            return assertCanEditGame(5, admin);
        });
        it("Edits an existing game correctly", function(){
            DEFS[3].summary += " (edited)";
            return assertCanEditGame(3, admin);
        })
    });

    describe(".enableDefinedGame(true)", function(){
        before("Game 1 is disabled", async function(){
            assert.strEqual(await monarchyController.getIsEnabled(1), false);
        });
        it("is only callable by admin", function(){
            const callParams = [monarchyController, "enableDefinedGame", 1, true, {from: anon}];
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });
        it("Fails if index too high", function(){
            const callParams = [monarchyController, "enableDefinedGame", 6, true, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, false)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyErrorLog("Index out of bounds.")
                .start();
        });
        it("Works", function(){
            const callParams = [monarchyController, "enableDefinedGame", 1, true, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, true)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("DefinedGameEnabled", {
                    time: null,
                    index: 1,
                    isEnabled: true
                })
                .assertCallReturns(() => [monarchyController, "getIsEnabled", 1], true)
                .start();
        });
    });

    describe(".enableDefinedGame(false)", function(){
        before("Game 1 is enabled", async function(){
            assert.strEqual(await monarchyController.getIsEnabled(1), true);
        });
        it("is only callable by admin", function(){
            const callParams = [monarchyController, "enableDefinedGame", 1, false, {from: anon}];
            return createDefaultTxTester()
                .assertCallThrows(callParams)
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });
        it("Fails if index too high", function(){
            const callParams = [monarchyController, "enableDefinedGame", 6, false, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, false)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyErrorLog("Index out of bounds.")
                .start();
        });
        it("Works", function(){
            const callParams = [monarchyController, "enableDefinedGame", 1, false, {from: admin}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, true)
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("DefinedGameEnabled", {
                    time: null,
                    index: 1,
                    isEnabled: false
                })
                .assertCallReturns([monarchyController, "getIsEnabled", 1], false)
                .start();
        }); 
    });

    describe(".addBankroll() and whitelist works", function(){
        it("Non-admin cannot change whitelist", function(){
            return createDefaultTxTester()
                .doTx([monarchyController, "addToWhitelist", anon, {from: anon}])
                .assertInvalidOpCode()
                .start();
        });
        it("Admin can set whitelist", function(){
           return createDefaultTxTester()
                .doTx([monarchyController, "addToWhitelist", anon, {from: admin}])
                .assertSuccess()
                .start(); 
        });
        it("Whitelisted address can bankroll", function(){
            return createDefaultTxTester()
                .doTx([monarchyController, "addBankroll", {from: anon, value: .1e18}])
                .assertSuccess()
                .assertCallReturns([monarchyController, "bankroll"], .1e18)
                .start();
        });
        it("Non-whitelisted address cannot bankroll", function(){
           return createDefaultTxTester()
                .doTx([monarchyController, "addBankroll", {from: player1, value: 1e12}])
                .assertInvalidOpCode()
                .start(); 
        });
        it("Admin can remove from whitelist", function(){
            return createDefaultTxTester()
                .doTx([monarchyController, "removeFromWhitelist", anon, {from: admin}])
                .assertSuccess()
                .start(); 
        });
    });

    describe(".startDefinedGame()", function(){
        before("enable all games (except 5)", async function(){
            assert.strEqual(await monarchyController.numDefinedGames(), 5);
            await monarchyController.enableDefinedGame(1, true, {from: admin});
            await monarchyController.enableDefinedGame(2, true, {from: admin});
            await monarchyController.enableDefinedGame(3, true, {from: admin});
            await monarchyController.enableDefinedGame(4, true, {from: admin});
        });
        it("Fails when index out of bounds", function(){
            return assertCannotStartGame(6, "Index out of bounds.");
        });
        it("Fails when not enabled", function(){
            return assertCannotStartGame(5, "DefinedGame is not enabled.");
        });
        it("Fails when when initialPrize is too large", function(){
            return assertCannotStartGame(3, "Not enough funds to start this game.");
        });
        it("Fails when starting game with bad params", async function(){
            return assertCannotStartGame(2, "MonarchyFactory could not create game (invalid params?)");
        });
        it("Fails if Factory would set collector to a different contract", async function(){
            this.logInfo("First, set registry.MONARCHY_CONTROLLER to another value");
            await createDefaultTxTester()
                .doTx([registry, "register", "MONARCHY_CONTROLLER", anon, {from: owner}])
                .assertSuccess().start();

            this.logInfo("");
            this.logInfo("Run test.");
            await assertCannotStartGame(1, "MonarchyFactory.getCollector() points to a different contract.");

            this.logInfo("");
            this.logInfo("Restore registry.MONARCHY_CONTROLLER");
            await createDefaultTxTester()
                .doTx([registry, "register", "MONARCHY_CONTROLLER", monarchyController.address, {from: owner}])
                .assertSuccess().start();
        });
        it("starts game 1", async function(){
            return assertCanStartGame(1);
        });
        it("Fails when already started", function(){
            return assertCannotStartGame(1, "Game is already started.");
        });
        it("starts game 4", async function(){
            return assertCanStartGame(4);
        })
    });

    describe(".getIsStartable()", function(){
        it("Returns correct values", function(){
            return createDefaultTxTester()
                .assertCallReturns([monarchyController, "getIsStartable", 1], false) // already started
                .assertCallReturns([monarchyController, "getIsStartable", 2], true)  // startable
                .assertCallReturns([monarchyController, "getIsStartable", 3], false) // not enough funds
                .assertCallReturns([monarchyController, "getIsStartable", 4], false) // already started
                .assertCallReturns([monarchyController, "getIsStartable", 5], false) // not enabled
                .start();
        })
    });

    // At this point, definedGames[1] is started
    describe("With active games", async function(){
        var game1;
        var game4;
        before("There are started games", async function(){
            game1 = MonarchyGame.at(await monarchyController.getGame(1));
            assert.notEqual(game1.address, NO_ADDRESS);
            game4 = MonarchyGame.at(await monarchyController.getGame(4));
            assert.notEqual(game4.address, NO_ADDRESS);
        });
        it("Overthrows twice", async function(){
            await game1.sendTransaction({from: player1, value: DEF_1.fee});
            await game1.sendTransaction({from: player2, value: DEF_1.fee});
            await game4.sendTransaction({from: player2, value: DEF_4.fee});
            await game4.sendTransaction({from: player1, value: DEF_4.fee});
        });
        it(".getAvailableFees() returns expected amount", async function(){
            const expFees = DEF_1.feeIncr().mul(2).plus(DEF_4.feeIncr().mul(2));
            return createDefaultTxTester()
                .assertCallReturns([monarchyController, "getAvailableFees"], expFees)
                .start();
        });
        it(".getNumEndableGames() is zero", async function(){
            return createDefaultTxTester()
                .assertCallReturns([monarchyController, "getNumEndableGames"], 0)
                .start();
        });
        it(".refreshGames() collects fees, ends no games", async function(){
            const expFees = DEF_1.feeIncr().mul(2).plus(DEF_4.feeIncr().mul(2));
            const callParams = [monarchyController, "refreshGames", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, expFees])
                .startLedger([monarchyController])
                .startWatching([game1, game4])
                .doTx(callParams)
                .assertSuccess()
                    .assertLog("FeesCollected", {
                        time: null,
                        amount: expFees
                    })
                .stopLedger()
                    .assertDelta(monarchyController, expFees)
                .stopWatching()
                    .assertOnlyEvent(game1, "FeesSent")
                    .assertOnlyEvent(game4, "FeesSent")
                .assertCallReturns([monarchyController, "totalFees"], expFees)
                .assertCallReturns([monarchyController, "getAvailableFees"], 0)
                .assertCallReturns([game1, "fees"], 0)
                .assertCallReturns([game4, "fees"], 0)
                .assertCallReturns([game1, "isPaid"], false)
                .assertCallReturns([game4, "isPaid"], false)
                .start();
        });
        it(".refreshGames() collects no fees, ends no games", async function(){
            const callParams = [monarchyController, "refreshGames", {from: anon}];
            const expFees = await monarchyController.totalFees();
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, 0])
                .startLedger([monarchyController])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(0)
                .stopLedger()
                    .assertNoDelta(monarchyController)
                .assertCallReturns([monarchyController, "totalFees"], expFees)
                .start(); 
        });
    });


    describe("When a game ends", function(){
        var game1;
        before("Fast forwards until game1 is ended", async function(){
            game1 = MonarchyGame.at(await monarchyController.getGame(1));
            const blocksRemaining = await game1.getBlocksRemaining();
            console.log(`Mining ${blocksRemaining} blocks so game1 ends...`);
            await testUtil.mineBlocks(blocksRemaining);
        });
        it(".getNumEndableGames() should return 1", async function(){
            return createDefaultTxTester()
                .assertCallReturns([monarchyController, "getNumEndableGames"], 1)
                .start();
        });
        it(".refreshGames() returns 1 game ended, and 0 fees collected", async function(){
            const winner = await game1.monarch();
            const prize = await game1.prize();
            const expectedFees = await monarchyController.totalFees();
            const expectedOverthrows = await game1.numOverthrows();
            const expectedPrizes = await game1.prize();
            const callParams = [monarchyController, "refreshGames", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [1, 0])
                .startLedger([monarchyController, winner])
                .startWatching([game1])
                .doTx(callParams)
                .assertSuccess()
                    .assertOnlyLog("GameEnded", {
                        time: null,
                        index: 1,
                        winner: winner,
                        addr: game1.address
                    })
                .stopLedger()
                    .assertDelta(winner, prize)
                    .assertNoDelta(monarchyController)
                .stopWatching()
                    .assertEvent(game1, "SendPrizeSuccess", {
                        time: null,
                        redeemer: monarchyController.address,
                        recipient: winner,
                        amount: prize,
                        gasLimit: null
                        //gasLimit: 2300 // ganache bug mis-reports this as 4600.
                    })
                .assertCallReturns([monarchyController, "getIsStartable", 1], true)
                .assertCallReturns([monarchyController, "getGame", 1], NO_ADDRESS)
                .assertCallReturns([monarchyController, "numEndedGames"], 1)
                .assertCallReturns([monarchyController, "endedGames", 0], game1.address)
                .assertCallReturns([monarchyController, "totalFees"], expectedFees)
                .assertCallReturns([monarchyController, "totalOverthrows"], expectedOverthrows)
                .assertCallReturns([monarchyController, "totalPrizes"], expectedPrizes)
                .assertCallReturns([game1, "isPaid"], true)
                .start()
        });
        it(".refreshGames() returns 0 games ended, and 0 fees collected", async function(){
            const expectedFees = await monarchyController.totalFees();
            const expectedOverthrows = await monarchyController.totalOverthrows();
            const expectedPrizes = await monarchyController.totalPrizes();
            const callParams = [monarchyController, "refreshGames", {from: anon}];
            return createDefaultTxTester()
                .assertCallReturns(callParams, [0, 0])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(0)
                .assertCallReturns([monarchyController, "totalFees"], expectedFees)
                .assertCallReturns([monarchyController, "totalOverthrows"], expectedOverthrows)
                .assertCallReturns([monarchyController, "totalPrizes"], expectedPrizes)
                .start()
        });
    });

    // Should still end game as expected, and shouldn't stall controller
    describe("Game with a maliciousPlayer winner", async function(){
        var game4;
        before("Overthrow on game4 with maliciousPlayer, end it...", async function(){
            this.logInfo("Confirming game4 is active...");
            game4 = MonarchyGame.at(await monarchyController.getGame(4));
            assert((await game4.getBlocksRemaining()).gt(0), "game4 has not ended yet");

            // fund maliciousPlayer, overthrow game #4
            this.logInfo("Making maliciousPlayer overthrow on game4...");
            const toSend = DEF_4.fee.mul(2);
            await maliciousPlayer.fund({value: toSend, from: anon});
            assert.strEqual(await testUtil.getBalance(maliciousPlayer), toSend);
            await maliciousPlayer.doOverthrow(game4.address, {from: anon});
            assert.strEqual(await game4.monarch(), maliciousPlayer.address);

            // fast-forward
            const blocksRemaining = await game4.getBlocksRemaining();
            this.logInfo(`Mining ${blocksRemaining} blocks so game4 ends...`)
            await testUtil.mineBlocks(blocksRemaining);
        });
        it(".refreshGames() ends game, collects fees, but doesnt pay maliciousPlayer", async function(){
            const callParams = [monarchyController, "refreshGames", {from: anon}];
            const expPrize = await game4.prize();
            const expFees = await game4.fees();
            const expTotalFees = (await monarchyController.totalFees()).plus(expFees);
            const expTotalOverthrows = (await monarchyController.totalOverthrows()).plus(await game4.numOverthrows());
            const expTotalPrizes = (await monarchyController.totalPrizes()).plus(expPrize);
            return createDefaultTxTester()
                .assertCallReturns(callParams, [1, expFees])
                .startLedger([monarchyController, maliciousPlayer, anon])
                .startWatching([game4])
                .doTx(callParams)
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("GameEnded", {
                        time: null,
                        index: 4,
                        addr: game4.address
                    })
                    .assertLog("FeesCollected", {
                        time: null,
                        amount: expFees
                    })
                .stopLedger()
                    .assertDelta(monarchyController, expFees)
                    .assertNoDelta(maliciousPlayer)
                    .assertLostTxFee(anon)
                .stopWatching()
                    .assertEventCount(game4, 2)
                    .assertEvent(game4, "FeesSent", {
                        time: null,
                        amount: expFees
                    })
                    .assertEvent(game4, "SendPrizeFailure", {
                        time: null,
                        redeemer: monarchyController.address,
                        recipient: maliciousPlayer.address,
                        amount: expPrize,
                        gasLimit: null
                        // gasLimit: 2300 // ganache bug misreports this
                    })
                .assertCallReturns([monarchyController, "getIsStartable", 4], true)
                .assertCallReturns([monarchyController, "getGame", 4], NO_ADDRESS)
                .assertCallReturns([monarchyController, "numEndedGames"], 2)
                .assertCallReturns([monarchyController, "endedGames", 1], game4.address)
                .assertCallReturns([monarchyController, "totalFees"], expTotalFees)
                .assertCallReturns([monarchyController, "totalOverthrows"], expTotalOverthrows)
                .assertCallReturns([monarchyController, "totalPrizes"], expTotalPrizes)
                .assertCallReturns([game4, "isPaid"], false)
                .assertCallReturns([game4, "fees"], 0)
                .start()
        });
    });

    describe(".startDefinedGameManually()", function(){
        before("Assert game1 is startable", function(){
            return createDefaultTxTester()
                .assertCallReturns([monarchyController, "getIsStartable", 1], true)
                .start();
        })
        it("Refunds if invalid amount sent", function(){
            const initialPrize = DEF_1.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, monarchyController])
                .doTx([monarchyController, "startDefinedGameManually", 1, {from: anon, value: initialPrize.plus(1)}])
                .assertSuccess()
                    .assertOnlyLog("Error", {msg: "Value sent does not match initialPrize."})
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(monarchyController)
                .start();
        });
        it("Refunds if fails to start game (invalid params on defined game)", function(){
            const initialPrize = DEF_2.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, monarchyController])
                .doTx([monarchyController, "startDefinedGameManually", 2, {from: anon, value: initialPrize}])
                .assertSuccess()
                    .assertLogCount(2)
                    .assertLog("DefinedGameFailedCreation")
                    .assertLog("Error")
                .stopLedger()
                    .assertLostTxFee(anon)
                    .assertNoDelta(monarchyController)
                .start();
        });
        it("Works", function(){
            const initialPrize = DEF_1.initialPrize;
            return createDefaultTxTester()
                .startLedger([anon, monarchyController])
                .doTx([monarchyController, "startDefinedGameManually", 1, {from: anon, value: initialPrize}])
                .assertSuccess()
                    .assertOnlyLog("GameStarted", {index: 1})
                .stopLedger()
                    .assertDeltaMinusTxFee(anon, initialPrize.mul(-1))
                    .assertNoDelta(monarchyController)
                .assertCallReturns([monarchyController, "getGame", 1], {not: NO_ADDRESS})
                .start();
        });
    });

    async function assertCanEditGame(index, acct) {
        const curNum = await monarchyController.numDefinedGames();
        var expNumDefined;
        if (index-1 == curNum) {
            console.log("This should add the game and increase numDefinedGames.")
            expNumDefined = curNum.plus(1);
        } else {
            console.log("This should edit an existing defined game.")
            expNumDefined = curNum;
        }

        const DEF = DEFS[index].toArr();
        const callParams = [monarchyController, "editDefinedGame", index].concat(DEF, {from: acct});
        return createDefaultTxTester()
            .assertCallReturns(callParams, true)
            .doTx(callParams)
            .assertSuccess()
            .assertOnlyLog("DefinedGameEdited", {time: null, index: index})
            .assertCallReturns([monarchyController, "numDefinedGames"], expNumDefined)
            .assertCallReturns([monarchyController, "definedGames", index], 
                [
                    "0x0000000000000000000000000000000000000000",
                    false
                ].concat(DEF)
            )
            .start()
    }
    async function assertCannotEditGame(index, acct, errMsg) {
        const DEF = DEFS[index].toArr();
        const callParams = [monarchyController, "editDefinedGame", index].concat(DEF, {from: acct})
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

    async function assertCanStartGame(index) {
        const DEF = await getDefinedGame(index);

        var game;
        const callParams = [monarchyController, "startDefinedGame", index, {from: anon}];
        await createDefaultTxTester()
            .assertCallReturns(callParams, {not: NO_ADDRESS})
            .startLedger([monarchyController])
            .startWatching([monarchyFactory])
            .doTx(callParams)
            .assertSuccess()
                .assertOnlyLog("GameStarted")
                .withTxResult((txRes, plugins) => {
                    game = MonarchyGame.at(txRes.logs[0].args.addr);
                    const obj = {};
                    obj[`game@${index}`] = game.address;
                    plugins.addAddresses(obj);
                })
                .assertOnlyLog("GameStarted", {
                    time: null,
                    index: index,
                    addr: ()=>game.address,
                    initialPrize: DEF.initialPrize
                })
            .stopWatching()
                .assertEvent(monarchyFactory, "GameCreated", {
                    time: null,
                    addr: ()=>game.address,
                    collector: monarchyController.address,
                    initialPrize: DEF.initialPrize,
                    fee: DEF.fee,
                    reignBlocks: DEF.reignBlocks,
                    prizeIncr: DEF.prizeIncr,
                    initialBlocks: DEF.initialBlocks
                })
            .stopLedger()
                .assertDelta(monarchyController, DEF.initialPrize.mul(-1))
            .assertBalance(()=>game, DEF.initialPrize)
            .assertCallReturns([monarchyController, "getGame", index], ()=>game.address)
            .assertCallReturns([monarchyController, "getIsStartable", index], false)
            .assertCallReturns(()=>[game, "prize"], DEF.initialPrize)
            .assertCallReturns(()=>[game, "fee"], DEF.fee)
            .assertCallReturns(()=>[game, "reignBlocks"], DEF.reignBlocks)
            .assertCallReturns(()=>[game, "prizeIncr"], DEF.prizeIncr)
            .assertCallReturns(()=>[game, "monarch"], monarchyController.address)
            .start();
    }

    async function assertCannotStartGame(index, msg) {
        const callParams = [monarchyController, "startDefinedGame", index, {from: anon}];
        const expLogs = [["Error", {msg: msg}]];
        if (msg === "MonarchyFactory could not create game (invalid params?)") {
            expLogs.push(["DefinedGameFailedCreation", {index: index}])
        }
        
        const txTester = createDefaultTxTester()
            .assertCallReturns(callParams, NO_ADDRESS)
            .startLedger([monarchyController, anon])
            .doTx(callParams)
            .assertSuccess()
            .assertLogCount(expLogs.length);
        
        expLogs.forEach(l=>{
            txTester.assertLog(l[0], l[1]);
        })

        return txTester
            .stopLedger()
                .assertLostTxFee(anon)
                .assertNoDelta(monarchyController)
            .start();
    }

    async function getDefinedGame(index) {
        arr = await monarchyController.definedGames(index);
        return {
            game: arr[0],
            isEnabled: arr[1],
            summary: arr[2],
            initialPrize: arr[3],
            fee: arr[4],
            prizeIncr: arr[5],
            reignBlocks: arr[6],
            initialBlocks: arr[7]
        };
    }
});