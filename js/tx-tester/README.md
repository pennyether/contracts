# TxTester

TxTester helps you _thoroughly_ test all side-effects of transactions.

It prints out nicely formatted messages, including naming of addresses, gas usage, values as Wei, GWei, Eth, and more.

The default plugin supports:
	- Asserting TXs:
		- succeed, fail
		- return with the expected logs
	- Asserting balances:
		- increase, decrease, don't change
		- include or exclude txFee
	- Asserting events:
		- you can watch events of any number of addresses
		- test count, exact params, etc
	- Asynchronous Arguments
		- nearly all arguments support promises or fns
		

## Usage

We'll update this to be more insightful once this becomes a separate package.

For now, you can look around at our existing test files. Or have a look at plugins.js.

Here's a quick and dirty overview:

```
const web3 = /*...*/;
const assert = require("chai").assert;
const createDefaultTxTester = require("tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert);

createDefaultTxTester()
	// ledger starts watching on these addresses
	.startLedger([addr1, addr2])
	// does a transaction, using truffle-contract library
	.doTx([myContract, "someFn", <param1>, <param2>])
	.assertSucces() 				// ensures no failure in the Tx
		// ensures a log was emitted with this data
		.assertLog("NameOfLog", {
			param1: 123,
			param2: "some string",
			param3: null				// this only tests that param3 exists
		})
		// ensures contract2.someConstant() returns 5678
		.assertCallReturns([contract2, "someConstant"], 5678)
	.doFn(async function(){
		// you can define a promise here, and use it in a later assertion.
		// perhaps you want to assert a value of a newly created contract
		pContract = Contract.at(await myContract.getNewContract());
		someResultThatJustHappened = myContract.foo();
	})
		// assertCallReturns can take fn's as arguments, allowing async stuff.
		.assertCallReturns(()=>[pContract, "foo"], ()=>someResultThatJustHappened)
	// this tells the ledger to collect all data for [addr1, addr2]
	.stopLedger()
	.assertDelta(addr1, 123)			// ensures addr1 gained 123 wei
	.assertDeltaMinusTxFee(addr2, 123)	// ensures addr2 gains 123, but lost txFee
	.start();							// starts the asyncChain above, returns promise.

// Prints out really nice looking log. You'll have to try it for yourself to see.

```