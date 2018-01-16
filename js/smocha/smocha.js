const path = require("path");
const createDeferredFn = require("../lib/deferred-fn");
const createNode = require("./node");
const Logger = require("./logger");

// creates an object with "describe", "it", "before", "beforeEach", "after", "afterEach"
// allows you to create tests as they run, like any sane person would expect.
function Smocha(opts) {
	var _obj = this;
	var _opts = strictExtend({
		bail: false,
		useColors: true
	}, opts);

	var _timeout;
	var _lastTest = {};	
	var _curNode = createNode("root", "root", null, function(){});
	var _logger = new Logger();			// will print pretty stuff
	var _consoleLog = console.log;		// we override this to provide indented console logs
	this.logger = _logger;

	// After a node's fn is executed, it will have children nodes.
	// Here, we populate the .queue of the node depending on those children.
	function _buildQueue(node) {
		var queue = node.queue;

		// if runBefore fails, skip all children (and after) and fail the queue.
		var runBefore = () => {
			if (node.before && !node.before.skip) {
				return _run(node.before, true).catch(e => {
					node.children.forEach((child) => {
						child.skipReason = "before failed";
						_skip(child);
					});
					if (node.after) {
						node.after.skipReason = "before failed";
						_skip(node.after);
					}
					console.log("caught node.before failure", e);
					throw e;
				});	
			}
		}
		queue.add(runBefore);

		// for each child:
		// runBefore, skip child if that errs
		// or run child (unless there is an only, and child is not it)
		// run afterEach (we dont care if it fails)
		var hasOnly = node.children.some(c => c.only);
		node.children.forEach(child => {
			if (child.skip || (hasOnly && !child.only)) {
				child.skipReason = child.skip
					? "marked as skip"
					: "a sibling is marked as 'only'";
				queue.add(() => { _skip(child); return true; });
				return;
			}
			var runBeforeEach = node.beforeEach
				? () => _run(node.beforeEach, true)
				: () => Promise.resolve();
			var runAfterEach = node.afterEach
				? () => _run(node.afterEach)
				: () => Promise.resolve();
			queue.add(() => {
				return runBeforeEach().then(
					() => _run(child),
					(e) => {
						child.skipReason = "beforeEach failed";
						_skip(child);
					}
				).then(runAfterEach);
			});
		});
		// run after
		if (node.after && !node.after.skip) queue.add(() => _run(_curNode.after));
	}

	// sets the current context to the node, then runs the node asynchronously (callRun)
	// at this point, any calls to describe, it, before, etc, are stored in the node
	//
	// if the run fails, it will not run the children nodes.
	// if the run succeeds, it runs the queue of all children, with before/after/etc
	async function _run(node, throwOnError) {
		_curNode = node;
		_logger.onEncounter(node);

		// reset this node (it may get run many times, eg, beforeEach)
		node.resetQueue();
		node.runTime = null;
		node.runError = null;
		node.queueError = null;
		node.skipReason = null;

		// create a context specific for this run of node
		var ctx = {
			currentTest: _lastTest,

			_skip: false,
			skip: (reason) => { ctx._skip = true; node.skipReason = reason; },
			logInfo: (str) => { _logger.logInfo(_curNode, str); },
			logWarn: (str) => { _logger.logWarn(_curNode, str); },
			
			retries: (num) => { console.log(".retries() not yet supported."); },
			timeout: (ms) => { console.log(".timeout() not yet supported."); },
			slow: (ms) => { console.log(".slow() not yet supported."); }
		};

		
		// calls run, passing it a 'done' callback if arguments.length==1
		//
		// throws if:
		//		- the call itself throws
		//		- both 'done' is requested and it returns a promise
		//		- 'done' is passed any value
		// returns:
		//		- if passed done, a deferredFn
		//		- otherwise the result of node.run.call()
		var callRun = function(){
			if (node.run.length >= 2)
				return Promise.reject(
					new Error(`'${node.run.toString()}' should take zero or one arguments, not ${node.run.length}`)
				);
			if (node.run.length == 0){
				return Promise.resolve().then(() => node.run.call(ctx));
			}
			if (node.run.length == 1){
				// call run, wait for `deferredFn.resolve` to be called
				var deferredFn = createDeferredFn();
				var ret = node.run.call(ctx, deferredFn.resolve);
				if (ret) {
					return Promise.reject(
						new Error(`Smocha Error: '${node.name}' is expected to call "done", but returned: ${ret}.`)
					);
				}
				// see if done() was passed anything, indicating a failure
				return deferredFn.then(function(){
					if (arguments[0] === undefined) return;
					var doneResult = arguments[0];
					var e = new Error(`${node.name}: 'done()' was called with a value: ${doneResult}`);
					if (doneResult && doneResult.stack) e.stack = doneResult.stack;
					throw e;
				});
			}
		}

		// callRun, during which children may be addeded to the node.
		// after success, we execute the queue itself.
		var startTime = +(new Date());
		callRun().then(
			() => {
				node.runTime = +(new Date()) - startTime;
				if (ctx._skip) {
					_logger.onSkipDuringInitialRun(node);
					node.queue.resolve();
					return;
				}
				_lastTest.state = "succeeded";
				_logger.onInitialRunPass(node);
				_buildQueue(node);
				node.queue.start()
			},
			(e) => {
				node.runTime = +(new Date()) - startTime;
				if (ctx._skip) {
					_logger.onSkipDuringInitialRun(node);
					node.queue.resolve();
					return;
				}
				_lastTest.state = "failed";
				node.runError = e;
				_logger.onInitialRunFail(node);
				node.queue.resolve();
			}
		).catch((e) => {
			// this indicates an error in smocha or smocha-logger. don't do the queue.
			_consoleLog(`Unhandled Exception thrown after running '${node.name}'`, e);
			throwOnError = true;
			node.queue.reject(e);
		});

		// Wait for all children (queue) to finish, then handle accordingly.
		return _curNode.queue.asPromise().then(
			() => {
				// queue is resolved if callRun fails, OR all children run
				_logger.onQueuePass(node);
				if (node.runError) throw node.runError;
			},
			(e) => {
				// queue is rejected if a child item fails, or unhandled exception
				node.queueError = e;
				_logger.onQueueFail(node);
				throw node.queueError;
			}
		).then(
			// always reset _curNode, and if necessary bubble the error.
			() => { _curNode = node.parent; },
			(e) => {
				_curNode = node.parent;
				if (throwOnError || _opts.bail) throw e;
			}
		);
	}

	function _skip(node, duringRun) {
		_logger.onSkip(node);
	}

	_obj.file = function(filename, optDesc){
		filename = path.relative(process.cwd(), filename);
		var name = optDesc ? `File: ${optDesc}` : `File: ${filename}`;
		_curNode.addChild(createNode("file", name, _curNode, function(){
			require(path.resolve(filename));
		}));
	};
	_obj.file.only = function(filename, optDesc){
		var name = optDesc ? `File: ${optDesc}` : `File: ${filename}`;
		_curNode.addChild(createNode("file", name, _curNode, function(){
			require(path.resolve(filename));
		}, {only: true}));
	};
	_obj.file.skip = function(filename, optDesc){
		var name = optDesc ? `File: ${optDesc}` : `File: ${filename}`;
		_curNode.addChild(createNode("file", name, _curNode, function(){
			require(path.resolve(filename));
		}, {skip: true}));
	};

	// these push a node into the children of the curNode
	['describe', 'it'].forEach((propName) => {
		_obj[propName] = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.addChild(createNode(propName, name, _curNode, fn));
		}
		_obj[propName].only = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.addChild(createNode(propName, name, _curNode, fn, {only: true}));
		}
		_obj[propName].skip = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.addChild(createNode(propName, name, _curNode, fn, {skip: true}));
		}
		Smocha[propName] = _obj[propName];
	});

	// these push a node into a property of the curNode
	['before', 'after', 'beforeEach', 'afterEach'].forEach((propName) => {
		_obj[propName] = function() {
			var [name, fn] = getNameAndFn(propName, arguments);	
			if (_curNode.queue.isPending())
				throw new Error(`Cannot add '${propName}' for '${_curNode.name}' -- a test has already started.`);
			_curNode[propName] = createNode(propName, `${propName}: ${name}`, _curNode, fn);
		}
		Smocha[propName] = _obj[propName];
	});

	// these all do nothing
	['xfile', 'xdescribe', 'xit', 'xbefore', 'xafter', 'xbeforeEach', 'xafterEach'].forEach((propName => {
		_obj[propName] = ()=>{};
		Smocha[propName] = _obj[propName];
	}));

	// starting runs the root node, and also replaces console.log
	_obj.start = function() {
		if (_timeout)
			throw new Error("started already called.");
		// this ensures the process does not terminate without our run
		_timeout = setTimeout(function(){}, 1000*60*60*24);

		return Promise.resolve().then(() => {
			_logger.onStart();
			console.log = function(){ _logger.log(_curNode, getArgs(arguments)); };
			return _run(_curNode);
		}).then(
			(v) => { console.log = _consoleLog; clearTimeout(_timeout); return v; },
			(e) => { console.log = _consoleLog; clearTimeout(_timeout); _logger.onFailure(e); }
		).then(() => {
			_logger.onComplete();
		});
	};

	_obj.run = _obj.start;

	// push stuff into global object
	function _setGlobals() {
		[ 'file', 'describe', 'it', 'before', 'after', 'beforeEach', 'afterEach',
		 'xfile','xdescribe','xit','xbefore','xafter','xbeforeEach','xafterEach'
		].forEach((propName) => {
			global[propName] = _obj[propName];
		});
		global["_smocha"] = _obj;
	}
	_setGlobals();
}

function getArgs(_arguments) {
	return Array.prototype.slice.call(_arguments);
}
function getNameAndFn(fnName, _arguments) {
	var name;
	var fn;
	if (_arguments.length == 2){
		name = _arguments[0];
		fn = _arguments[1];
		if (typeof fn !== "function")
			throw new Error(`If passing two args to ${fnName}, the second must be a function`)
	} else if (_arguments.length == 1) {
		if (typeof _arguments[0] !== "function")
			throw new Error(`If passing one argument to ${fnName}, it must be a function.`);
		fn = _arguments[0]
		name = fn.name || "(unnamed)";
	} else {
		throw new Error(`'${fnName}' must be passed one or two arguments.`);
	}
	return [name, fn];
}
function strictExtend(obj, opts){
	Object.keys(opts || {}).forEach((key) => {
		if (!obj.hasOwnProperty(key))
			throw new Error(`Unsupported opt: '${key}'`);
		obj[key] = opts[key];
	});
	return obj;
}

module.exports = Smocha;