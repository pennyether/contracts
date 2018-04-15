var Registry = artifacts.require("Registry");
var MonarchyFactory = artifacts.require("MonarchyFactory");
var MonarchyGame = artifacts.require("MonarchyGame");

const createDefaultTxTester = require("../../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const BigNumber = web3.toBigNumber(0).constructor;

const INITIAL_PRIZE  = new BigNumber(.05e18);
const FEE      = new BigNumber(.001e18);
const PRIZE_INCR    = new BigNumber(FEE.mul(-.1));
const REIGN_BLOCKS = new BigNumber(2);
const INITIAL_BLOCKS = new BigNumber(5);
const GAME_DEF = [INITIAL_PRIZE, FEE, PRIZE_INCR, REIGN_BLOCKS, INITIAL_BLOCKS];

const accounts = web3.eth.accounts;
const owner = accounts[1];
const dummyMc = accounts[2];
const anon = accounts[3];

describe('MonarchyFactory', async function(){
    var registry;
    var mf;
    
    before("Can be created", async function(){
        const addresses = {
            owner: owner,
            dummyMc: dummyMc,
            anon: anon
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry.address});
            }).start();

        await createDefaultTxTester()
            .doNewTx(MonarchyFactory, [registry.address], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                mf = txRes.contract;
                plugins.addAddresses({mf: mf.address});
            }).start();
        
        await createDefaultTxTester()
            .doTx([registry, "register", "MONARCHY_CONTROLLER", dummyMc, {from: owner}])
                .assertSuccess()
            .assertCallReturns([mf, "getMonarchyController"], dummyMc)
            .start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    describe(".createGame()", async function(){
        it("should fail when called by anon", function(){
            const settings = {from: anon, gas: 2000000, value: INITIAL_PRIZE};
            const callParams = [mf, "createGame"].concat(GAME_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when not passed any ETH", function(){
            const settings = {from: dummyMc, gas: 2000000}; 
            const callParams = [mf, "createGame"].concat(GAME_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when passed too little ETH", function(){
            const settings = {from: dummyMc, gas: 2000000, value: 1}; 
            const callParams = [mf, "createGame"].concat(GAME_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when passed too much ETH", function(){
            const settings = {from: dummyMc, gas: 2000000, value: INITIAL_PRIZE.plus(1)};
            const callParams = [mf, "createGame"].concat(GAME_DEF, settings);
            return createDefaultTxTester()
                .doTx(callParams)
                .assertInvalidOpCode()
                .start();
        });

        it("should fail when passed invalid game params (negative prize)", function(){
            return createDefaultTxTester()
                .doTx([mf, "createGame",
                            -1, 
                            FEE,
                            PRIZE_INCR,
                            REIGN_BLOCKS,
                            INITIAL_BLOCKS,
                            {from: dummyMc, gas: 2000000, value: INITIAL_PRIZE}
                ])
                .assertInvalidOpCode()
                .start(); 
        })

        it("works when called by MonarchyController", async function(){
            const settings = {from: dummyMc, gas: 2000000, value: INITIAL_PRIZE};
            const callParams = [mf, "createGame"].concat(GAME_DEF, settings);
            const txRes = await createDefaultTxTester()
                .doTx(callParams)
                .assertSuccess()
                .assertOnlyLog("GameCreated", {
                    time: null,
                    addr: null,
                    collector: dummyMc,
                    initialPrize: INITIAL_PRIZE,
                    fee: FEE,
                    prizeIncr: PRIZE_INCR,
                    reignBlocks: REIGN_BLOCKS,
                    initialBlocks: INITIAL_BLOCKS
                })
                .getTxResult()
                .start();

            const game = MonarchyGame.at(txRes.logs[0].args.addr);
            const block = txRes.receipt.blockNumber;
            createDefaultTxTester().nameAddresses({game: game.address}, false).start();
            console.log(`Created game @ ${game.address}`);

            await createDefaultTxTester()
                .assertCallReturns([game, "collector"], dummyMc)
                .assertCallReturns([game, "initialPrize"], INITIAL_PRIZE)
                .assertCallReturns([game, "fee"], FEE)
                .assertCallReturns([game, "prizeIncr"], PRIZE_INCR)
                .assertCallReturns([game, "reignBlocks"], REIGN_BLOCKS)
                .assertCallReturns([game, "blockEnded"], INITIAL_BLOCKS.plus(block))
                .start();
        });
    });
});