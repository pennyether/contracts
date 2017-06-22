const createTaskQueue = require("./lib/task-queue");
const createDeferredFn = require("./lib/deferred-fn");
const colors = require("colors/safe");

// creates an object with "describe", "it", "before", "beforeEach", "after", "afterEach"
// allows you to create tests as they run, like any sane person would expect.
// seriously, fuck mocha.
function createMochaLite() {
	var _obj = {};
	var _curNode = _createNode("root", "root", function(){});

	const loggers = {
		"root.pass": createLogger(colors.green),
		"root.fail": createLogger(colors.red),
		"root.skip": createLogger(colors.blue),
		"before.pass": createLogger(colors.green),
		"before.fail": createLogger(colors.red),
		"before.skip": createLogger(colors.blue),
		"after.pass": createLogger(colors.green),
		"after.fail": createLogger(colors.red),
		"after.skip": createLogger(colors.blue),
		"beforeEach.pass": createLogger(colors.green),
		"beforeEach.fail": createLogger(colors.red),
		"beforeEach.skip": createLogger(colors.blue),
		"afterEach.pass": createLogger(colors.green),
		"afterEach.fail": createLogger(colors.red),
		"afterEach.skip": createLogger(colors.blue),
		"describe.pass": createLogger(colors.bold.underline.gray),
		"describe.fail": createLogger(colors.bold.underline.gray, colors.red),
		"describe.skip": createLogger(colors.bold.underline.blue),
		"it.pass": createLogger(colors.bold.green),
		"it.fail": createLogger(colors.bold.red),
		"it.skip": createLogger(colors.bold.blue)
	};
	const cLog = createLogger(colors.gray);

	// returns a function that does a console.log on all args
	// and colorizes the first
	function createLogger() {
		const util = require("util");
		var colorizers = getArgs(arguments);

		return function() {
			var args = getArgs(arguments);
			args = args.map((arg, i) => colorizers.length > i ? colorizers[i](arg) : arg);
			var indent = (new Array(_curNode.parents.length)).join("│   ") + "├──";
			indent = colors.gray.dim(indent);
			args = args.map((arg) => { return util.format(arg).replace(/\n/g, `\n${indent}`); });
			args.unshift(indent);
			console.log.apply(null, args);
		}
	}
	function _createNode(type, name, run) {
		return {
			type: type,
			name: name,
			run: run,
			queue: createTaskQueue(true),
			parents: type=="root" ? [] : _curNode.parents.concat(_curNode),
			children: [],
			before: null,
			beforeEach: null,
			after: null,
			afterEach: null,
			runError: null,
			queueError: null
		};
	}
	function _beforeInitialRun() {
		if (_curNode.type == "describe") {
			loggers[`${_curNode.type}.pass`](`${_curNode.name}`);
		}
	}
	function _onInitialRunPass() {
		if (_curNode.type == "describe") {
			return;
		}
		loggers[`${_curNode.type}.pass`](`${_curNode.name}`);
	}
	function _onInitialRunFail() {
		loggers[`${_curNode.type}.fail`](`${_curNode.name}`, 'run fail', _curNode.runError);
	}
	function _onQueuePass() {
		//var args = getArgs(arguments);
		//loggers[`${_curNode.type}.pass`].apply(null, [`${_curNode.name} - queue pass`].concat(args));
	}
	function _onQueueFail() {
		loggers[`${_curNode.type}.fail`](`${_curNode.name}', 'queue fail`, _curNode.queueError);
	}

	// expects an object with {type, name, run}
	function _run(node) {
		_curNode = node;
		// create a new context for this describe.
		_beforeInitialRun();
		// run the node itself, adding new tasks to this queue. log success/fail.
		Promise.resolve().then(_curNode.run).then(
			() => {
				_onInitialRunPass();

				// insert before, beforeEach, AfterEach, after
				var queue = _curNode.queue;
				if (_curNode.before) queue.add(() => { return _run(_curNode.before); });
				_curNode.children.forEach(function(n){
					if (_curNode.beforeEach) queue.add(() => { return _run(_curNode.beforeEach); });
					queue.add(() => { return _run(n); });
					if (_curNode.afterEach) queue.add(() => { return _run(_curNode.afterEach); });
				});
				if (_curNode.after) queue.add(() => { return _run(_curNode.after); });
				queue.start()
			},
			(e) => {
				_curNode.runError = e;
				_curNode.queue.resolve();
				_onInitialRunFail();
				if (_curNode.type == "before") {
					var err = new Error("before call failed.");
					_curNode.parents.slice(-1)[0].queue.reject(err);
				}
			}
		);

		// make the current queue wait for describeQueue to finish
		// also, be sure to revert the queues and indents when we're done.
		return _curNode.queue.asPromise().then(
			()=>{
				_onQueuePass();
				_curNode = _curNode.parents.pop();
			},
			(e)=>{
				// each node has its own catch... so this shouldnt happen.
				console.log("This should never happen!")
				_curNode.queueError = e;
				_onQueueFail();
				_curNode = _curNode.parents.pop();
			}
		);
	}

	// if any ongoing stuff is happening, waits for it to finish
	// then it executes a new queue
	_obj.describe = function() {
		var [name, fn] = getNameAndFn("describe", arguments);
		_curNode.children.push(_createNode("describe", name, fn));
	}

	_obj.it = function() {
		var [name, fn] = getNameAndFn("it", arguments);
		_curNode.children.push(_createNode("it", name, fn));
	}

	_obj.before = function() {
		var [name, fn] = getNameAndFn("before", arguments);
		if (_curNode.queue.isPending())
			throw new Error(`Cannot add 'before' for '${_curNode.name}' -- a test has already started.`);
		_curNode.before = _createNode("before", name, fn);
	}

	_obj.after = function() {
		var [name, fn] = getNameAndFn("after", arguments);
		if (_curNode.queue.isPending())
			throw new Error(`Cannot add 'after', current describe is already finished.`);
		_curNode.after = _createNode("after", name, fn);
	}

	_obj.beforeEach = function() {
		var [name, fn] = getNameAndFn("beforeEach", arguments);
		if (_curNode.queue.isPending())
			throw new Error(`Cannot add 'before' for '${_curNode.name}' -- a test has already started.`);
		_curNode.beforeEach = _createNode("beforeEach", name, fn);
	}

	_obj.afterEach = function() {
		var [name, fn] = getNameAndFn("afterEach", arguments);
		if (_curNode.queue.isPending())
			throw new Error(`Cannot add 'afterEach', current describe has already started`);
		_curNode.afterEach = _createNode("afterEach", name, fn);
	}

	_obj.start = function() {
		Promise.resolve().then(() => { _run(_curNode); });
	}

	_obj.setGlobals = function() {
		global.describe = _obj.describe;
		global.it = _obj.it;
		global.start = _obj.start;
		global.before = _obj.before;
		global.after = _obj.after;
		global.beforeEach = _obj.beforeEach;
		global.afterEach = _obj.afterEach;
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
		if (typeof arguments[0] !== "function")
			throw new Error(`If passing one argument to ${fnName}, it must be a function.`);
		fn = arguments[0]
		name = fn.name;
	} else {
		throw new Error(`'${fnName}' must be passed one or two arguments.`);
	}
	return [name, fn];
}

createMochaLite().setGlobals();