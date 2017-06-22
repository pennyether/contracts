function MakePlugins(Util, Ledger) {
	var plugins = {
		///////////////////////////////////////////////////////////////////
		/// DO! ///////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////

		// Passed a function that returns a truffle-contract res object (or a promise of one)
		// Add to ctx:
		// 		.res - The returning result of execution
		//      .err - The error, if any, from execution
		//		.resultPromise - A promise fulfilled/failed with execution results
		doTx: function(fn) {
			var ctx = this;
			var type = Object.prototype.toString.call(fn);
			if (type !== '[object Promise]' && typeof fn !== 'function')
				throw new Error(`.do must be passed a fn or promise, instead got: 'type'`);

			// execute fn, store promise to ctx
			var resultPromise = Promise.resolve().then(fn);
			ctx.resultPromise = resultPromise;

			// return the promise, so chain waits on us
			return resultPromise.then(
				(res) => { ctx.res = res;  ctx.err = null; },
				(err) => { ctx.res = null; ctx.err = err; }
			)
		},
		// returns the result of `do`
		getTx: function() {
			var ctx = this;
			return ctx.resultPromise;
		},
		// assert .res and .res.receipt are set
		assertSuccess: function() {
			var ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");

			assert(!ctx.err, `tx resulted in error: ${ctx.err}`)
			assert(ctx.res && ctx.res.receipt, "res.receipt should exists");
		},
		// asserts the last `do` throw an error whose string contains 'invalid opcode'
		assertInvalidOpCode: function() {
			var ctx = this;
			if (!ctx.err && !ctx.res)
				throw new Error("'doTx' was never called.")
			if (!ctx.err)
				throw new Erro("Expected call to fail.");

			assert.include(ctx.err.message, "invalid opcode", "Error contains 'invalid opcode'");
		},
		// assert there is one log, with name $eventName and optional $args from optional $address
		assertOneLog: async function(eventName, args, address) {
			var ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");

			return Util.expectOneLog(ctx.res, eventName, args, address);
		},
		// assert there is a log named "Error" with an arg msg that is $msg from optional $address
		assertErrorLog: async function(msg, address) {
			var ctx = this;
			return Util.expectErrorLog(ctx.res, msg, address);
		},
		// prints the logs of the last `do`, otherwise nothing
		logLogs: function() {
			var ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'doTx' was never called.");

			if (ctx.res) {
				console.log("txWatcher printing logs by request...");
				console.log(ctx.res.logs);
			}
		},


		///////////////////////////////////////////////////////////////
		/////// LEDGER STUFF //////////////////////////////////////////
		///////////////////////////////////////////////////////////////

		// This will add "ledger" onto the ctx object
		// It will stop tracking afterDone
		watch: function(addresses) {
			var ctx = this;

			return Promise.resolve().then(async function(){
				var ledger = new Ledger(addresses);
				ctx.ledger = ledger;
				await ledger.start();	
			});
		},
		stopWatching: async function() {
			var ctx = this;
			await ctx.ledger.stop();
		},
		// asserts a delta of $amt in the balance of $address
		assertDelta: function(address, amt, msg) {
			var ctx = this;
			if (!ctx.ledger)
				throw new Error("You never called .watch()");

			assert.strEqual(ctx.ledger.getDelta(address), amt, msg || "balance was changed");
		},
		// asserts $address has a delta equal to the txFee of the last result
		assertLostTxFee: async function(address, msg) {
			var ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'do' was never called.");

			var txFee = await Util.getTxFee(ctx.res.tx).mul(-1);
			return plugins.assertDelta.bind(ctx)
				(address, txFee, msg || "address lost only the TxFee");
		},
		// assert $address has a delta equal to $amt minus the txFee
		assertDeltaMinusTxFee: async function(address, amt, msg) {
			var ctx = this;
			if (!ctx.res && !ctx.err)
				throw new Error("'do' was never called.");

			var expectedFee = await Util.getTxFee(ctx.res.tx).mul(-1).plus(amt);
			return plugins.assertDelta.bind(ctx)
				(address, expectedFee, msg || "address gained amt minus txfee");
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
		watchEventsOf: function(contracts) {
			var ctx = this;
			
			// validate that each item is a contract
			contracts.forEach((c,i) => {
				if (!c || !c.allEvents) {
					var e = new Error(`${i}th value is not a contract (check .val): ${c}`);
					e.val = c;
					throw e;
				}
			});

			if (!ctx.contractWatchers) ctx.contractWatchers = {};
			if (!ctx.contractEvents) ctx.contractEvents = {};
			contracts.forEach(c => {
				ctx.contractEvents[c.address] = [];
				var watcher = c.allEvents(function(err, log){
					if (!err) ctx.contractEvents[c.address].push(log);
				});
				ctx.contractWatchers[c.address] = watcher;
			});
			ctx.afterDone(async () => {
				await plugins.stopWatchingEvents.bind(ctx)();
			})
		},
		stopWatchingEvents: async function() {
			var ctx = this;
			var addresses = Object.keys(ctx.contractWatchers);
			while (addresses.length) {
				var address = addresses.shift();
				var watcher = ctx.contractWatchers[address];
				console.log(`Stopping watcher @ ${address}...`);
				await watcher.stopWatching();
			}
			delete ctx.contractWatchers;
		},
		logEvents: function() {
			var ctx = this;
			Object.keys(ctx.contractEvents || {}).forEach(address => {
				console.log(`Logs for ${address}: `, ctx.contractEvents[addr]);
			});
		},


		
		///////////////////////////////////////////////////////////////////////
		//////////////// MISC UTILS ///////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////

		// assert $contract[$name]() returns $expectedValue
		assertState: async function(contract, name, expectedValue) {
			assert.strEqual(await contract[name](), expectedValue, `Value of ${name}`);
		},
		// assert balance of $address (can be a contract) is $expectedBalance
		assertBalance: async function(address, expectedBalance) {
			if (address.address) address = address.address;
			var balance = await Util.getBalance(address);
			assert.strEqual(balance, expectedBalance)
		},
		logBalance: async function(address) {
			if (address.address) address = address.address;
			var balance = await Util.getBalance(address);
			console.log(`Balance of ${address} is ${balance}`);
		},
		ret: function(v){ return v; },
		wait: function(time, msg){
			if (msg) { console.log(msg); }
			return new Promise((res,rej)=>{ setTimeout(res, time); })
		},
		log: function(){ console.log.apply(console, arguments); },
		pass: async function(){},
		fail: async function(){ throw new Error("Failure"); }
		////////////////////////////////////////////////////
	};
	return plugins;
}

module.exports.make = function(web3, assert) {
	const Util = require("./test-util").make(web3, assert);
	const Ledger = require("./ledger").bind(null, web3);

	// passed $fn, will return a function that invokes $fn with
	// all arguments such that any function arguments are turned into
	// their return value.
	function withUnwrappedArgs(fn) {
		return function() {
			var args = Array.prototype.slice.call(arguments);
			args = args.map((arg) => {
				if (typeof arg == 'function') { return arg(); }
				else { return arg; }
			});
			return fn.apply(this, args);
		}
	}

	// 
	var obj = MakePlugins(Util, Ledger);
	Object.keys(obj).forEach((name) => {
		obj[name] = withUnwrappedArgs(obj[name]);
	});
	return obj;
};

