// creates a promise with a "resolve()" and "reject()" function
// resolve(v): resolves with fn(), v, or nothing
// reject(e): fails it with e
function createDeferredFn(fn) {
	var resolve;
	var onResolve;

	var p = new Promise((res, rej) => resolve = res)
		.then(()=>{ return onResolve(); });

	p.resolve = function(v) { 
		onResolve = () => { return fn ? fn(v) : v }
		resolve();
		return p;
	};
	p.reject = (e) => {
		onResolve = () => { throw e };
		resolve();
		return p;
	};
	return p;
}

// Allows you to add fns onto a queue
// Calling start triggers them in order, stopping on any fail.
// Once started, you are not allowed to add fns.  This is to
// prevent race conditions, which are no good when testing.
//
// usage:
//	   createTaskQueue()
//			.add(fn || promise)
//			.add(fn || promise)
//			.start()
//
function createTaskQueue() {
	var _obj = Object.create(null);
	var _started = false;
	var _deferredFns = [];
	var _endPromise = createDeferredFn();
	
	// if there is no next task, fulfill _endPromise with _lastPromise
	// otherwise, set next task to _lastPromise, execute it:
	//	  	- if it succeeds, repeat
	//		- if it fails, fail _endPromise
	var _lastPromise = undefined;
	function _doNextPromise(v) {
		if (_deferredFns.length) {
			var next = _deferredFns.shift();
			next.resolve(v).then(_doNextPromise, (e) => { _endPromise.reject(e); });
			_lastPromise = next.catch((e)=>{});
		} else {
			// all tasks done. fulfill the end promise
			_endPromise.resolve(_lastPromise);
		}
	}

	_obj.start = function(fn) {
		if (_started)
			throw Error("Queue has already been started");
		if (fn) _obj.prepend(fn);
		_started = true;
		_doNextPromise();
		return _obj.asPromise();
	};

	_obj.asPromise = function(fn) {
		return _endPromise;
	};

	_obj.prepend = function(fn) {
		if (_started)
			throw Error("Cannot add to queue after it has been started.");
		var deferredFn = createDeferredFn(fn);
		_deferredFns.unshift(deferredFn);
		return deferredFn;
	}
	
	_obj.add = function(fn) {
		if (_started)
			throw Error("Cannot add to queue after it has been started.");
		var deferredFn = createDeferredFn(fn);
		_deferredFns.push(deferredFn);
		return deferredFn;
	}

	return _obj;
}

/**
Allows for chaining together common test operations and assertions.
Everything is a plugin with a simple interface.  Take a look at txTester.plugins.
Most plugins are built to work with truffle-contract but can be changed
for use with web3 pretty easily.

usage:
	TxTester()
		.watch([address1, address2])
		.do( () => <tx promise> )
		.assertLostTxFee(address1)
        .assertDelta(address2, 123)
        .assertOneLog("SomeEvent", "Lost only txFee", {arg1: "arg1val", arg2: "arg2val"});

returns:
	A promise that is fulfilled with the result of the last task,
	or the first error encountered.

notes:
	Plugins are expected to read/write to the ctx object.  Sometimes there
	are dependencies, eg, watcher needs an 'afterDo' promise that the
	'do' plugin sets, but 'watcher' needs to execute first.  In order to work
	around that, 'watcher' uses ctx.get('afterDo') and 'do' uses
	ctx.set('afterDone').

	When creating plugins, if you are going to set any value asynchronously
	then you must use ctx.set('').

	Note to self: perhaps its better to just require users to know how to
	use the plugins.  eg:  .watchBalances().do().stopWatchingBalances()
	If so, that's a waste of an hour :(
*/
function TxTester() {
	// the object to be returned
	var _obj = new Promise((res, rej)=>{ _resolve = res; _reject = rej; });
	var _resolve;
	var _reject;
	
	var _queue = createTaskQueue();		// all the plugin tasks we need to do
	var _afterDones = [];				// when done, perform all of these (fail if any fail)
	var _ctxPromises = {};
	var _ctx = {
		afterDone: (fn) => { _afterDones.push(fn); }
	};
	var _sideChain = null;

	function _argsToString(args) {
		return args.map(a => {
			if (typeof a == "string") {
				return `"${a.substr(0, 9) + (a.length > 10 ? "..." : "")}"`;
			} else if (typeof a == "object") {
				return Object.prototype.toString.call(a);
			} else if (a == undefined) {
				return "undefined"
			} else {
				return a.toString();
			}
		}).join(", ");
	}

	// adds a plugin call onto the queue
	function _addPluginTask(name, args) {
		// create a fn executed with ctx as context, passing it args
		var pluginFn = TxTester.plugins[name];
		var promisifiedPluginFn = function() {
			return Promise.resolve()
				.then(() => pluginFn.apply(_ctx, args))
				.catch((pluginError) => {
					var argsStr = _argsToString(args);
					var e = new Error(`TxTester.plugins.${name}(${argsStr}) failed:\n${pluginError.message}`);
					e.stack = pluginError.stack;
					throw e;
				});
		}

		// add promisifiedPluginFn to the queue
		try {
			_queue.add(promisifiedPluginFn);
		} catch (e) {
			throw new Error("TxTester error: You cannot call plugins once TxTest has started.");
		}
	}

	function _bindPlugins() {
		// make all plugins callable on obj, and chainable
		Object.keys(TxTester.plugins).forEach( name => {
			_obj[name] = function(){
				var args = Array.prototype.slice.call(arguments);
				_addPluginTask(name, args);
				return _obj;
			}
		});
	}

	function _start() {
		// If the queue failed:
		//		- perform _afterDones, log afterDonesError, throw queue error
		// If the queue was successful:
		//		- perform _afterDones, throw any errors therein, or resolve with lastResult
		var qRes = { res: null, err: null };
		_queue.start().then(
			// store results of last task to qRes
			(lastTaskResult) => { qRes.res = lastTaskResult; },
			(queueError) => { qRes.err = queueError; }
		).then(() => {
			// run Promise.all on promisified afterDones
			return Promise.all(_afterDones.map(fn => { Promise.resolve().then(fn); }));
		}).then(
			// afterDones succeeded, reject or resolve
			() => { qRes.err ? _reject(qRes.err) : _resolve(qRes.res); },
			// afterDones errored
			(afterDonesError) => {
				if (qRes.err) { 
					console.log("TxTester Note: some afterDones failed: ", afterDonesError);
					_reject(qRes.err)
				} else {
					_reject(afterDonesError);
				}
			}
		);
	}

	_bindPlugins();						// add all plugins to obj
	Promise.resolve().then(_start);		// start queue on next tick.
	return _obj;
}



var Util = require("./test-util").make(web3, assert);
var Ledger = require("./ledger").bind(null, web3);
TxTester.plugins = {
	///////////////////////////////////////////////////////////////////
	/// DO! ///////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////

	// Passed a function that returns a truffle-contract res object (or a promise of one)
	// Add to ctx:
	// 		.res - The returning result of execution
	//      .err - The error, if any, from execution
	//      .afterDo() - A promise fulfilled after execution
	//		.resultPromise - A promise fulfilled/failed with execution results
	do: function(fn) {
		var ctx = this;
		if (typeof fn !== 'function')
			throw new Error(".do must be passed a function");

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
	getResult: function(fn) {
		var ctx = this;
		return ctx.resultPromise;
	},
	// assert .res and .res.receipt are set
	assertSuccess: function(){
		var ctx = this;
		if (!ctx.res && !ctx.err)
			throw new Error("'do' was never called.");

		assert(ctx.res && ctx.res.receipt, "res.receipt should exists");
	},
	// asserts the last `do` throw an error whose string contains 'invalid opcode'
	assertInvalidOpCode: function() {
		var ctx = this;
		if (!ctx.err && !ctx.res)
			throw new Error("'do' was never called.")
		if (!ctx.err)
			throw new Erro("Expected call to fail.");

		assert.include(ctx.err.message, "invalid opcode", "Error contains 'invalid opcode'");
	},
	// assert there is one log, with name $eventName and optional $args from optional $address
	assertOneLog: async function(eventName, args, address) {
		var ctx = this;
		if (!ctx.res && !ctx.err)
			throw new Error("'do' was never called.");

		return Util.expectOneLog(ctx.res, eventName, args, address);
	},
	// assert there is a log named "Error" with an arg msg that is $msg from optional $address
	assertErrorLog: async function(msg, address) {
		var ctx = this;
		return Util.expectErrorLog(ctx.res, msg, address);
	},
	// prints the logs of the last `do`, otherwise nothing
	logLogs: function(){
		var ctx = this;
		if (!ctx.res && !ctx.err)
			throw new Error("'do' was never called.");

		if (ctx.res){
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
		return TxTester.plugins.assertDelta.bind(ctx)
			(address, txFee, msg || "address lost only the TxFee");
	},
	// assert $address has a delta equal to $amt minus the txFee
	assertDeltaMinusTxFee: async function(address, amt, msg) {
		var ctx = this;
		if (!ctx.res && !ctx.err)
			throw new Error("'do' was never called.");

		var expectedFee = await Util.getTxFee(ctx.res.tx).mul(-1).plus(amt);
		return TxTester.plugins.assertDelta.bind(ctx)
			(address, expectedFee, msg || "address gained amt minus txfee");
	},



	////////////////////////////////////////////////////////////////////
	/////// EVENTS STUFF ///////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////

	// this task will add a listner that appens to ctx.allEvents[address]
	// it will stop watching afterDone
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

		if (!ctx.allEvents) ctx.allEvents = {};
		contracts.forEach(c => {
			ctx.allEvents[c.address] = [];
			var watcher = c.allEvents(function(err, log){
				if (!err) ctx.allEvents[c.address].push(log);
			});
			ctx.afterDone(async () => {
				console.log("stopping"); await watcher.stopWatching();
			})
		});

	},
	stopWatchingEvents: function() {

	},
	logEvents: function() {
		var ctx = this;
		Object.keys(ctx.allEvents || {}).forEach(address => {
			console.log(`Logs for ${address}: `, ctx.allEvents[addr]);
		});
	},


	
	///////////////////////////////////////////////////////////////////////
	//////////////// MISC UTILS ///////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////

	// assert $contract[$name]() returns $expectedValue
	assertState: async function(contract, name, expectedValue) {
		assert.strEqual(await contract[name](), expectedValue, "Value of ${key}");
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
	}
	////////////////////////////////////////////////////
}


module.exports = TxTester;