const util = require("util");
const chalk = require("chalk");
const BigNumber = require("bignumber.js");

function createPlugins(testUtil, ledger) {
	if (!testUtil)
		throw new Error("createPlugins() expects a testUtil object.");
	if (!ledger)
		throw new Error("createPlugins() expects a ledger object.");
	
	const plugins = {
		silence: function(doSilence){
			if (doSilence===undefined) doSilence = true;

			const ctx = this;
			const unsilence = () => {
				if (!ctx._consoleLog) return;
				console.log = ctx._consoleLog;
				delete ctx._consoleLog;
			}
			const silence = () => {
				if (ctx._consoleLog) return;
				ctx._consoleLog = console.log;
				console.log = ()=>{};
				ctx.afterDone(unsilence);
			}
			doSilence ? silence() : unsilence();
		},
		
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
		doTx: function(fnOrPromiseOrArray, name) {
			const ctx = this;
			// delete traces of previous transaction, if any.
			delete ctx.txRes;
			delete ctx.txErr;
			delete ctx.txPromise;
			delete ctx.txName;

			// create the txName, and if passed array, the promise.
			var contract;
			if (Array.isArray(fnOrPromiseOrArray)) {
				contract = fnOrPromiseOrArray[0];
				const fnName = fnOrPromiseOrArray[1];
				const args = fnOrPromiseOrArray.slice(2);
				const argsStr = args ? str(args, true) : "";
				fnOrPromiseOrArray = () => contract[fnName].apply(contract, args);
				ctx.txName = name
					? `tx: ${name}`
					: `tx: ${str(contract)}.${fnName}(${argsStr})`;
				if (!contract[fnName] || !contract[fnName].apply)
					throw new Error(`"${fnName}"" is not a method of ${str(contract)}`);
			} else {
				ctx.txName = name || `${fnOrPromiseOrArray.toString()}`;
			}
			// execute the transaction, and modify ctx.tx* on completion.
			ctx.txPromise = testUtil.toPromise(fnOrPromiseOrArray)
				.then(res => {
					if (res === undefined)
						throw new Error(`'.doTx' function returned undefined -- expected a result.`);
					if (!res.receipt)
						throw new Error('No receipt found.');
					if ((new BigNumber(res.receipt.status)).equals(0))
						throw new Error("receipt.status===0");
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
		doNewTx: function(contract, args, opts) {
			const ctx = this;
			// converts .new() to what a normal call would be (a result with logs and stuff)
			var name;
			const p = testUtil.toPromise(()=>{
				const contractName = contract.contract_name;
				const argsStr = args ? str(args, true) : "";
				const optsStr = opts ? str(opts, true) : "";
				name = `newTx: ${contractName}.new(${argsStr}, ${optsStr})`;
				return contract["new"].apply(contract, args.concat(opts));
			}).then(testUtil.getTruffleResultFromNew);
			// pass promise to regular doTx call, with the name
            return plugins.doTx.call(ctx, p, name);
		},
		withTxResult: function(fn) {
			const ctx = this;
			if (ctx.txRes===undefined) throw new Error("'doTx' was never called, or failed");
			return fn.call(null, ctx.txRes, plugins);
		},
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
				console.log("txRes", ctx.txRes, "txErr", ctx.txErr);
				var e = new Error(`${ctx.txName}, got this error: ${util.format(ctx.txErr)}`);
				e.stack = ctx.txErr.stack;
				throw e;
			}
			const gasUsed = ctx.txRes.receipt.gasUsed;
			const blockNum = ctx.txRes.receipt.blockNumber;
			const meta = `(block ${blockNum}, ${gasUsed} gas used)`;
			assert(!!ctx.txRes, `txResult was not truthy: ${util.format(ctx.txRes)}`);
			console.log(`✓ ${ctx.txName} was successful ${meta}`);
		},
		// asserts the last `do` throw an error whose string contains 'invalid opcode'
		assertInvalidOpCode: function() {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.")
			if (!ctx.txErr) {
				console.log("Result:", util.inspect(ctx.txRes, false, null));
				throw new Error(`Expected ${ctx.txName} to fail, but got result above.`);
			}

			//const errMsg = ctx.txErr.message;
			//assert.include(errMsg, "revert", `Error does not contain 'revert': ${errMsg}`);
			console.log(`✓ ${ctx.txName} failed`);
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
			const msg = `less than ${val} gas used (${gasUsed})`;
			assert(new BigNumber(gasUsed).lt(val), msg);
			console.log(`✓ ${msg}`);
		},
		assertGasUsedGt: function(val) {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");
			if (!ctx.txRes) throw new Error("Expected 'doTx' to succeed.");


			const gasUsed = ctx.txRes.receipt.gasUsed;
			const msg = `more than ${val} gas used (${gasUsed})`;
			assert(new BigNumber(gasUsed).gt(val), msg);
			console.log(`✓ ${msg}`);
		},
		printTxResult: function(){
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");

			console.log(`Printing results of ${ctx.txName}...`);
			console.log("txRes:", util.inspect(ctx.txRes, false, null))
			console.log("txErr:", ctx.txErr);
		},
		// prints the logs of the last `do`, otherwise nothing
		printLogs: function() {
			const ctx = this;
			if (ctx.txName===undefined) throw new Error("'doTx' was never called.");

			if (ctx.txRes) {
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

			msg = msg || `changed by ${wei(amt)}.`;
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

			const txFee = await testUtil.getTxFee(ctx.txRes.tx).mul(-1);
			msg = msg || `lost txFee (${wei(txFee)})`;
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

			const txFee = await testUtil.getTxFee(ctx.txRes.tx)
			const expectedDelta = txFee.mul(-1).plus(amt);
			msg = msg || `gained ${wei(amt)} but lost txFee (${wei(txFee)})`;
			return plugins.assertDelta.call(ctx, address, expectedDelta, msg);
		},
		printDelta: function(address){
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");
			if (ctx.txRes===null)
				throw new Error("'doTx' was never called, or failed");

			const amt = ctx.ledger.getDelta(address);
			console.log(`Balance of ${at(address)} changed by: ${wei(amt)}`);
		},


		////////////////////////////////////////////////////////////////////
		/////// EVENTS STUFF ///////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////

		// This will add:
		// 		- ctx.contractWatchers = {address: watcher}
		startWatching: function(contracts) {
			const ctx = this;
			
			// validate that each item is a contract
			if (!Array.isArray(contracts))
				throw new Error("Should be passed an array.");
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
			fnStr = `${str(contract)}.${name}.call(${argsStr})`;
			if (!contract[name] || !contract[name].call)
				throw new Error(`"${name}"" is not a method of ${str(contract)}`);

			var result;
			try {
				result = await contract[name].call.apply(contract, args);
			} catch (e) {
				throw new Error(`Call Threw: ${fnStr} -- ${e}`);
			}

			const resultStr = str(result);
			const expectedStr = str(expected);
			try {
				assertValues(result, expected);
			} catch(e) {
				throw new Error(
					`${fnStr} returned unexpected result.` + 
					`\n   Error: ${e.message}` +
					`\n   Result: ${resultStr}` +
					`\n   Expected: ${expectedStr}`
				);	
			}
			msg = msg ? msg : `returns ${expectedStr}`;
			console.log(`✓ ${fnStr} ${msg}`);

			function assertValues(res, exp) {
				const asserters = {
					within1: function(r, e) {
						try { r = new BigNumber(r); }
						catch (err){ throw new Error(`Not a valid number: ${r}`); }
						try { e = new BigNumber(e); }
						catch (err){ throw new Error(`Not a valid number: ${e}`); }
						const msg = `Expected ${e.toString()} but got ${r.toString()}.`;
						assert(r.minus(e).abs().toNumber() <= 1, msg);
					},
					not: function(r, e) {
						assert.strNotEqual(r, e);
					},
					custom: function(r, e) {
						assert(e(r));
					}
				};
				// Return if we expect null or undefined.
				if (exp == null || exp == undefined) return;

				// If array, recursively assert each value.
				if (Array.isArray(exp)) {
					if (!Array.isArray(res))
						throw new Error(`Expected an array ${exp}, but got: ${res}`);
					if (res.length !== exp.length)
						throw new Error(`Length of result array does not match length of expected.`);
					exp.forEach((e, i) => {
						if (e === null || e === undefined) return;
						assertValues(res[i], e);
					});
					return;
				}

				// use asserter, or just do a string compare.
				const isAsserter = typeof exp==="object" && exp.constructor.name!=="BigNumber";
				if (isAsserter) {
					if (Object.keys(exp).length > 1)
						throw new Error(`Asserter should only have one key: ${str(exp)}`);
					const asserterKey = Object.keys(exp)[0];
					const asserter = asserters[asserterKey];
					if (!asserter)
						throw new Error(`Invalid customer asserter key "${asserterKey}" in: ${str(exp)}`);
					asserter(res, exp[asserterKey]);
					return;
				}

				// just do strEqual
				assert.strEqual(res, exp);
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
			address = await testUtil.toPromise(address);
			expectedBalance = await testUtil.toPromise(expectedBalance);
			const balance = await testUtil.getBalance(address);
			msg = msg || `should equal ${wei(expectedBalance)}`;
			msg = `Balance of ${at(address)} ${msg}`;
			assert.strEqual(balance, expectedBalance, msg);
			console.log(`✓ ${msg}`);
		},
		// print the balance of an address (or contract)
		printBalance: async function(address) {
			const balance = await testUtil.getBalance(address);
			console.log(`Balance of ${at(address)} is: ${balance}`);
		},
		mineBlocks: async function(numBlocks) {
			await testUtil.mineBlocks(numBlocks);
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
		nameAddresses: nameAddresses,
		addAddresses: (addrs)=>{ nameAddresses(addrs, false); },
		printNamedAddresses: ()=>{
			console.log("Named Addresses:");
			const maxLen = Math.max.apply(null, Object.values(addrToName).map(x=>x.length));
			Object.entries(addrToName).sort((a,b)=>{
				return a[1].toLowerCase() < b[1].toLowerCase() ? -1 : 1;
			}).forEach((entry)=>{
				const paddingLen = (maxLen - entry[1].length);
				const paddingStr = (new Array(paddingLen+1)).join(' ');
				console.log(`  ${entry[1]}:${paddingStr} ${entry[0]}`);
			})
		}
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
		} else if (type == "[object Undefined]") {
			throw new Error(`${name} is undefined.`);
		} else if (val.constructor.name == "TruffleContract") {
			addrToName[val.address] = name;
		} else {
			throw new Error(`Unsupported address type of '${name}': '${type}'`);
		}
	});
}
function at(val) {
	if (typeof val == "string" && val.length == 42) {
		var shortened = val.substr(0, 6) + "...";
		return addrToName[val]
			? chalk.underline(`${addrToName[val]}`)
			: chalk.underline(shortened);
	}
	if (typeof val == "string" && val.length == 66) {
		try {
			return `bytes32("${web3.toUtf8(val)}")`;
		} catch (e) {
			return `bytes32(${val.slice(0,19)}...)`;
		}
	}
	if (val.constructor.name == "TruffleContract") {
		var shortened = val.address.substr(0, 6) + "...";
		return addrToName[val.address]
			? chalk.underline(`${addrToName[val.address]}`)
			: `${val.constructor.contract_name}[${shortened}]`;
	}
	if (typeof val == "string"){
		if (val.length > 19) return `"${val.slice(0,19)}..."`;
		else return `"${val}"`;
	}
	return `${val}`;
}
function str(val, hideBrackets) {
	if (val === undefined) {
		return "<undefined>";
	} else if (val === null) {
		return "<null>";
	} else if (Array.isArray(val)) {
		const lBracket = hideBrackets ? "" : "[";
		const rBracket = hideBrackets ? "" : "]";
		return `${lBracket}${val.map(v => str(v)).join(", ")}${rBracket}`;
	} else if (typeof val == "string" || val.constructor.name == "TruffleContract") {
		return at(val);
	} else if (val.constructor.name == "BigNumber" || typeof val == 'number') {
		val = new BigNumber(val);
		if (val.abs().gt(1e20)) return `0x${val.toString(16).slice(0, 8)}...`;
		if (val.abs().gte(1e6)) return wei(val);
		else return val.toString();
	} else if (typeof val == "object") {
		const keys = Object.keys(val).map((k) => {
			if (k=="value") return `${k}: ${wei(val[k])}`;
			return `${k}: ${str(val[k])}`
		});
		const extra = keys.length - 3;
		const ellipsis = extra > 0 ? `, +${extra}...` : "";
		return `{${keys.join(", ") + ellipsis}}`;
	} else {
		const str = val.toString();
		if (str.length > 20) return `${str.slice(0,19)}...`;
		else return str;
	}
}
function wei(val) {
	val = new BigNumber(val);
	if (val.abs().gte(1e15)) {
		return val.div(1e18).toString() + " ETH";
	}
	if (val.abs().gte(1e6)) {
		return val.div(1e9).toString() + " GWei";
	}
	return val.toString() + " Wei";
}

module.exports = createPlugins;

