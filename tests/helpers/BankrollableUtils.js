function Create(web3, createDefaultTxTester) {
	const BigNumber = web3.toBigNumber(0).constructor;
	const testUtil = createDefaultTxTester().plugins.testUtil;

    // todo: test expected mappings (add when added, remove when 0'd)
    const EXP_TABLE = [];
    var EXP_BANKROLLED = new BigNumber(0);
    
    function addToTable(acct, amt) {
        amt = new BigNumber(amt);
        const entry = EXP_TABLE.find(e => e[0]==acct);
        if (entry) {
            console.log("Entry should be increased.");
            entry[1] = entry[1].plus(amt);
        } else {
            console.log("Entry should be added to front of mappings.");
            EXP_TABLE.unshift([acct, amt]);
        }
        EXP_BANKROLLED = EXP_BANKROLLED.plus(amt);
    }

    function removeFromTable(acct, amt) {
        amt = new BigNumber(amt);

        var expAmt = amt;
        const entry = EXP_TABLE.find(e => e[0]==acct);
        if (entry) {
            if (entry[1].gt(amt)) {
                console.log("Entry should be decreased.");
                entry[1] = entry[1].minus(amt);
            } else {
                console.log("Entry should be removed from ledger.");
                expAmt = entry[1];
                const index = EXP_TABLE.indexOf(entry);
                EXP_TABLE.splice(index, 1);
            }
        } else {
            console.log("Entry doesn't exist. Nothing should change.")
            expAmt = 0;
        }
        EXP_BANKROLLED = EXP_BANKROLLED.minus(expAmt);
        return expAmt;
    }

    function expTable() {
        const addresses = EXP_TABLE.map(e => e[0]);
        const values = EXP_TABLE.map(e => e[1]);
        return [addresses, values];
    }

	async function assertAddsBankroll(instance, account, amount) {
        amount = new BigNumber(amount);
        const expBankroll = (await instance.bankroll()).plus(amount);
        const expBankrolled = (await instance.bankrolled(account)).plus(amount);
        const expProfits = await instance.getProfits();
        addToTable(account, amount);

        return createDefaultTxTester()
            .startLedger([account, instance])
            .doTx([instance, "addBankroll", {from: account, value: amount}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(instance, amount)
                .assertDeltaMinusTxFee(account, amount.mul(-1))
            .assertOnlyLog("BankrollAdded", {
                time: null,
                bankroller: account,
                amount: amount,
                bankroll: expBankroll
            })
            .assertCallReturns([instance, "bankroll"], expBankroll)
            .assertCallReturns([instance, "bankrolled", account], expBankrolled)
            .assertCallReturns([instance, "getProfits"], expProfits)
            .assertCallReturns([instance, "getBankrollerTable"], expTable())
            .start();
    }

    async function assertRemovesBankroll(instance, account, amount) {
        amount = new BigNumber(amount);
        const bankroll = await instance.bankroll();
        const bankrolled = await instance.bankrolled(account);
        const collateral = await instance.getCollateral();
        const balance = await testUtil.getBalance(instance);
        var expAmount = amount;

        // Can only remove an amount that makes balance == collateral
        const available = BigNumber.max(balance.minus(collateral), new BigNumber(0));
        if (expAmount.gt(available)) {
        	expAmount = available;
        	console.log(`Note: Only ${available} bankroll is available to be removed.`);
        }
        expAmount = removeFromTable(account, expAmount);

        const expBankroll = bankroll.minus(expAmount);
        const expBankrolled = bankrolled.minus(expAmount);
        const expProfits = await instance.getProfits();

        const txTester = createDefaultTxTester()
            .startLedger([account, instance])
            .doTx([instance, "removeBankroll", amount, "", {from: account}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(instance, expAmount.mul(-1))
                .assertDeltaMinusTxFee(account, expAmount);

        if (expAmount.gt(0)) {
        	txTester.assertOnlyLog("BankrollRemoved", {
                time: null,
                bankroller: account,
                amount: expAmount,
                bankroll: expBankroll
            });
        }

        return txTester
            .assertCallReturns([instance, "bankroll"], expBankroll)
            .assertCallReturns([instance, "bankrolled", account], expBankrolled)
            .assertCallReturns([instance, "getBankrollerTable"], expTable())
            .start();
    }

    async function assertSendsProfits(instance, account) {
    	const treasury = await instance.getTreasury();
    	const bankroll = await instance.bankroll();
    	const collateral = await instance.getCollateral();
        const balance = await testUtil.getBalance(instance);
        const expProfits = BigNumber.max(balance.minus(collateral).minus(bankroll), 0);

    	const txTester = createDefaultTxTester()
            .startLedger([instance, treasury, account])
            .doTx([instance, "sendProfits", {from: account}])
            .assertSuccess();

        if (expProfits.gt(0)){
        	txTester.assertOnlyLog("ProfitsSent", {
                time: null,
                treasury: treasury,
                amount: expProfits
            });
        }

    	return txTester
        	.stopLedger()
                .assertDelta(instance, expProfits.mul(-1))
                .assertDelta(treasury, expProfits)
                .assertLostTxFee(account)
            .assertCallReturns([instance, "bankroll"], bankroll)
            .assertCallReturns([instance, "getProfits"], 0)
            .start();
    }

    async function assertState(instance) {
    	const bankroll = await instance.bankroll();
    	const collateral = await instance.getCollateral();
        const balance = await testUtil.getBalance(instance);
        const expProfits = BigNumber.max(balance.minus(collateral).minus(bankroll), 0);

        var expAvailableBankroll;
        if (balance.lt(collateral)) {
        	console.log(`No bankroll available.`);
        	expAvailableBankroll = 0;
        } else if (balance.lt(collateral.plus(bankroll))) {
        	console.log(`Some bankroll is availabe.`);
        	expAvailableBankroll = balance.minus(collateral);
        } else {
        	console.log(`All bankroll is available.`);
        	expAvailableBankroll = bankroll;
        }
        return createDefaultTxTester()
        	.assertCallReturns([instance, "getAvailableBankroll"], expAvailableBankroll)
        	.assertCallReturns([instance, "getProfits"], expProfits)
        	.start();
    }

    return {
    	assertAddsBankroll: assertAddsBankroll,
    	assertRemovesBankroll: assertRemovesBankroll,
    	assertSendsProfits: assertSendsProfits,
    	assertState: assertState
    };
}
module.exports = {Create: Create};