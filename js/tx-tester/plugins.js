const util = require("util");
const colors = require("colors/safe");

function createPlugins(testUtil, ledger) {
	if (!testUtil)
		throw new Error("createPlugins() expects a testUtil object.");
	if (!ledger)
		throw new Error("createPlugins() expects a ledger object.");
	
	const plugins = {
		///////////////////////////////////////////////////////////////////
		/// DO! ///////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////

		// Passed a function that returns a truffle-contract res object (or a promise of one)
		// Add to ctx:
		// 		.res - The returning result of execution
		//      .err - The error, if any, from execution
		//		.resultPromise - A promise fulfilled/failed with execution results
		doTx: function(fn) {
			const ctx = this;
			const type = Object.prototype.toString.call(fn);
			if (type !== '[object Promise]' && typeof fn !== 'function')
				throw new Error(`'.do' must be passed a fn or promise, instead got: '${type}'`);

			// execute fn, store promise to ctx
			ctx.resultPromise = Promise.resolve().then(fn);

			// return the promise, so chain waits on us
			return ctx.resultPromise.then(
				(res) => { ctx.res = res;  ctx.err = null; },
				(err) => { ctx.res = null; ctx.err = err; }
			);
		},
		// returns the result of `do`
		getTx: function() {
			const ctx = this;
			return ctx.resultPromise;
		},
		// assert .res and .res.receipt are set
		assertSuccess: function() {
			const ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");

			if (ctx.err) {
				var e = new Error(`tx did not succeed, got this error: ${util.format(ctx.err)}`);
				e.stack = ctx.err.stack;
				throw e;
			}
			assert(!!ctx.res, `result was not truthy: ${util.format(ctx.res)}`);
			console.log("✓ doTx was successful");
		},
		// asserts the last `do` throw an error whose string contains 'invalid opcode'
		assertInvalidOpCode: function() {
			const ctx = this;
			if (!ctx.err && !ctx.res)
				throw new Error("'doTx' was never called.")
			if (!ctx.err)
				throw new Error("Expected call to fail.");

			assert.include(ctx.err.message, "invalid opcode", "Error does not contain 'invalid opcode'");
			console.log("✓ doTx failed with invalid opcode");
		},
		// assert there is one log, with name $eventName and optional $args from optional $address
		assertOneLog: async function(eventName, args, address) {
			const ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");

			testUtil.expectOneLog(ctx.res, eventName, args, address);
			console.log(`✓ '${eventName}' event occurred correctly`);
		},
		// assert there is a log named "Error" with an arg msg that is $msg from optional $address
		assertErrorLog: async function(msg, address) {
			const ctx = this;
			testUtil.expectErrorLog(ctx.res, msg, address);
			console.log(`✓ 'Error' event occurred correctly`);
		},
		printTxResult: function(){
			const ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");
			console.log("printing tx results...");
			console.log(ctx.res);
		},
		// prints the logs of the last `do`, otherwise nothing
		printTxLogs: function() {
			const ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");

			if (ctx.res) {
				console.log("printing logs");
				console.log(ctx.res.logs);
			}
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
		assertDelta: function(address, amt) {
			const ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .startLedger()");

			assert.strEqual(ctx.ledger.getDelta(address), amt, "balance did not change by exact amount");
			console.log(`✓ ${at(address)} balance changed correctly`);
		},
		// asserts $address has a delta equal to the txFee of the last result
		assertLostTxFee: async function(address) {
			const ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'do' was never called.");

			const txFee = await testUtil.getTxFee(ctx.res.tx).mul(-1);
			plugins.assertDelta.bind(ctx)
				(address, txFee, "address did not lose exactly the txFee");
			console.log(`✓ ${at(address)} lost txFee`);
		},
		// assert $address has a delta equal to $amt minus the txFee
		assertDeltaMinusTxFee: async function(address, amt) {
			const ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'do' was never called.");

			const expectedFee = await testUtil.getTxFee(ctx.res.tx).mul(-1).plus(amt);
			plugins.assertDelta.bind(ctx)
				(address, expectedFee, "address did not gain a specific amount (minus txFee)");
			console.log(`✓ ${at(address)} gain correct amount (minus txFee)`);
		},



		////////////////////////////////////////////////////////////////////
		/////// EVENTS STUFF ///////////////////////////////////////////////
		////////////////////////////////////////////////////////////////////

		// This will add:
		//		- ctx.contractEvents[address]
		// 		- ctx.contractWatchers[address]
		//
		// AfterDone, it will stop all the watchers.
		//
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
			if (!ctx.contractEvents) ctx.contractEvents = {};
			contracts.forEach(c => {
				ctx.contractEvents[c.address] = [];
				const watcher = c.allEvents(function(err, log){
					if (!err) ctx.contractEvents[c.address].push(log);
				});
				ctx.contractWatchers[c.address] = watcher;
			});
			ctx.afterDone(async () => {
				if (ctx.contractWatchers)
					await plugins.stopWatching.bind(ctx)();
			})
		},
		stopWatching: async function() {
			const ctx = this;
			if (!ctx.contractWatchers)
				throw new Error("Cannot stopWatching -- you never started watching any contracts.");

			const addresses = Object.keys(ctx.contractWatchers);
			while (addresses.length) {
				const address = addresses.shift();
				const watcher = ctx.contractWatchers[address];
				await watcher.stopWatching();
			}
			delete ctx.contractWatchers;
		},
		printEvents: function() {
			const ctx = this;
			Object.keys(ctx.contractEvents || {}).forEach(address => {
				console.log(`Logs for ${at(address)}: `, ctx.contractEvents[addr]);
			});
		},


		
		///////////////////////////////////////////////////////////////////////
		//////////////// MISC UTILS ///////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////

		// assert $contract[$name]() returns $expectedValue
		assertState: async function(contract, name, expectedValue) {
			// todo: check that its a constant
			assert.strEqual(await contract[name](), expectedValue, `'contract.${name}()' was not as expected`);
			console.log(`✓ ${at(contract)}.${name}() returned expected value`);
		},
		// assert balance of $address (can be a contract) is $expectedBalance
		assertBalance: async function(address, expectedBalance) {
			if (address.address) address = address.address;
			const balance = await testUtil.getBalance(address);
			assert.strEqual(balance, expectedBalance, "balance was not as expected");
			console.log(`✓ Balance of ${at(address)} is correct`);
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
function nameAddresses(obj) {
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
	if (!val) return `<invalid address: ${address}>`;
	if (typeof val == "string" && val.length == 42){
		var shortened = val.substr(0, 6) + "...";
		return addrToName[val]
			? colors.yellow(`'${addrToName[val]}'`)
			: shortened;
	}
	if (val.constructor.name == "TruffleContract") {
		var shortened = val.address.substr(0, 6) + "...";
		return addrToName[val.address]
			? colors.yellow(`'${addrToName[val.address]}'`)
			: `'${val.constructor._json.contract_name}[${shortened}]'`;
	}
	return `${val}`;
}

module.exports = createPlugins;

