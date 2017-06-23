const createTaskQueue = require("./lib/task-queue");
const createDeferredFn = require("./lib/deferred-fn");
const SmochaLogger = require("./lib/smocha-logger");

// creates an object with "describe", "it", "before", "beforeEach", "after", "afterEach"
// allows you to create tests as they run, like any sane person would expect.
// seriously, fuck mocha.
function createSmocha() {
	var _obj = {};
	var _curNode = _createNode("root", "root", function(){});
	var _logger = new SmochaLogger();	// will print pretty stuff
	var _consoleLog = console.log;		// we override this to provide indented console logs

	function _createNode(type, name, run, opts) {
		opts = opts || {only: false, skip: false};
		return {
			// set when node is created
			type: type,
			name: name,
			run: run,
			only: !!opts.only,
			skip: !!opts.skip,
			parents: type=="root" ? [] : _curNode.parents.concat(_curNode),

			// set during initial run
			children: [],
			before: null,
			beforeEach: null,
			after: null,
			afterEach: null,
			runError: null,

			// set after initial run
			queue: null,
			queueError: null,

			// some handy utils for debugging
			getParent: function() {
				return this.parents.slice(-1)[0];
			},
			getParentName: function() {
				return this.type == "root" ? "<NO PARENT>" : this.getParent().getName();
			},
			getName: function() {
				return this.parents.map(p => p.name).concat(this.name).join(" > ")
			}
		};
	}

	function _buildQueue(node) {
		var queue = node.queue;
		var hasOnly = node.children.some(c => c.only);

		// if runBefore fails, skip all children, and fail the queue.
		// queue.add returns a deferredFn, the .catch wont prevent queue failure
		var runBefore = node.before && !node.before.skip
			? () => _run(node.before, true)
			: () => Promise.resolve();
		queue.add(runBefore).catch(e => { node.children.forEach(_skip); });

		// for each child:
		// runBefore, skip child if that errs, or run child, runAfter
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

	function _skip(node) {
		var temp = _curNode;
		_curNode = node;
		_logger.onSkip(node);
		_curNode = temp;
	}

	// sets the current context to the node, then runs the node asynchronously
	// at this point, any calls to describe, it, before, etc, are stored in the node
	//
	// if the run fails, it will not run the children nodes.
	// if the run succeeds, it runs the queue of all children, with before/after/etc
	//
	// This returns a promise to the queue of children to execute.  Note, this queue
	// is not executed if this node's run failed..  However, the queue will continue if any
	// child run fails unless that run explicitly calls _curNode.parent.queue.reject/resolve
	async function _run(node, throwOnError) {
		_curNode = node;
		_logger.onBeforeInitialRun(node);

		// reset this node (it may get run many times, eg, beforeEach)
		_curNode.queue = createTaskQueue(true);
		_curNode.runError = null;
		_curNode.queueError = null;

		// run the node itself. during this, children may be added (before, after, etc.)
		Promise.resolve().then(_curNode.run).then(
			() => {
				node.runError = null;
				_logger.onInitialRunPass(node);
				_buildQueue(node);
				_curNode.queue.start()
			},
			(e) => {
				node.runError = e;
				_logger.onInitialRunFail(node);
				_curNode.queue.resolve();
			}
		).catch((e) => {
			// this indicates an error in smocha or smocha-logger.
			_consoleLog(`Unhandled Exception thrown in: ${node.name}`, e);
			throwOnError = true;
			_curNode.queue.reject(e);
		});

		// when the above finishes, it will start the queue, which will finish below.
		return _curNode.queue.asPromise().then(
			()=>{
				// queue is resolved if all children run, OR initialRun fails
				_logger.onQueuePass(node);
				_curNode = _curNode.getParent();
				if (throwOnError && node.runError) throw node.runError;
			},
			(e) => {
				// queue is rejected if a child item fails (currently only happens on `before`)
				_curNode.queueError = e;
				_logger.onQueueFail(node);
				_curNode = _curNode.getParent();
				if (throwOnError) throw node.queueError;
			}
		);
	}

	// these push a node into the children of the curNode
	['describe', 'it'].forEach((propName) => {
		_obj[propName] = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.children.push(_createNode(propName, name, fn));
		}
		_obj[propName].only = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.children.push(_createNode(propName, name, fn, {only: true}));
		}
		_obj[propName].skip = function() {
			var [name, fn] = getNameAndFn(propName, arguments);
			_curNode.children.push(_createNode(propName, name, fn, {skip: true}));
		}
	});

	// these push a node into a property of the curNode
	['before', 'after', 'beforeEach', 'afterEach'].forEach((propName) => {
		_obj[propName] = function() {
			var [name, fn] = getNameAndFn(propName, arguments);	
			if (_curNode.queue.isPending())
				throw new Error(`Cannot add '${propName}' for '${_curNode.name}' -- a test has already started.`);
			_curNode[propName] = _createNode(propName, `${propName}: ${name}`, fn);
		}
	});

	// these all do nothing
	['xdescribe', 'xit', 'xbefore', 'xafter', 'xbeforeEach', 'xafterEach'].forEach((propName => {
		_obj[propName] = ()=>{};
	}));

	// starting runs the root node, and also replaces console.log
	_obj.start = function() {
		Promise.resolve().then(() => {
			console.log = () => { _logger.log(_curNode, getArgs(arguments)); }
			return _run(_curNode);
		}).then(
			(v) => { console.log = _consoleLog; return v; },
			(e) => { console.log = _consoleLog; throw e; }
		);
	};

	// push stuff into global object
	_obj.setGlobals = function() {
		['start', 'describe', 'it', 'before', 'after', 'beforeEach', 'afterEach',
		   		 'xdescribe','xit','xbefore','xafter','xbeforeEach','xafterEach'
		].forEach((propName) => {
			global[propName] = _obj[propName];
		});
	}

	return _obj;
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

createSmocha().setGlobals();