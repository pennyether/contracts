const createTaskQueue = require("./lib/task-queue");
const createDeferredFn = require("./lib/deferred-fn");

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
	Plugins are expected to read/write to the ctx object.
*/
var cLog = console.log;
function TxTester(mochaDesribe, mochaIt) {
	// the object to be returned
	var _obj = new Promise((res, rej)=>{ _resolve = res; _reject = rej; });
	var _resolve;
	var _reject;
	
	var _queue = createTaskQueue();		// all the plugin tasks we need to do
	var _afterDoneFns = [];				// when done, perform all of these (fail if any fail)
	var _ctx = {
		afterDone: (fn) => { _afterDoneFns.push(fn); }
	};

	var _mochaDescribe = mochaDesribe;
	var _mochaIt = mochaIt;

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
					var stack = pluginError.stack
					var e = new Error(`TxTester.plugins.${name}(${argsStr}) failed:\n${pluginError.message}`);
					e.stack = stack;
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

	// Adds 'describe', 'endDescribe', and 'it' to _obj.
	function _bindTestStuff() {
		var its = [];
		var describeStack = [];

		_obj.describe = function(describeMsg) {
			if (!mochaDesribe || !mochaIt) {
				throw new Error("Please provide mocha's 'describe' and 'it' functions.");
			}
			// finish previous describe, if there is one.
			// this disallows nested describes, but makes it so you
			// dont have to do "endDescribe()" all the time.
			_obj.endDescribe();
			describeStack.push(describeMsg);
			return _obj;
		}

		// ends the it, then runs its in a describe or standalone
		_obj.endDescribe = function() {
			if (_obj.endIt) { _obj.endIt(); }

			// call mochaIt on all its we've collected so far
			var addIts = () => { its.forEach((it) => _mochaIt(it.msg, it.execute)) };
			describeStack.length > 0
				? _mochaDescribe(describeStack.pop(), addIts)
				: addIts();

			its = [];
			return _obj;
		}

		_obj.endAllDescribes = function() {
			if (_obj.endIt) { _obj.endIt(); }
			while (describeStack.length) _obj.endDescribe();
		}

		// ensures all plugin functions are run on an itChain
		// the main chain will wait for this itChain to finish
		_obj.it = function(msg) {
			if (_obj.endIt) { _obj.endIt(); }

			var mainQueue = _queue;
			var itQueue = createTaskQueue();
			var deferredItFn = createDeferredFn();

			// mocha will wait for deferredItFn
			var it = {
				msg: msg,
				execute: function(){
					var skip = this.skip;
					return deferredItFn.then(
						() => { return itQueue.start(); },
						() => { skip(); }
					);
				}
			};
			if (describeStack.length == 0) {
				_mochaIt(it.msg, it.execute);
			} else {
				its.push(it);
			}

			// if mainQueue fails, reject run the deferredItFn. (the it should skip)
			mainQueue.asPromise().catch((e) => { deferredItFn.reject(); });
			// otherwise, mainQueue got here.  unlock the itFn so it executes
			// also see if there are any errors
			mainQueue.add(function(){
				deferredItFn.resolve();
				return itQueue.asPromise();
			});

			// swap _queue for itQueue, so all tasks are on itQueue
			_queue = itQueue;
			
			// when it is done, swap back queue, and delete 'endIt'
			_obj.endIt = function() {
				_queue = mainQueue;
				delete _obj.endIt;
				return _obj;
			}
			return _obj;
		}
	}

	function _startQueue() {
		// If the queue failed:
		//		- perform _afterDoneFns, log afterDonesError, throw queue error
		// If the queue was successful:
		//		- perform _afterDoneFns, throw any errors therein, or resolve with lastResult
		var qRes = { res: null, err: null };
		_queue.start().then(
			// store results of last task to qRes
			(lastTaskResult) => { qRes.res = lastTaskResult; },
			(queueError) => { qRes.err = queueError; }
		).then(() => {
			// run Promise.all on promisified afterDones
			return Promise.all(_afterDoneFns.map(fn => { Promise.resolve().then(fn); }));
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
	_bindTestStuff();
	_obj.start = function() {
		_obj.endAllDescribes();
		_startQueue();
		return _obj;	
	}
	return _obj;
}

module.exports.make = function(web3, assert) {
	const plugins = require("./tx-tester-plugins").make(web3, assert);
	TxTester.plugins = plugins;
	return TxTester;
}