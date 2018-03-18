function Create(web3, createDefaultTxTester) {
	const BigNumber = web3.toBigNumber(0).constructor;
	const testUtil = createDefaultTxTester().plugins.testUtil;

	async function assertAddsBankroll(instance, account, amount) {
        amount = new BigNumber(amount);
        const expBankroll = (await instance.bankroll()).plus(amount);
        const expBankrolled = (await instance.bankrolled(account)).plus(amount);
        const expProfits = await instance.getProfits();
        return createDefaultTxTester()
            .startLedger([account, instance])
            .doTx([instance, "addBankroll", {from: account, value: amount}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(instance, amount)
                .assertDeltaMinusTxFee(account, amount.mul(-1))
            .assertOnlyLog("BankrollAdded", {
                time: null,
                sender: account,
                amount: amount,
                bankroll: expBankroll
            })
            .assertCallReturns([instance, "bankroll"], expBankroll)
            .assertCallReturns([instance, "bankrolled", account], expBankrolled)
            .assertCallReturns([instance, "getProfits"], expProfits)
            .start();
    }

    async function assertRemovesBankroll(instance, account, amount) {
        amount = new BigNumber(amount);
        const bankroll = await instance.bankroll();
        const bankrolled = await instance.bankrolled(account);
        const collateral = await instance.getCollateral();
        const balance = await testUtil.getBalance(instance);

        var expAmount = amount;
        // Case where account did not bankroll as much as amount.
        if (expAmount.gt(bankrolled)) {
        	console.log(`Note: Account only bankrolled ${bankrolled}.`);
        	expAmount = bankrolled;
        }
        // Can only remove an amount that makes balance == collateral
        const available = BigNumber.max(balance.minus(collateral), new BigNumber(0));
        if (expAmount.gt(available)) {
        	expAmount = available;
        	console.log(`Note: Only ${available} bankroll is available to be removed.`);
        }

        const expBankroll = bankroll.minus(expAmount);
        const expBankrolled = bankrolled.minus(expAmount);
        const expProfits = await instance.getProfits();

        const txTester = createDefaultTxTester()
            .startLedger([account, instance])
            .doTx([instance, "removeBankroll", amount, {from: account}])
            .assertSuccess()
            .stopLedger()
                .assertDelta(instance, expAmount.mul(-1))
                .assertDeltaMinusTxFee(account, expAmount);

        if (expAmount.gt(0)) {
        	txTester.assertOnlyLog("BankrollRemoved", {
                time: null,
                recipient: account,
                amount: expAmount,
                bankroll: expBankroll
            });
        }

        return txTester
            .assertCallReturns([instance, "bankroll"], expBankroll)
            .assertCallReturns([instance, "bankrolled", account], expBankrolled)
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
                recipient: treasury,
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