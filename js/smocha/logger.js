const colors = require("colors/safe");
const util = require("util");

function SmochaLogger() {
	colors.setTheme({
		// misc
		indent: ['dim', 'gray'],
		log: 'yellow',

		// states
		pass: 'green',
		fail: 'red',
		skip: 'gray',

		// types
		file: 'bold',
		describe: ['bold'],
		before: ['dim'],
		after: ['dim'],
		beforeEach: [],
		afterEach: [],

		// overrides
		'describe.encountered': ['bold', 'black'],
		'file.encountered': ['bold', 'cyan']
	});
	const _consoleLog = console.log;
	var _startTime;
	const _passes = [];
	const _errors = [];
	const _skips = [];

	// print args with indent.
	function _log(node, args, colorize) {
		args = args || [];
		var indent = (new Array(node.getParents().length)).join("│  ") + "├ ";
		indent = colors.indent(indent);
		args = args.map((arg) => {
			const argStr = util.format(arg).replace(/\n/g, `\n${indent}`);
			return colorize ? colors.log(argStr) : argStr;
		});
		args.unshift(indent);
		_consoleLog.apply(null, args);		
	}

	// prints arg[0] stylized using $type.$state or $state then $type
	function _logType(node, state, args) {
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
		_log(node, args);
	}

	// stats ///////////////////////
	function _addPass(node) {
		_passes.push(node);
	}
	function _addError(node, error) {
		_errors.push([node, error]);
		const errNumStr = colors.red.bold(`(${_errors.length})`);
		const trimmedMsg = error.message.length > 40
			? error.message.substr(0, 40) + "..."
			: error.message;
		const errMsgStr = colors.gray(`[${trimmedMsg}]`);
		return [errNumStr, errMsgStr];
	}
	function _addSkip(node) {
		_skips.push(node);
	}

	this.onBeforeInitialRun = function(node) {
		if (node.type == "describe" || node.type == "file") {
			_logType(node, "encountered", [`${node.name}`]);
		}
	}
	this.onInitialRunPass = function(node) {
		if (node.type == "describe"
			|| node.type == "file"
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
		const [errNumStr, errMsgStr] = _addError(node, node.runError);
		if (node.type == "describe" || node.type == "file") {
			const note = colors.fail(`Skipped children tasks because '${node.type}' threw`);
			_log(node, [colors.indent('└'), errNumStr, note, errMsgStr]);
		} else {
			_logType(node, "fail", [`${errNumStr} ${node.name}`, errMsgStr]);	
		}
		
	}
	this.onQueuePass = function(node) {
		// we don't really care about this
	}
	// this should only happen on before -- all other errors should be handled
	this.onQueueFail = function(node) {
		const str = colors.indent('└') + " " + colors.fail("Skipped children tasks because 'before' threw");
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
		_log(node, args, true);
	}
}

function getArgs(_arguments) {
	return Array.prototype.slice.call(_arguments);
}

module.exports = SmochaLogger;