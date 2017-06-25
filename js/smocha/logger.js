const colors = require("colors/safe");
const util = require("util");

function SmochaLogger() {
	colors.setTheme({
		// misc
		indent: ['dim', 'gray'],
		log: ['dim','gray'],
		skipText: 'cyan',

		// states
		pass: 'green',
		fail: 'red',
		skip: [],

		// types
		file: 'bold',
		describe: ['bold'],
		it: [],
		before: ['dim'],
		after: ['dim'],
		beforeEach: [],
		afterEach: [],

		// overrides
		'describe.encountered': ['bold', 'black'],
		'file.encountered': ['bold', 'magenta'],
		'it.encountered': []
	});
	const _consoleLog = console.log;
	var _startTime;
	const _passes = [];
	const _errors = [];
	const _skips = [];

	const _logOnEncounter = new Set(['describe', 'file', 'it']);
	const _logOnRunPass = new Set(['it', 'before', 'after']);

	// print args with indent.
	function _log(indents, args, colorize, doExtraIndent) {
		const lastMarker = doExtraIndent ? "└ " : "├ ";
		indents = indents + (doExtraIndent ? 1 : 0);
		var indent = (new Array(indents)).join("│  ") + lastMarker;
		indent = colors.indent(indent);

		args = args || [];
		args = args.map((arg) => {
			const argStr = util.format(arg).replace(/\n/g, `\n${indent}`);
			return colorize ? colors.log(argStr) : argStr;
		});
		args.unshift(indent);
		_consoleLog.apply(null, args);		
	}

	// prints arg[0] stylized using $type.$state or $state then $type
	function _logType(node, state, args, doExtraIndent) {
		if (node.type == "root") return;
		if (!args || !args.length) return;

		// convert the first arg to a string, and colorize it.
		var str = args[0].toString();
		if (colors[`${node.type}.${state}`]){
			str = colors[`${node.type}.${state}`](str);
		} else {
			if (colors[state]) { str = colors[state](str); }
			if (colors[node.type]) { str = colors[node.type](str); }
		}
		args[0] = str;
		_log(node.getParents().length, args, false, doExtraIndent);
	}

	// stats ///////////////////////
	function _addPass(node) {
		_passes.push(node);
	}
	function _addError(node, error) {
		_errors.push([node, error]);
		const errNumStr = colors.red.bold(`(${_errors.length})`);
		const trimmedMsg = error.message.length > 50
			? error.message.substr(0, 50) + "..."
			: error.message;
		const errMsgStr = `[${trimmedMsg}]`;
		return [errNumStr, errMsgStr];
	}
	function _addSkip(node) {
		_skips.push(node);
	}

	this.onSkip = function(node) {
		_addSkip(node);
		_logType(node, "skip", [`${node.name}`, colors.skipText(`(skipped: ${node.skipReason})`)]);
	}

	this.onEncounter = function(node) {
		if (!_logOnEncounter.has(node.type)) return;
		_logType(node, "encountered", [`${node.name}`]);
	}
	this.onInitialRunPass = function(node) {
		if (!_logOnRunPass.has(node.type)) return;
		if (node.type == "it") _addPass(node);
		if (_logOnEncounter.has(node.type)) {
			_logType(node, "pass", [`✓ passed (${node.runTime} ms)`], true);
		} else {
			_logType(node, "pass", [`✓ ${node.name} (${node.runTime} ms)`]);
		}
	}
	this.onInitialRunFail = function(node) {
		const [errNumStr, errMsgStr] = _addError(node, node.runError);
		if (_logOnEncounter.has(node.type)) {
			_logType(node, "fail", [`${errNumStr} ${errMsgStr}`], true);
		} else {
			_logType(node, "fail", [`${errNumStr} ${node.name}`, errMsgStr]);
		}
	}
	// if we logged it already, then log with an extra indent
	// otherwise, just log the whole thing using .onSkip
	this.onSkipDuringInitialRun = function(node) {
		if (_logOnEncounter.has(node.type)) {
			_logType(node, "skip", [colors.skipText(`skipped: ${node.skipReason}`)], true);
			_addSkip(node);
		} else {
			this.onSkip(node);
		}
	}

	this.onQueuePass = function(node) {
		// we don't really care about this
	}
	// this should only happen on before -- all other errors should be handled
	this.onQueueFail = function(node) {
		// if (_logOnEncounter.has(node.type)) {
		// 	const str = colors.indent('└') + " " + colors.fail("Skipped children tasks because something threw");
		// 	_log(node.getParents().length, [str]);
		// }
		// else console.log("FILL THIS IN NOW");
	}

	this.onStart = function() {
		process.on('unhandledRejection', function(reason, p){
		    console.log(colors.red.bold("Unhandled Rejection:\n"), colors.red(util.format(reason)));
		});
		_startTime = +(new Date());
		const smochaStarting = colors.black.bold.inverse(" SMOCHA STARTING ");
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

		const smochaFinished = statusColorize(" SMOCHA FINISHED ");
		const numPasses = colors.green.bold(_passes.length) + colors.green(" passed.");
		const numErrors = colors.red.bold(_errors.length) + colors.red(" errors.");
		const numSkips = colors.gray.bold(_skips.length) + colors.gray(" skipped.");
		const duration = (((new Date()) - _startTime) / 1000).toFixed(2);

		console.log("");
		console.log(`  =========== ${smochaFinished}  ===========`);
		console.log("");
		console.log(`  ${numPasses} ${numErrors} ${numSkips} ${duration}s`);
		console.log("");
		_errors.forEach(function(arr, i){
			const [node, error] = arr;
			const nodeStr = colors.bold(node.name);
			const numStr = colors.red.bold(`(${i+1})`);
			const errStr = util.format(error.stack).replace(/\n/g, `\n  `);
			console.log(`  ${numStr}: Occurred in '${nodeStr}'`)
			console.log(`  ----------------------------------`);
			console.log(`  ${errStr}`)
			console.log("");
		});
	}
	this.onFailure = function(e) {
		console.log(colors.red.bold("Smocha unexpectedly failed: "), colors.red(util.format(e)));
	}

	this.log = function(node, args){
		_log(node.getParents().length + 1, args, true);
	}
}

function getArgs(_arguments) {
	return Array.prototype.slice.call(_arguments);
}

module.exports = SmochaLogger;