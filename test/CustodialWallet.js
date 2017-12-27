const CustodialWallet = artifacts.require("CustodialWallet");
const DumbContract = artifacts.require("DumbContract");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('CustodialWallet', function(){
    const accounts = web3.eth.accounts;
    const owner1 = accounts[1];
    const owner2 = accounts[2];
    const owner3 = accounts[3];
    const cust1 = accounts[4];
    const cust2 = accounts[5];
    const cust3 = accounts[6];
    const anon = accounts[7];
    var cWallet;
    var dContract;

    const addresses = {
    	owner1: owner1,
    	owner2: owner2,
    	owner3: owner3,
    	cust1: cust1,
    	cust2: cust2,
    	cust3: cust3,
    	anon: anon
    };

    before("Create CustodialWallet and DumbContract", async function(){
    	cWallet = await CustodialWallet.new(cust1, owner1);
    	addresses.cWallet = cWallet.address;
    	dContract = await DumbContract.new();
    	addresses.dContract = dContract.address;
    	await createDefaultTxTester()
    		.nameAddresses(addresses)
    		.start();
    });

    it("Has correct state", function(){
    	return createDefaultTxTester()
    		.assertCallReturns([cWallet, "custodian"], cust1)
    		.assertCallReturns([cWallet, "owner"], owner1)
    		.start();
    });

    describe(".doCall", function(){
		it("Cannot do calls from non custodian", function(){
	    	const DATA = dContract.contract.setVals.getData(5, 6);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dContract.address, DATA, {from: anon}])
	    		.assertInvalidOpCode()
	    		.start();
	    });
	    it("Can do calls from custodian", function(){
	    	const DATA = dContract.contract.setVals.getData(5, 6);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dContract.address, DATA, {from: cust1}])
	    		.assertSuccess()
	    		.assertCallReturns([dContract, "val1"], 5)
	    		.assertCallReturns([dContract, "val2"], 6)
	    		.start();
	    });
	    it("Can do payable calls", function(){
	    	const DATA = dContract.contract.payToSetVal2.getData(100);
	    	const AMT = new BigNumber(1.23456e16);
	    	return createDefaultTxTester()
	    		.startLedger([cust1, cWallet, dContract])
	    		.doTx([cWallet, "doCall", dContract.address, DATA, {from: cust1, value: AMT}])
	    		.assertSuccess()
	    			.assertCallReturns([dContract, "val2"], 100)
	    		.stopLedger()
	    			.assertDeltaMinusTxFee(cust1, AMT.mul(-1))
	    			.assertDelta(cWallet, 0)
	    			.assertDelta(dContract, AMT)
	    		.start();
	    });
	    it("Can do calls that get it payed", async function(){
	    	const DATA = dContract.contract.sendBalance.getData();
	    	const AMT = await testUtil.getBalance(dContract);
	    	return createDefaultTxTester()
	    		.startLedger([cust1, cWallet, dContract])
	    		.doTx([cWallet, "doCall", dContract.address, DATA, {from: cust1}])
	    		.assertSuccess()
	    		.stopLedger()
	    			.assertLostTxFee(cust1)
	    			.assertDelta(cWallet, AMT)
	    			.assertDelta(dContract, AMT.mul(-1))
	    		.start();
	    });
    });

    describe(".collect()", function(){
    	it("Cannot be called by anon", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "collect", anon, {from: anon}])
    			.assertInvalidOpCode()
    			.start();
    	});
    	it("Works", async function(){
    		const AMT = testUtil.getBalance(cWallet);
    		assert(AMT.gt(0), "Must have a balance.");
    		return createDefaultTxTester()
    			.startLedger([cust1, anon, cWallet])
    			.doTx([cWallet, "collect", anon, {from: cust1}])
    			.assertSuccess()
    			.stopLedger()
    				.assertLostTxFee(cust1)
    				.assertDelta(anon, AMT)
    				.assertDelta(cWallet, AMT.mul(-1))
    			.start();

    	});
    });

    describe("Changing custodians", async function(){
    	it("Cannot be called by anon", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, owner2, {from: anon}])
    			.assertInvalidOpCode()
    			.start()
    	})
    	it("Will not change if new owner is unset", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, 0, {from: owner1}])
    			.assertInvalidOpCode()
    			.start()
    	});
    	it("Works", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, owner2, {from: owner1}])
    			.assertSuccess()
    			.assertCallReturns([cWallet, "custodian"], cust2)
    			.assertCallReturns([cWallet, "owner"], owner2)
    			.start();
    	});
    	it("Will not work again with old owner", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, owner2, {from: owner1}])
    			.assertInvalidOpCode()
    			.start();
    	});
    });

    describe(".doCall, again", function(){
		it("Cannot do calls from old custodian", function(){
	    	const DATA = dContract.contract.setVals.getData(10, 20);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dContract.address, DATA, {from: cust1}])
	    		.assertInvalidOpCode()
	    		.start();
	    });
	    it("Can do calls from new custodian", function(){
	    	const DATA = dContract.contract.setVals.getData(10, 20);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dContract.address, DATA, {from: cust2}])
	    		.assertSuccess()
	    		.assertCallReturns([dContract, "val1"], 10)
	    		.assertCallReturns([dContract, "val2"], 20)
	    		.start();
	    });
    })

});