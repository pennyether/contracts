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
    const supervisor1 = accounts[3];
    const supervisor2 = accounts[4];
    const supervisor3 = accounts[5];
    const cust1 = accounts[6];
    const cust2 = accounts[7];
    const cust3 = accounts[8];
    const anon = accounts[9];
    var cWallet;
    var dumbContract;

    const addresses = {
        owner1: owner1,
        owner2: owner2,
    	supervisor1: supervisor1,
    	supervisor2: supervisor2,
    	supervisor3: supervisor3,
    	cust1: cust1,
    	cust2: cust2,
    	cust3: cust3,
    	anon: anon
    };

    before("Create CustodialWallet and DumbContract", async function(){
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create the Custodial Wallet that we will be testing.");
        await createDefaultTxTester()
            .doNewTx(CustodialWallet, [cust1, supervisor1, owner1], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                cWallet = res.contract;
                plugins.addAddresses({cWallet: cWallet.address});
            }).start();

        this.logInfo("Create a 'dumb contract' that has a few functions cWallet will call.");
        await createDefaultTxTester()
            .doNewTx(DumbContract, [], {from: anon})
            .assertSuccess()
            .withTxResult((res, plugins)=>{
                dumbContract = res.contract;
                plugins.addAddresses({dumbContract: dumbContract.address});
            }).start();

        await createDefaultTxTester().printNamedAddresses().start();
    });

    it("Has correct state", function(){
    	return createDefaultTxTester()
    		.assertCallReturns([cWallet, "custodian"], cust1)
    		.assertCallReturns([cWallet, "supervisor"], supervisor1)
            .assertCallReturns([cWallet, "owner"], owner1)
    		.start();
    });

    describe(".doCall", function(){
		it("Cannot do calls from non custodian", function(){
            this.logInfo("Attempts a call to dumbContract.setVals(5,6)");
	    	const DATA = dumbContract.contract.setVals.getData(5, 6);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dumbContract.address, DATA, {from: anon}])
	    		.assertInvalidOpCode()
	    		.start();
	    });
	    it("Can do calls from custodian", function(){
            this.logInfo("Attempts a call to dumbContract.setVals(5,6)");
	    	const DATA = dumbContract.contract.setVals.getData(5, 6);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dumbContract.address, DATA, {from: cust1}])
	    		.assertSuccess()
	    		.assertCallReturns([dumbContract, "val1"], 5)
	    		.assertCallReturns([dumbContract, "val2"], 6)
	    		.start();
	    });
	    it("Can do payable calls", function(){
            this.logInfo("Attempts a call to dumbContract.payToSetVal2(100), sending some ETH");
	    	const DATA = dumbContract.contract.payToSetVal2.getData(100);
	    	const AMT = new BigNumber(1.23456e16);
	    	return createDefaultTxTester()
	    		.startLedger([cust1, cWallet, dumbContract])
	    		.doTx([cWallet, "doCall", dumbContract.address, DATA, {from: cust1, value: AMT}])
	    		.assertSuccess()
	    			.assertCallReturns([dumbContract, "val2"], 100)
	    		.stopLedger()
	    			.assertDeltaMinusTxFee(cust1, AMT.mul(-1))
	    			.assertDelta(cWallet, 0)
	    			.assertDelta(dumbContract, AMT)
	    		.start();
	    });
	    it("Can do calls that get it payed", async function(){
            this.logInfo("Attempts a call to dumbContract.sendBalance.");
	    	const DATA = dumbContract.contract.sendBalance.getData();
	    	const AMT = await testUtil.getBalance(dumbContract);
	    	return createDefaultTxTester()
	    		.startLedger([cust1, cWallet, dumbContract])
	    		.doTx([cWallet, "doCall", dumbContract.address, DATA, {from: cust1}])
	    		.assertSuccess()
	    		.stopLedger()
	    			.assertLostTxFee(cust1)
	    			.assertDelta(cWallet, AMT)
	    			.assertDelta(dumbContract, AMT.mul(-1))
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
        it("Will not work from custodian", function(){
            return createDefaultTxTester()
                .doTx([cWallet, "collect", anon, {from: cust1}])
                .assertInvalidOpCode()
                .start();
        });
        it("Will not work if no new supervisor provided", function(){
            return createDefaultTxTester()
                .doTx([cWallet, "collect", anon, {from: supervisor1}])
                .assertInvalidOpCode()
                .start();
        });
    	it("Works", async function(){
    		const AMT = testUtil.getBalance(cWallet);
    		assert(AMT.gt(0), "cWallet must have a balance.");
    		return createDefaultTxTester()
    			.startLedger([supervisor1, anon, cWallet])
    			.doTx([cWallet, "collect", anon, supervisor2, {from: supervisor1}])
    			.assertSuccess()
    			.stopLedger()
    				.assertLostTxFee(supervisor1)
    				.assertDelta(anon, AMT)
    				.assertDelta(cWallet, AMT.mul(-1))
                .assertCallReturns([cWallet, "supervisor"], supervisor2)
    			.start();

    	});
    });

    describe(".setCustodian()", async function(){
    	it("Cannot be called by anon", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, supervisor2, {from: anon}])
    			.assertInvalidOpCode()
    			.start()
    	})
    	it("Will not change if new supervisor is unset", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, 0, {from: supervisor2}])
    			.assertInvalidOpCode()
    			.start()
    	});
    	it("Works", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, supervisor3, {from: supervisor2}])
    			.assertSuccess()
    			.assertCallReturns([cWallet, "custodian"], cust2)
    			.assertCallReturns([cWallet, "supervisor"], supervisor3)
    			.start();
    	});
    	it("Will not work again with old supervisor", function(){
    		return createDefaultTxTester()
    			.doTx([cWallet, "setCustodian", cust2, supervisor3, {from: supervisor2}])
    			.assertInvalidOpCode()
    			.start();
    	});
    });

    describe(".doCall(), again", function(){
		it("Cannot do calls from old custodian", function(){
            this.logInfo("Attempts to call dumbContract.setVals(10,20)");
	    	const DATA = dumbContract.contract.setVals.getData(10, 20);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dumbContract.address, DATA, {from: cust1}])
	    		.assertInvalidOpCode()
	    		.start();
	    });
	    it("Can do calls from new custodian", function(){
            this.logInfo("Attempts to call dumbContract.setVals(10,20)");
	    	const DATA = dumbContract.contract.setVals.getData(10, 20);
	    	return createDefaultTxTester()
	    		.doTx([cWallet, "doCall", dumbContract.address, DATA, {from: cust2}])
	    		.assertSuccess()
	    		.assertCallReturns([dumbContract, "val1"], 10)
	    		.assertCallReturns([dumbContract, "val2"], 20)
	    		.start();
	    });
    });

    describe(".setSupervisor()", function(){
        it("Cannot be called by anon", function(){
            return createDefaultTxTester()
                .doTx([cWallet, "setSupervisor", supervisor1, owner2, {from: anon}])
                .assertInvalidOpCode()
                .start()
        })
        it("Will not change if new supervisor is unset", function(){
            return createDefaultTxTester()
                .doTx([cWallet, "setSupervisor", supervisor1, 0, {from: owner1}])
                .assertInvalidOpCode()
                .start()
        });
        it("Works", function(){
            return createDefaultTxTester()
                .doTx([cWallet, "setSupervisor", supervisor1, owner2, {from: owner1}])
                .assertSuccess()
                .assertCallReturns([cWallet, "supervisor"], supervisor1)
                .assertCallReturns([cWallet, "owner"], owner2)
                .start();
        });
        it("Will not work again with old owner", function(){
            return createDefaultTxTester()
                .doTx([cWallet, "setSupervisor", supervisor1, anon, {from: owner1}])
                .assertInvalidOpCode()
                .start();
        });
    })

});