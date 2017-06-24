const path = require("path");
const createDeferredFn = require("../lib/deferred-fn");
const createNode = require("./node");
const Logger = require("./logger");

// creates an object with "describe", "it", "before", "beforeEach", "after", "afterEach"
// allows you to create tests as they run, like any sane person would expect.
// seriously, fuck mocha.
function Smocha(opts) {
	var _obj = this;
	var _opts = strictExtend({
		bail: false,
		useColors: true
	}, opts);

	var _timeout;
	var _curNode = createNode("root", "root", null, function(){});
	var _logger = new Logger();	// will print pretty stuff
	var _consoleLog = console.log;		// we override this to provide indented console logs

	function _buildQueue(node) {
		var queue = node.queue;
		// if runBefore fails, skip all children, and fail the queue.
		// queue.add returns a deferredFn, the .catch wont prevent queue failure
		var runBefore = node.before && !node.before.skip
			? () => _run(node.before, true)
			: () => Promise.resolve();
		queue.add(runBefore).catch(e => { node.children.forEach(_skip); });

		// for each child:
		// runBefore, skip child if that errs
		// or run child (unless there is an only, and child is not it)
		// run afterEach (we dont care if it fails)
		var hasOnly = node.children.some(c => c.only);
		node.children.forEach(child => {
			if (child.skip || (hasOnly && !child.only)) {
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
					(e) => { _skip(child); }
				).then(runAfterEach);
			});
		});
		// run after
		if (node.after && !node.after.skip) queue.add(() => _run(_curNode.after));
	}

	// sets the current context to the node, then runs the node asynchronously
	// at this point, any calls to describe, it, before, etc, are stored in the node
	//
	// if the run fails, it will not run the children nodes.
	// if the run succeeds, it runs the queue of all children, with before/after/etc
	async function _run(node, throwOnError) {
		_curNode = node;
		_logger.onBeforeInitialRun(node);

		// reset this node (it may get run many times, eg, beforeEach)
		node.resetQueue();
		node.runError = null;
		node.queueError = null;

		// create a context specific for this run of node
		var ctx = {
			currentTest: {},

			_skip: false,
			skip: () => { ctx._skip = true; },
			
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
				throw new Error(`'Run function should take zero or one arguments.`);
			if (node.run.length == 0){
				var ret = node.run.call(ctx);
				return ret;
			}

			var deferredFn = createDeferredFn();
			var ret = node.run.call(ctx, deferredFn.resolve);
			if (ret && ret.then) {
				throw new Error(`'Should use 'done()' or return a Promise, but not both.`);
			}
			return deferredFn.then(function(){
				if (arguments[0] === undefined) return;
				var doneResult = arguments[0];
				var e = new Error(`'done()' was called with a value: ${doneResult}`);
				if (doneResult && doneResult.stack) e.stack = doneResult.stack;
				throw e;
			});			
		}

		// run the node itself. during this, children may be added (before, after, etc.)
		Promise.resolve().then(callRun).then(
			() => {
				if (ctx._skip) { _skip(node); node.queue.resolve(); return; }
				_logger.onInitialRunPass(node);
				_buildQueue(node);
				node.queue.start()
			},
			(e) => {
				if (ctx._skip) { _skip(node); node.queue.resolve(); return; }
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

		// when the above finishes, it will start/resolve the queue, which we handle below
		return _curNode.queue.asPromise().then(
			() => {
				// queue is resolved if all children run, OR initialRun fails
				_logger.onQueuePass(node);
				if (node.runError) throw node.runError;
			},
			(e) => {
				// queue is rejected if a child item fails (currently only happens on `before`)
				node.queueError = e;
				_logger.onQueueFail(node);
				throw node.queueError;
			}
		).catch(
			() => {
				_curNode = node.parent;
				ctx.currentTest.state = "succeeded";
			},
			(e) => {
				_curNode = node.parent;
				ctx.currentTest.state = "failed";
				if (throwOnError) throw e;
			}
		);
	}

	function _skip(node) {
		var temp = _curNode;
		_curNode = node;
		_logger.onSkip(node);
		_curNode = temp;
	}

	_obj.file = function(optDesc, filename){
		filename = filename ? filename : optDesc;
		var name = optDesc ? `File: ${optDesc}` : `File: ${filename}`;
		_curNode.children.push(createNode("file", name, _curNode, function(){
			require(path.resolve(filename));
		}));
	};
	_obj.file.only = function(optDesc, filename){
		filename = optDesc ? filename : optDesc;
		var name = optDesc ? `File: ${optDesc}` : `File: ${filename}`;
		_curNode.children.push(createNode("file", name, _curNode, function(){
			require(path.resolve(filename));
		}, {only: true}));
	};
	_obj.file.skip = function(optDesc, filename){
		filename = optDesc ? filename : optDesc;
		var name = optDesc ? `File: ${optDesc}` : `File: ${filename}`;
		_curNode.children.push(createNode("file", name, _curNode, function(){
			require(path.resolve(filename));
		}, {skip: true}));
	};

	// these push a node into the children of the curNode
	['describe', 'it'].forEach((propName) => {
		_obj[propName] = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.children.push(createNode(propName, name, _curNode, fn));
		}
		_obj[propName].only = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.children.push(createNode(propName, name, _curNode, fn, {only: true}));
		}
		_obj[propName].skip = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.children.push(createNode(propName, name, _curNode, fn, {skip: true}));
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

	_obj.addFile = _obj.file;

	_obj.run = _obj.start;

	// push stuff into global object
	function _setGlobals() {
		[ 'file', 'describe', 'it', 'before', 'after', 'beforeEach', 'afterEach',
		 'xfile','xdescribe','xit','xbefore','xafter','xbeforeEach','xafterEach'
		].forEach((propName) => {
			global[propName] = _obj[propName];
		});
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
		fn = arguments[0]
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