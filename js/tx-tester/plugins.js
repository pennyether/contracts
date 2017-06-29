const util = require("util");
const colors = require("colors/safe");

function createPlugins(testUtil, ledger) {
	if (!testUtil)
		throw new Error("createPlugins() expects a testUtil object.");
	if (!ledger)
		throw new Error("createPlugins() expects a ledger object.");
	
	const plugins = {
		doFn: function(fn) {
			const ctx = this;
			return fn.call(ctx);
		},

		///////////////////////////////////////////////////////////////////
		/// DO TX /////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////

		// Passed a function that returns a truffle-contract res object (or a promise of one)
		// Add to ctx:
		// 		.txRes - The returning result of execution
		//      .txErr - The error, if any, from execution
		//		.txPromise - A promise fulfilled/failed with execution results
		doTx: function(fn) {
			const ctx = this;
			const type = Object.prototype.toString.call(fn);
			if (type !== '[object Promise]' && typeof fn !== 'function')
				throw new Error(`'.doTx' must be passed a fn or promise, instead got: '${type}'`);

			// execute fn, store promise to ctx
			ctx.txPromise = Promise.resolve().then(fn).then(res => {
				if (res === undefined)
					throw new Error(`'.doTx' function returned undefined -- expected a result.`);
				return res;
			});

			// return the promise, so chain waits on us
			return ctx.txPromise.then(
				(res) => { ctx.txRes = res;  ctx.txErr = null; },
				(err) => { ctx.txRes = null; ctx.txErr = err; }
			);
		},
		// returns the result of `do`
		getTxResult: function() {
			const ctx = this;
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");
			return ctx.txRes;
		},
		getBlock: async function() {
			const ctx = this;
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");

			return await testUtil.getBlock(ctx.txRes.receipt.blockHash);
		},
		// assert .res and .res.receipt are set
		assertSuccess: function() {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");

			if (ctx.txErr) {
				var e = new Error(`doTx did not succeed, got this error: ${util.format(ctx.txErr)}`);
				e.stack = ctx.txErr.stack;
				throw e;
			}
			assert(!!ctx.txRes, `txResult was not truthy: ${util.format(ctx.txRes)}`);
			console.log("✓ doTx was successful");
		},
		// asserts the last `do` throw an error whose string contains 'invalid opcode'
		assertInvalidOpCode: function() {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.")
			if (!ctx.txErr)
				throw new Error(`Expected 'doTx' to fail, but got result: ${ctx.txRes}`);

			const errMsg = ctx.txErr.message;
			assert.include(errMsg, "invalid opcode", `Error does not contain 'invalid opcode': ${errMsg}`);
			console.log("✓ doTx failed with invalid opcode");
		},
		// assert there is one log, with name $eventName and optional $args from optional $address
		assertOnlyLog: async function(eventName, args, address) {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");
			if (!ctx.txRes)
				throw new Error("Expected 'doTx' to succeed.");

			testUtil.expectOneLog(ctx.txRes.logs, eventName, args, address);
			const keysStr = Object.keys(args || {}).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' was the only log`);
		},
		// assert there is a log named "Error" with an arg msg that is $msg from optional $address
		assertOnlyErrorLog: async function(msg, address) {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");
			if (!ctx.txRes)
				throw new Error("Expected 'doTx' to succeed.");

			testUtil.expectErrorLog(ctx.txRes.logs, msg, address);
			console.log(`✓ 'Error(msg: ${msg})' event was the only log`);
		},
		assertGasUsedLt: function(val) {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");
			if (!ctx.txRes)
				throw new Error("Expected 'doTx' to succeed.");

			const gasUsed = ctx.txRes.receipt.gasUsed;
			assert.isAtMost(gasUsed, val);
			console.log(`✓ less than ${val} gas used (${gasUsed})`);
		},
		assertGasUsedGt: function(val) {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");
			if (!ctx.txRes)
				throw new Error("Expected 'doTx' to succeed.");

			const gasUsed = ctx.txRes.receipt.gasUsed;
			assert.isAtLeast(gasUsed, val);
			console.log(`✓ more than ${val} gas used (${gasUsed})`);
		},
		printTxResult: function(){
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");

			console.log("printing tx results...");
			console.log(ctx.txRes);
		},
		// prints the logs of the last `do`, otherwise nothing
		printTxLogs: function() {
			const ctx = this;
			if (ctx.txRes===null && ctx.txErr===null)
				throw new Error("'doTx' was never called.");

			if (ctx.txRes) {
				console.log(".printTxLogs called:");
				console.log(ctx.txRes.logs);
			}
		},

		///////////////////////////////////////////////////////////////
		/////// CALL STUFF ////////////////////////////////////////////
		///////////////////////////////////////////////////////////////
		doCall: function(fn) {
			const ctx = this;
			const type = Object.prototype.toString.call(fn);
			if (type !== '[object Promise]' && typeof fn !== 'function')
				throw new Error(`'.doCall' must be passed a fn or promise, instead got: '${type}'`);

			// execute fn, store promise to ctx
			ctx.callPromise = Promise.resolve().then(fn);

			// return the promise, so chain waits on us
			return ctx.callPromise.then(
				(res) => { ctx.callRes = res;  ctx.callErr = null; },
				(err) => { ctx.callRes = null; ctx.callErr = err; }
			);
		},
		assertResultAsString: function(val) {
			const ctx = this;
			if (ctx.callRes===null && ctx.callErr===null)
				throw new Error("'doCall' was never called.");

			assert.strEqual(ctx.callRes, val, `Result of call expeted to be ${val}`);
			console.log(`✓ Call resulted in expected value: ${val}`);
		},


		///////////////////////////////////////////////////////////////
		/////// LEDGER STUFF //////////////////////////////////////////
		///////////////////////////////////////////////////////////////

		// This will add "ledger" onto the ctx object
		// It will stop tracking afterDone
		startLedger: function(addresses) {
			const ctx = this;
			return Promise.resolve().then(async function(){
				ledger.reset(addresses);
				ctx.ledger = ledger;
				await ledger.start();	
			});
		},
		stopLedger: async function() {
			const ctx = this;
			await ctx.ledger.stop();
		},
		// asserts a delta of $amt in the balance of $address
		assertDelta: function(address, amt, msg) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");

			msg = msg || `changed correctly`;
			msg = `balance of ${at(address)} ${msg}`;
			assert.strEqual(ctx.ledger.getDelta(address), amt, msg);
			console.log(`✓ ${msg}`);
		},
		assertNoDelta: function(address) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			plugins.assertDelta.call(ctx, address, 0, "did not change");
		},
		// asserts $address has a delta equal to the txFee of the last result
		assertLostTxFee: async function(address, msg) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");

			msg = msg || "lost txFee";
			const txFee = await testUtil.getTxFee(ctx.txRes.tx).mul(-1);
			plugins.assertDelta.call(ctx, address, txFee, msg);
		},
		// assert $address has a delta equal to $amt minus the txFee
		assertDeltaMinusTxFee: async function(address, amt, msg) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");

			msg = msg || "gained an amount but lost txFee";
			const expectedFee = await testUtil.getTxFee(ctx.txRes.tx).mul(-1).plus(amt);
			plugins.assertDelta.call(ctx, address, expectedFee, msg);
		},



		////////////////////////////////////////////////////////////////////
		/////// EVENTS STUFF ///////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////

		// This will add:
		// 		- ctx.contractWatchers = {address: watcher}
		startWatching: function(contracts) {
			const ctx = this;
			
			// validate that each item is a contract
			contracts.forEach((c, i) => {
				if (!c || !c.allEvents) {
					const e = new Error(`${i}th value is not a contract (check .val): ${c}`);
					e.val = c;
					throw e;
				}
			});

			if (!ctx.contractWatchers) ctx.contractWatchers = {};
			const nextBlock = testUtil.getBlockNumber() + 1;
			contracts.forEach(c => {
				ctx.contractWatchers[c.address] = c.allEvents({fromBlock: nextBlock});
			});
			ctx.afterDone(async () => {
				if (!ctx.contractWatchers) return;
				console.log("calling .stopWatching");
				await plugins.stopWatching.call(ctx);
				console.log(`WARNING: .startWatching() was called, but .stopWatching() wasn't.`);
			});
		},
		// This will add:
		//		- ctx.contractEvents = {address: logs}
		// And remove:
		//		- ctx.contractWatchers
		stopWatching: function() {
			const ctx = this;
			if (!ctx.contractWatchers)
				throw new Error("Cannot stopWatching -- you never started watching any contracts.");

			ctx.contractEvents = {};
			const promises = Object.keys(ctx.contractWatchers).map(address => {
				return new Promise((res, rej) => {
					ctx.contractWatchers[address].get((error, events) => {
						ctx.contractEvents[address] = events;
						res();
					})
				});
			});
			return Promise.all(promises).then(()=>{ delete ctx.contractWatchers; });
		},
		assertOnlyEvent: async function(address, eventName, args) {
			if (address.address) address = address.address;
			if (!args) args = {};

			const ctx = this;
			if (!ctx.contractEvents)
				throw new Error("'startWatching' and 'stopWatching' weren't called.");
			if (!ctx.contractEvents[address])
				throw new Error(`'startWatching' was never called for ${at(address)}.`);

			testUtil.expectOneLog(ctx.contractEvents[address], eventName, args, address);
			const keysStr = Object.keys(args).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' was the only event for ${at(address)}`);
		},
		assertEvent: async function(address, eventName, args) {
			if (address.address) address = address.address;
			if (!args) args = {};

			const ctx = this;
			if (!ctx.contractEvents)
				throw new Error("'startWatching' and 'stopWatching' weren't called.");
			if (!ctx.contractEvents[address])
				throw new Error(`'startWatching' was never called for ${at(address)}.`);

			testUtil.expectLog(ctx.contractEvents[address], eventName, args);
			const keysStr = Object.keys(args).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' event was found for ${at(address)}`);
		},
		printEvents: function() {
			const ctx = this;
			if (!ctx.contractEvents)
				throw new Error("'startWatching' and 'stopWatching' weren't called.");

			var hadEvent = false;
			Object.keys(ctx.contractEvents || {}).forEach(address => {
				ctx.contractEvents[address].forEach((log, i) => {
					hadEvent = true;
					console.log(`Event #${i+1} for ${at(address)}:`, log);
				});
			});
			if (!hadEvent) { console.log('No events found.'); }
		},


		
		///////////////////////////////////////////////////////////////////////
		//////////////// MISC UTILS ///////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////

		// assert $contract[$name]() returns $expectedValue
		assertStateAsString: async function(contract, name, expectedValue, msg) {
			// todo: check that its a constant
			msg = msg || `should equal '${at(expectedValue)}'`;
			msg = `${at(contract)}.${name}() ${msg}`;
			assert.strEqual(await contract[name](), expectedValue, msg);
			console.log(`✓ ${msg}`);
		},
		assertStateCloseTo: async function(contract, name, expectedValue, tolerance, msg) {
			const val = await contract[name]();
			if (!val || !val.toNumber())
				throw new Error(`assertStateCloseTo expects call to return a BigNumber.`);

			msg = msg || "is close to some number";
			msg = `${at(contract)}.${name}() ${msg}`;
			if (expectedValue.toNumber) expectedValue = expectedValue.toNumber();
			assert.closeTo(val.toNumber(), expectedValue, tolerance, msg);
			console.log(`✓ ${msg}`);
		},
		assertCloseTo: function(val1, val2, tolerance, msg) {
			val1 = val1.toNumber ? val1.toNumber() : val1;
			val2 = val2.toNumber ? val2.toNumber() : val2;
			msg = msg || `two values should be within ${tolerance}`;
			assert.closeTo(val1, val2, tolerance, msg);
			console.log(`✓ ${msg}`);	
		},
		// assert balance of $address (can be a contract) is $expectedBalance
		assertBalance: async function(address, expectedBalance, msg) {
			const balance = await testUtil.getBalance(address);
			msg = msg || `should equal ${expectedBalance}`;
			msg = `Balance of ${at(address)} ${msg}`;
			assert.strEqual(balance, expectedBalance, msg);
			console.log(`✓ ${msg}`);
		},
		assertBalanceLessThan: async function(address, num, msg) {
			const balance = await testUtil.getBalance(address);
			msg = msg || `should be less than some value`;
			msg = `Balance of ${at(address)} ${msg}`;
			assert(balance.lt(num), msg);
			console.log(`✓ ${msg}`);	
		},
		// print the balance of an address (or contract)
		printBalance: async function(address) {
			const balance = await testUtil.getBalance(address);
			console.log(`Balance of ${at(address)} is: ${balance}`);
		},
		ret: function(v){ return v; },
		wait: function(time, msg){
			if (msg) { console.log(msg); }
			return new Promise((res,rej)=>{ setTimeout(res, time); })
		},
		print: function(){ console.log.apply(console, arguments); },
		pass: async function(){},
		fail: async function(){ throw new Error("Failure"); },
		
		testUtil: testUtil,
		nameAddresses: nameAddresses
		////////////////////////////////////////////////////
	};
	return plugins;
}

var addrToName = {};
function nameAddresses(obj, reset) {
	if (reset === undefined || !!reset) addrToName = {};
	Object.keys(obj).forEach((name) => {
		var val = obj[name];
		var type = Object.prototype.toString.call(val);
		if (type === "[object String]") {
			if (val.length != 42) throw new Error(`Address '${k}' should have 42 chars: '${val}'`);
			addrToName[val] = name;
		} else if (type === "[object Array]") {
			val.forEach(function(addr, i){
				addrToName[addr] = `${name}[${i}]`;
			})
		} else if (val.constructor.name == "TruffleContract") {
			addrToName[val.address] = name;
		} else {
			throw new Error(`Unsupported address type of '${name}': '${type}'`);
		}
	});
}
function at(val) {
	if (typeof val == "string" && val.length == 42){
		var shortened = val.substr(0, 6) + "...";
		return addrToName[val]
			? colors.underline(`${addrToName[val]}`)
			: shortened;
	}
	if (val.constructor.name == "TruffleContract") {
		var shortened = val.address.substr(0, 6) + "...";
		return addrToName[val.address]
			? colors.underline(`${addrToName[val.address]}`)
			: `${val.constructor._json.contract_name}[${shortened}]`;
	}
	return `${val}`;
}

module.exports = createPlugins;

