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
			return fn.call(null, ctx);
		},

		///////////////////////////////////////////////////////////////////
		/// DO TX /////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////

		// Passed a function that returns a truffle-contract res object (or a promise of one)
		// Can also be passed [contract, strFn, params]
		// Add to ctx:
		// 		.txRes - The returning result of execution (or undefined)
		//      .txErr - The error, if any, from execution (or undefined)
		//		.txPromise - Promise of the tx
		//		.txName - A name of the TX
		doTx: function(fnOrPromise) {
			const ctx = this;
			var contract;
			if (Array.isArray(fnOrPromise)) {
				contract = fnOrPromise[0];
				const name = fnOrPromise[1];
				const args = fnOrPromise.slice(2);
				const argsStr = args ? str(args, true) : "";
				fnOrPromise = () => contract[name].apply(contract, args);
				ctx.txName = `doTx: ${str(contract)}.${name}(${argsStr})`;
			} else {
				ctx.txName = `${fnOrPromise.toString()}`;
			}
			ctx.txPromise = testUtil.toPromise(fnOrPromise)
				.then(res => {
					if (res === undefined)
						throw new Error(`'.doTx' function returned undefined -- expected a result.`);
					return res;
				}).then(
					(res) => {
						ctx.txRes = res; ctx.txErr = undefined;
						// fix web3 bug where it returns events of non-to addresses
						if (contract)
							ctx.txRes.logs = ctx.txRes.logs.filter((l) => l.address == contract.address)
					},
					(err) => { ctx.txRes = undefined; ctx.txErr = err; }
				);
			return ctx.txPromise;
		},
		doNewTx: function(fnOrPromise) {
			// converts .new() to what a normal call would be (a result with logs and stuff)
			const ctx = this;
			const p = testUtil.toPromise(fnOrPromise)
            	.then(testUtil.getTruffleResultFromNew)
            return plugins.doTx.call(ctx, p);
		},
		// returns the result of `do`
		getTxResult: function() {
			const ctx = this;
			if (ctx.txRes===undefined) throw new Error("'doTx' was never called, or failed");
			return ctx.txRes;
		},
		getBlock: async function() {
			const ctx = this;
			if (ctx.txRes===undefined) throw new Error("'doTx' was never called, or failed");
			return await testUtil.getBlock(ctx.txRes.receipt.blockHash);
		},
		// assert .res and .res.receipt are set
		assertSuccess: function(name) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");

			if (ctx.txErr) {
				var e = new Error(`doTx did not succeed, got this error: ${util.format(ctx.txErr)}`);
				e.stack = ctx.txErr.stack;
				throw e;
			}
			const gasUsed = ctx.txRes.receipt.gasUsed;
			const blockNum = ctx.txRes.receipt.blockNumber;
			const meta = `(block ${blockNum}, ${gasUsed} gas used)`;
			name = name ? `doTx: '${name}'` : ctx.txName;
			assert(!!ctx.txRes, `txResult was not truthy: ${util.format(ctx.txRes)}`);
			console.log(`✓ ${name} was successful ${meta}`);
		},
		// asserts the last `do` throw an error whose string contains 'invalid opcode'
		assertInvalidOpCode: function() {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.")
			if (!ctx.txErr) {
				console.log("Result:", ctx.txRes);
				throw new Error(`Expected 'doTx' to fail, but got result above.`);
			}

			const errMsg = ctx.txErr.message;
			assert.include(errMsg, "revert", `Error does not contain 'revert': ${errMsg}`);
			console.log("✓ doTx failed with invalid opcode");
		},
		// asserts exact number of logs retrieved
		assertLogCount: async function(num) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");
			
			await testUtil.expectLogCount(ctx.txRes.logs, num);
			console.log(`✓ exactly ${num} logs found`);
		},
		// assert there is a log with $eventName and optional $args
		assertLog: async function(eventName, args) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");

			await testUtil.expectLog(ctx.txRes.logs, eventName, args);
			const keysStr = Object.keys(args || {}).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' log was found`);
		},
		// assert there is one log, with name $eventName and optional $args
		assertOnlyLog: async function(eventName, args, address) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");

			await testUtil.expectOneLog(ctx.txRes.logs, eventName, args);
			const keysStr = Object.keys(args || {}).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' log was the only log`);
		},
		// assert there is a log named "Error" with an arg msg that is $msg
		assertOnlyErrorLog: async function(msg) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");

			await testUtil.expectOnlyErrorLog(ctx.txRes.logs, msg);
			console.log(`✓ 'Error(msg: ${msg})' event was the only log`);
		},
		assertGasUsedLt: function(val) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");

			const gasUsed = ctx.txRes.receipt.gasUsed;
			assert.isAtMost(gasUsed, val);
			console.log(`✓ less than ${val} gas used (${gasUsed})`);
		},
		assertGasUsedGt: function(val) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");

			const gasUsed = ctx.txRes.receipt.gasUsed;
			assert.isAtLeast(gasUsed, val);
			console.log(`✓ more than ${val} gas used (${gasUsed})`);
		},
		printTxResult: function(){
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");

			console.log("printing tx results...");
			console.log(ctx.txRes, ctx.txErr);
		},
		// prints the logs of the last `do`, otherwise nothing
		printLogs: function() {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");

			if (ctx.txRes) {
				const util = require("util");
				console.log("printing tx logs...");
				console.log(util.inspect(ctx.txRes.logs, false, null))
			} else {
				console.log("no logs to print");
			}
		},

		///////////////////////////////////////////////////////////////
		/////// CALL STUFF ////////////////////////////////////////////
		///////////////////////////////////////////////////////////////
		doCall: function(fnOrPromise) {
			ctx.callPromise = testUtil.toPromise(fnOrPromise)

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
		assertDelta: async function(address, amt, msg) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			amt = await testUtil.toPromise(amt);

			msg = msg || `changed correctly`;
			msg = `balance of ${at(address)} ${msg}`;
			assert.strEqual(ctx.ledger.getDelta(address), amt, msg);
			console.log(`✓ ${msg}`);
		},
		assertNoDelta: function(address) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			return plugins.assertDelta.call(ctx, address, 0, "did not change");
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
			return plugins.assertDelta.call(ctx, address, txFee, msg);
		},
		// assert $address has a delta equal to $amt minus the txFee
		assertDeltaMinusTxFee: async function(address, amt, msg) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");
			amt = await testUtil.toPromise(amt);

			msg = msg || "gained an amount but lost txFee";
			const expectedFee = await testUtil.getTxFee(ctx.txRes.tx).mul(-1).plus(amt);
			return plugins.assertDelta.call(ctx, address, expectedFee, msg);
		},
		printDelta: function(address){
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");

			const amt = ctx.ledger.getDelta(address).div(1e18);
			console.log(`Balance of ${at(address)} changed by: ${amt} ETH`);
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
		assertEventCount: async function(address, num) {
			if (address.address) address = address.address;
			
			const ctx = this;
			if (!ctx.contractEvents)
				throw new Error("'startWatching' and 'stopWatching' weren't called.");
			if (!ctx.contractEvents[address])
				throw new Error(`'startWatching' was never called for ${at(address)}.`);

			await testUtil.expectLogCount(ctx.contractEvents[address], num,
				`${at(address)} expected to have ${num} events`);
			console.log(`✓ ${num} events from ${at(address)}`)			
		},
		assertEvent: async function(address, eventName, args) {
			if (address.address) address = address.address;
			if (!args) args = {};

			const ctx = this;
			if (!ctx.contractEvents)
				throw new Error("'startWatching' and 'stopWatching' weren't called.");
			if (!ctx.contractEvents[address])
				throw new Error(`'startWatching' was never called for ${at(address)}.`);

			await testUtil.expectLog(ctx.contractEvents[address], eventName, args);
			const keysStr = Object.keys(args).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' event was found from ${at(address)}`);
		},
		assertOnlyEvent: async function(address, eventName, args) {
			if (address.address) address = address.address;
			if (!args) args = {};

			const ctx = this;
			if (!ctx.contractEvents)
				throw new Error("'startWatching' and 'stopWatching' weren't called.");
			if (!ctx.contractEvents[address])
				throw new Error(`'startWatching' was never called for ${at(address)}.`);

			await testUtil.expectOneLog(ctx.contractEvents[address], eventName, args, address);
			const keysStr = Object.keys(args).join(", ");
			console.log(`✓ '${eventName}(${keysStr})' was the only event from ${at(address)}`);
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
		// does callParams[0].callParams[1].call(...callParams)
		// and expects [expected] -- if array compares each value.
		assertCallReturns: async function(callParams, expected, msg) {
			callParams = await testUtil.toPromise(callParams);
			expected = await testUtil.toPromise(expected);
			const contract = callParams[0];
			const name = callParams[1];
			const args = callParams.slice(2);
			const argsStr = args ? str(args, true) : "";
			const expectedStr = str(expected);
			msg = msg || `should equal ${expectedStr}`;
			msg = `${str(contract)}.${name}.call(${argsStr}) ${msg}`;
			var result;
			try {
				result = await contract[name].call.apply(contract, args);
			} catch (e) {
				throw new Error(`Call Threw: ${msg} -- ${e}`);
			}

			if (Array.isArray(expected)){
				const resultStr = str(result);
				try {
					if (!Array.isArray(result) || result.length !== result.length)
						throw new Error("Expected an array, but did not get one.");
					expected.forEach((e, i) => {
						if (e === null || e === undefined) return;
						if (e.hasOwnProperty("not")){ assert.strNotEqual(result[i], e.not, msg); }
						else { assert.strEqual(result[i], e, msg); }
					});
					console.log(`✓ ${msg}`);
				} catch (e) {
					throw new Error(`${msg}, but got back '${resultStr}'`);
				}
			} else {
				if (expected.hasOwnProperty("not"))
					assert.strNotEqual(result, expected, msg);
				else
					assert.strEqual(result, expected, msg);
				console.log(`✓ ${msg}`);
			}
		},
		assertCallThrows: async function(callParams) {
			const contract = callParams[0];
			const name = callParams[1];
			const args = callParams.slice(2);
			const argsStr = args ? str(args, true) : "";
			msg = `${str(contract)}.${name}.call(${argsStr}) should throw`;
			var result;
			try {
				result = await contract[name].call.apply(contract, args);
				const resultStr = str(result);
				throw new Error(`${msg} -- got result: ${resultStr}`)
			} catch (e) {
				console.log(`✓ ${msg}`);
			}
		},
		// assert $contract[$name]() returns $expectedValue
		assertStateAsString: async function(contract, name, expectedValue, msg) {
			msg = msg || `should equal '${str(expectedValue)}'`;
			msg = `${at(contract)}.${name}() ${msg}`;
			if (!contract[name])
				throw new Error(`'${name}' is not a callable property of the contract.`);
			assert.strEqual(await contract[name](), expectedValue, msg);
			console.log(`✓ ${msg}`);
		},
		// waits for fnOrPromise, then ensures it equals expectedValue
		assertAsString: async function(fnOrPromise, expectedValue, msg) {
			fnOrPromise = testUtil.toPromise(fnOrPromise);
			expectedValue = testUtil.toPromise(expectedValue);
			msg = msg || `should equal '${str(expectedValue)}'`;
			assert.strEqual(await fnOrPromise, await expectedValue, msg);
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
		assertEquals: async function(val1, val2, msg) {
			val1 = await testUtil.toPromise(val1);
			val2 = await testUtil.toPromise(val2);
			msg = msg || `${val1} equals ${val2}`;
			assert.strEqual(val1, val2, msg);
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


		// other stuff
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
	console.log("Named addresses", obj);
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
	if (typeof val == "string"){
		return `"${val}"`;
	}
	return `${val}`;
}
function str(val, hideBrackets) {
	if (val === undefined) {
		return "undefined";
	} else if (val === null) {
		return "null";
	} else if (Array.isArray(val)) {
		const lBracket = hideBrackets ? "" : "[";
		const rBracket = hideBrackets ? "" : "]";
		return `${lBracket}${val.map(v => str(v, true)).join(", ")}${rBracket}`;
	} else if (typeof val == "string" || val.constructor.name == "TruffleContract") {
		return at(val);
	} else if (val.constructor.name == "BigNumber") {
		return val.toString();
	} else if (typeof val == "object") {
		const keys = Object.keys(val).map((k) => `${k}: ${str(val[k])}`);
		const extra = keys.length - 3;
		const ellipsis = extra > 0 ? `, +${extra}...` : "";
		return `{${keys.join(", ") + ellipsis}}`;
	} else {
		return val.toString();
	}
}

module.exports = createPlugins;

