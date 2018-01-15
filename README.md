## This contains open-sourced PennyEther contracts, in a project with minimal dependancies.

## To Compile and Run Tests

- First, install dependencies: `npm install`.
- Next, run /scripts/compile.js
- Finally, run /scripts/test.js test/PennyAuction.js
	- If you receive an error that TestRPC could be found, make sure you have `testrpc` or `ganache` running on `localhost:5678` or whatever the default port is.

## Contract Architecture

- We have a `Registry` contract that keeps track of name=>address mappings.
	- Upgrading a contract is as easy as remapping the name
	- Only some contracts support this ... `Core` contracts do not
- Since many contracts use various Registry names, we created inheritible classes for each
	- `contracts/roles` allows contracts to easily access Registered contracts, and include modifiers to ensure calls from specifically registered contracts.
	- `contracts/interfaces` are the interfaces inherited when using `roles`
- We don't use libraries anywhere. We feel they make life difficult.

## Testing

### Helper Contracts ###

In all cases where a contract _could_ bid, we made a test where it _did_ bid. This tests cases where malicious contracts try to consume too much gas. These contracts are found in the `test-helpers` folder.


### TxTester ###

We've created a pretty awesome testing framework. Have a look at js/tx-tester.

It allows you to quickly test nearly _all_ side effects of any transaction:

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