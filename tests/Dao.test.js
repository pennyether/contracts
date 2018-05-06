const DividendToken = artifacts.require("DividendToken");
const DAO = artifacts.require("DAO");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

const accounts = web3.eth.accounts;
const comptroller = accounts[1];
const account1 = accounts[2];
const account2 = accounts[3];
const account3 = accounts[4];
const account4 = accounts[5];
const anon = accounts[6];
var dao;
var pennyToken;
var voteToken;

describe('DividendToken', function(){
    before("Initialize PENNY Token and DAO", async function(){
    	const addresses = {
            comptroller: comptroller,
            account1: account1,
            account2: account2,
            account3: account3,
            account4: account4,
            anon: anon
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create a DividendToken, owned by comptroller.");
        await createDefaultTxTester()
            .doNewTx(DividendToken, ["PennyEther", "PENNY"], {from: comptroller})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                pennyToken = res.contract;
                plugins.addAddresses({pennyToken: pennyToken.address});
            }).start();

        this.logInfo("Create DAO");
        await createDefaultTxTester()
            .doNewTx(DAO, [pennyToken.address], {from: anon})
            .assertSuccess()
            .withTxResult(async function(res, plugins){
                dao = res.contract;
                voteToken = DividendToken.at(await dao.voteToken());
                plugins.addAddresses({
                	dao: dao.address,
                	voteToken: voteToken.address
                });
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();

        this.logInfo("Mint 10,000 PENNY Tokens");
    	await mintTokens(account1, 1000);
    	await mintTokens(account2, 2000);
    	await mintTokens(account3, 3000);
    	await mintTokens(account4, 4000);
    });

    describe("Initial state", function(){
    	it("Accounts have proper amount of PENNY", function(){
    		return createDefaultTxTester()
    			.assertCallReturns([pennyToken, "balanceOf", account1], 1000)
    			.assertCallReturns([pennyToken, "balanceOf", account2], 2000)
    			.assertCallReturns([pennyToken, "balanceOf", account3], 3000)
    			.assertCallReturns([pennyToken, "balanceOf", account4], 4000)
    			.start();
    	});
    	it("Total supply of VOTE is 0, and is owned by DAO", function(){
    		return createDefaultTxTester()
    			.assertCallReturns([voteToken, "totalSupply"], 0)
    			.assertCallReturns([voteToken, "comptroller"], dao.address)
    			.assertCallReturns([voteToken, "isFrozen"], true)
    			.start();
    	});
    });

    describe("Depositing", function(){
    	it("Account1 deposits 500 tokens", function(){
    		return assertCanDeposit(account1, 500);
    	});
    	it("Account2 deposits 500 tokens", function(){
    		return assertCanDeposit(account2, 500);
    	});
    });

    describe(".distribute() works", function(){
    	before("Deposit 10 Gwei to PENNY", function(){
    		return createDefaultTxTester()
    			.doTx([pennyToken, "sendTransaction", {from: anon, value: 10e9}])
    			.assertSuccess()
    			.assertLog("DividendReceived", {
    				sender: anon,
    				amount: 10e9
    			})
    			.assertCallReturns([pennyToken, "getOwedDividends", dao.address], 1e9)
    			.start();
    	});
    	it("Call .distribute()", function(){
    		return createDefaultTxTester()
    			.doTx([dao, "distribute", {from: anon}])
    			.assertSuccess()
    			.assertBalance(voteToken, 1e9)
    			.start();
    	})
    	it("Account1 should be owed 1GWei in total", async function(){
    		const pennyOwes = await pennyToken.getOwedDividends(account1);
    		const voteOwes = await voteToken.getOwedDividends(account1);
    		assert(pennyOwes.plus(voteOwes).equals(1e9));
    	});
    	it("Account2 should be owed 2GWei in total", async function(){
    		const pennyOwes = await pennyToken.getOwedDividends(account2);
    		const voteOwes = await voteToken.getOwedDividends(account2);
    		assert(pennyOwes.plus(voteOwes).equals(2e9));
    	});
    });

    async function mintTokens(account, amt) {
    	amt = new BigNumber(amt);
    	return createDefaultTxTester()
    		.doTx([pennyToken, "mint", account, amt, {from: comptroller}])
    		.assertSuccess()
    		.start();
    }

    async function assertCanDeposit(account, amt) {
    	const expBalance = (await voteToken.balanceOf(account)).plus(amt);
    	return createDefaultTxTester()
    		.startWatching([dao])
    		.doTx([pennyToken, "transferAndCall", dao.address, amt, "0x0", {from: account}])
    		.assertSuccess()
    			.assertLog("Transfer", {
    				from: account,
    				to: dao.address,
    				amount: amt
    			})
    		.stopWatching()
    			.assertEvent(dao, "Deposited", {
    				account: account,
    				amount: amt,
    				balance: expBalance
    			})
    		.assertCallReturns([voteToken, "balanceOf", account], expBalance)
    		.start();
    }

});