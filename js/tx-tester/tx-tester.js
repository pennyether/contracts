const createTaskQueue = require("../lib/task-queue");
const createDeferredFn = require("../lib/deferred-fn");

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
function createTxTester(plugins, it) {
	// the object to be returned
	const _obj = new Promise((res, rej)=>{ _resolve = res; _reject = rej; });
	var _resolve;
	var _reject;
	
	var _queue = createTaskQueue();		// all the plugin tasks we need to do
	const _it = it;						// requires a testing library that can do async tests
	const _afterDoneFns = [];			// when done, perform all of these (fail if any fail)
	// ctx object that is passed to all plugins.
	const _ctx = {
		afterDone: (fn) => { _afterDoneFns.push(fn); }
	};

	// adds a call to the plugin onto the queue
	// the plugin will receive the _ctx object
	// and if it fails will have a nice error message.
	function _addPluginTask(name, args) {
		if (!_obj.plugins[name])
			throw new Error(`TxTester.${name} does not exists!`)

		const pluginFn = _obj.plugins[name];
		const promisifiedPluginFn = function() {
			return Promise.resolve()
				.then(() => pluginFn.apply(_ctx, args))
				.catch((pluginError) => {
					const argsStr = argsToString(args);
					const e = new Error(`failed TxTester.${name}(${argsStr}):\n${pluginError.message}`);
					e.stack = e.message + "\n" + pluginError.stack;
					throw e;
				});
		}

		// add promisifiedPluginFn to the queue
		try {
			_queue.add(promisifiedPluginFn);
		} catch (e) {
			throw new Error("TxTester error: You cannot call plugins once TxTest has started.");
		}
	};

	// makes proceeding plugin calls execute on itChain
	// the main chain will wait for this itChain to finish
	// and the itChain will wait for 'it' to be called
	_obj.it = function(msg, required) {
		if (!_it) throw new Error(`'it' function was never provided.`);
		if (_obj.endIt) { _obj.endIt(); }

		const mainQueue = _queue;
		const itQueue = createTaskQueue();
		const deferredItFn = createDeferredFn();

		// mocha will wait for deferredItFn, which:
		// 	- gets resolved when mainQueue gets to itQueue
		//  - gets rejected if mainQueue fails before that (so skip test)
		_it(msg, function(){
			const skip = this.skip;
			return deferredItFn.then(
				() => { return itQueue.start(); },
				() => { skip("a prior required test failed"); }
			);
		});
		
		// otherwise, mainQueue got here.
		// if itQueue fails (and is required), fail mainQueue (see next part)
		mainQueue.add(function(){
			deferredItFn.resolve();
			return itQueue.asPromise().catch((e) => {
				if (required) {
					console.log("TxTester: required 'it' failed, will skip all other 'it's.");
					throw e; 
				}
			});
		});

		// if mainQueue fails, reject run the deferredItFn, so the it skips
		mainQueue.asPromise().catch(e => { deferredItFn.reject(e); });

		// swap _queue for itQueue, so all plugin tasks are added to itQueue
		_queue = itQueue;
		
		// when endIt is called, make it so all plugin tasks are added to mainQueue
		_obj.endIt = function() {
			_queue = mainQueue;
			delete _obj.endIt;
			return _obj;
		}
		return _obj;
	};

	// Starts the main queue
	// If the queue failed:
	//		- perform _afterDoneFns, log afterDonesError, throw queue error
	// If the queue was successful:
	//		- perform _afterDoneFns, throw any errors therein, or resolve with lastResult
	_obj.start = function() {
		// end any 'it' that is opened (so we're back on the main queue)
		if (_obj.endIt) _obj.endIt();

		const qRes = { res: null, err: null };
		_queue.start()
			// run the queue, and store last result to qres
			.then(
				(lastTaskResult) => { qRes.res = lastTaskResult; },
				(queueError) => { qRes.err = queueError; }
			)
			// run all "afterDone" cleanup functions, fails if any fail
			.then(() => {
				return Promise.all(_afterDoneFns.map(fn => { Promise.resolve().then(fn); }));
			})
			// resolve or reject, depending on outcome of afterDones and qRes.err
			.then(
				() => { qRes.err ? _reject(qRes.err) : _resolve(qRes.res); },
				(afterDonesError) => {
					if (qRes.err) { 
						console.log("TxTester Note: at least one 'afterDone' failed: ", afterDonesError);
						_reject(qRes.err)
					} else {
						_reject(afterDonesError);
					}
				}
			);

		return _obj;
	};

	_obj.swallow = function() {
		_obj.catch((e) => { console.log("TxTester: Swallowed error."); });
	};

	// make all plugins callable on obj, and chainable
	_obj.addPlugins = function(plugins) {
		Object.keys(plugins).forEach( name => {
			if (_obj[name])
				throw new Error(`${name} is not a valid name for a plugin -- it's already in use.`);
			_obj[name] = function(){
				const args = Array.prototype.slice.call(arguments);
				_addPluginTask(name, args);
				return _obj;
			}
		});
		_obj.plugins = plugins;
	};

	// remove some or all plugins
	_obj.removePlugins = function(namesOrAll) {
		if (!namesOrAll) namesOrAll = Object.keys(_obj.plugins);
		namesOrAll.forEach((name) => {
			delete _obj[name];
			delete _obj.plugins[name];
		});
	};

	if (plugins) _obj.addPlugins(plugins);

	return _obj;
}

function argsToString(args) {
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

const createUtil = require("./util.js");
const createPlugins = require("./plugins.js");
const Ledger = require("./ledger.js");
module.exports.createTxTester = createTxTester;
module.exports.createDefaultTxTester = function(web3, assert, it) {
	const util = createUtil(web3, assert);
	const ledger = new Ledger(web3);
	const plugins = createPlugins(util, ledger);
	const txTester = createTxTester(plugins, it);
	return txTester;
}