const colors = require("colors/safe");
const util = require("util");

function SmochaLogger() {
	colors.setTheme({
		// indent
		indent: ['dim', 'gray'],

		// states
		pass: 'green',
		fail: 'red',
		skip: 'gray',

		// types
		describe: ['bold'],
		before: ['dim'],
		after: ['dim'],
		beforeEach: [],
		afterEach: [],

		// overrides
		'describe.encountered': ['bold', 'black'],
	});
	const _consoleLog = console.log;
	var _startTime;
	var _passes = [];
	var _errors = [];
	var _skips = [];

	// print args with indent.
	function _log(node, args) {
		args = args || [];
		var indent = (new Array(node.parents.length)).join("│  ") + "├ ";
		indent = colors.indent(indent);
		args = args.map((arg) => util.format(arg).replace(/\n/g, `\n${indent}`));
		args.unshift(indent);
		_consoleLog.apply(null, args);		
	}
	// prints arg[0] stylized above, and indented
	function _logType(node, state, args) {
		if (node.type == "root") return;
		if (!args.map) return;
		var str = args[0].toString();
		if (colors[`${node.type}.${state}`]){
			str = colors[`${node.type}.${state}`](str);
		} else {
			if (colors[state]) { str = colors[state](str); }
			if (colors[node.type]) { str = colors[node.type](str); }
		}
		args[0] = str;
		_log(node, args);
	}

	// stats ///////////////////////
	function _addPass(node) {
		_passes.push(node);
	}
	function _addError(node, error) {
		_errors.push([node, error]);
		var num = colors.red.bold(`(${_errors.length})`);
		var trimmedMsg = error.message.length > 40
			? error.message.substr(0, 40) + "..."
			: error.message;
		var msg = colors.gray(`[${trimmedMsg}]`);
		return [num, msg];
	}
	function _addSkip(node) {
		_skips.push(node);
	}

	this.log = _log;

	this.onBeforeInitialRun = function(node) {
		if (node.type == "describe") {
			_logType(node, "encountered", [`${node.name}`]);
		}
	}
	this.onInitialRunPass = function(node) {
		if (node.type == "describe"
			|| node.type == "beforeEach"
			|| node.type == "afterEach")
		{
			// we dont care if these pass.
		} else {
			_logType(node, "pass", [`${node.name}`]);
			_addPass(node);
		}
	}
	this.onInitialRunFail = function(node) {
		var [errNum, errMsg] = _addError(node, node.runError);
		if (node.type == "describe") {
			var str = colors.fail("Skipped children tasks (describe failed)");
			_log(node, [colors.indent('└'), errNum, str, errMsg]);
		} else {
			_logType(node, "fail", [`${errNum} ${node.name}`, errMsg]);	
		}
		
	}
	this.onQueuePass = function(node) {
		// we don't really care about this
	}
	this.onQueueFail = function(node) {
		var str = colors.indent('└') + " " + colors.fail("Skipped children tasks (before failed)");
		_log(node, [str]);
	}
	this.onSkip = function(node) {
		_logType(node, "skip", [`${node.name}`, colors.dim('(skipped)')]);
		_addSkip(node);
	}

	this.onStart = function() {
		process.on('unhandledRejection', function(reason, p){
		    console.log(colors.red.bold("Unhandled Rejection:\n"), colors.red(util.format(reason)));
		});
		_startTime = +(new Date());
		var smochaStarting = colors.black.bold.inverse(" SMOCHA STARTING ");
		console.log("");
		console.log("  ========================================= ")
		console.log(`  =========== ${smochaStarting} ===========`);
		console.log("  ========================================= ");
		console.log("");
	}
	this.onComplete = function() {
		var statusColorize;
		if (_errors.length) statusColorize = colors.red.bold.inverse;
		else if (_skips.length) statusColorize = colors.gray.bold.inverse;
		else statusColorize = colors.green.bold.inverse;

		var smochaFinished = statusColorize(" SMOCHA FINISHED ");
		var numPasses = colors.green.bold(_passes.length) + colors.green(" passed.");
		var numErrors = colors.red.bold(_errors.length) + colors.red(" errors.");
		var numSkips = colors.gray.bold(_skips.length) + colors.gray(" skipped.");
		var duration = (((new Date()) - _startTime) / 1000).toFixed(2);

		console.log("");
		console.log(`  =========== ${smochaFinished}  ===========`);
		console.log("");
		console.log(`  ${numPasses} ${numErrors} ${numSkips} ${duration}s`);
		console.log("");
		_errors.forEach(function(arr, i){
			var [node, error] = arr;
			var num = colors.red.bold(`(${i+1})`);
			var err = util.format(error.stack).replace(/\n/g, `\n  `);
			console.log(`  ${num}: Occurred in '${colors.bold(node.name)}'`)
			console.log(`  ----------------------------------`);
			console.log(`  ${err}`)
			console.log("");
		});
	}
	this.onFailure = function(e) {
		console.log(colors.red.bold("Smocha unexpectedly failed: "), colors.red(util.format(e)));
	}

	this.log = _log;
}

function getArgs(_arguments) {
	return Array.prototype.slice.call(_arguments);
}

module.exports = SmochaLogger;