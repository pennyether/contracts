const chalk = require("chalk");
const util = require("util");

function SmochaLogger() {
	const _self = this;

	const theme = {
		// misc
		indent: chalk.hex("#BBB"),
		log: chalk.hex("#BBB"),
		skipText: chalk.dim.cyan,
		info: chalk.reset.italic.gray,
		warn: chalk.reset.italic.red,

		// states
		pass: chalk.green,
		fail: chalk.red,
		skip: chalk,

		// types
		file: chalk.bold,
		describe: chalk.bold,
		it: chalk,
		before: chalk,
		after: chalk,
		beforeEach: chalk,
		afterEach: chalk,

		// overrides
		'describe.encountered': chalk.bold.black,
		'file.encoutered': chalk.bold.magenta,
		'it.encountered': chalk
	}
	
	const _consoleLog = console.log;
	var _startTime;
	const _passes = [];
	const _errors = [];
	const _skips = [];

	const _logOnEncounter = new Set(['describe', 'file', 'it', 'before']);
	const _logOnRunPass = new Set(['it', 'before', 'after']);

	this.silence = false;

	// print args with indent.
	function _log(indents, args, doExtraIndent, isLast) {
		const lastMarker = isLast ? "└ " : "├ ";
		const indent = theme.indent((new Array(indents)).join("│  ") + lastMarker);
		const indent2 = theme.indent((new Array(indents)).join("│  ") + "   ");

		args = args || [];
		args = args.map((arg) => {
			return util.format(arg).replace(/\n/g, `\n${indent2}`);
		});
		args.unshift(indent);
		args.push(chalk.reset(' '));
		_consoleLog.apply(null, args);		
	}

	// prints args stylized using $type.$state or $state then $type
	function _logType(node, state, args, doExtraIndent, isLast) {
		if (node.type == "root") return;
		if (!args || !args.length) return;

		args = args.map(arg=>{
			var str = util.format(arg);
			if (theme[`${node.type}.${state}`]){
				str = theme[`${node.type}.${state}`](str);
			} else {
				if (theme[state]) { str = theme[state](str); }
				if (theme[node.type]) { str = theme[node.type](str); }
			}
			return str;
		});

		_log(node.getParents().length + (doExtraIndent ? 1 : 0), args, false, isLast);
	}

	// stats ///////////////////////
	function _addPass(node) {
		_passes.push(node);
	}
	function _addError(node, error) {
		_errors.push([node, error]);
		const errNumStr = chalk.red.bold(`(${_errors.length})`);
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
		_logType(node, "skip", [`${node.name}`, theme.skipText(`(skipped: ${node.skipReason})`)]);
	}

	this.onEncounter = function(node) {
		if (!_logOnEncounter.has(node.type)) return;
		_logType(node, "encountered", [`${node.name}`]);
	}
	this.onInitialRunPass = function(node) {
		if (!_logOnRunPass.has(node.type)) return;
		if (node.type == "it") _addPass(node);
		if (_logOnEncounter.has(node.type)) {
			_logType(node, "pass", [`✓ passed (${node.runTime} ms)`], true, true);
		} else {
			_logType(node, "pass", [`✓ ${node.name} (${node.runTime} ms)`]);
		}
	}
	this.onInitialRunFail = function(node) {
		const [errNumStr, errMsgStr] = _addError(node, node.runError);
		if (_logOnEncounter.has(node.type)) {
			_logType(node, "fail", [`${errNumStr} ${errMsgStr}`], true, true);
		} else {
			_logType(node, "fail", [`${errNumStr} ${node.name}`, errMsgStr]);
		}
	}
	// if we logged it already, then log with an extra indent
	// otherwise, just log the whole thing using .onSkip
	this.onSkipDuringInitialRun = function(node) {
		if (_logOnEncounter.has(node.type)) {
			_logType(node, "skip", [theme.skipText(`skipped: ${node.skipReason}`)], true, true);
			_addSkip(node);
		} else {
			this.onSkip(node);
		}
	}

	this.onQueuePass = function(node) {
		// we don't really care about this
	}
	this.onQueueFail = function(node) {
		// this is logged already	
	}

	this.onStart = function() {
		process.on('unhandledRejection', function(reason, p){
		    console.log(chalk.red.bold("Unhandled Rejection:\n"), chalk.red(util.format(reason)));
		});
		_startTime = +(new Date());
		const smochaStarting = chalk.black.bold.inverse(" SMOCHA STARTING ");
		console.log("");
		console.log("  ========================================= ")
		console.log(`  =========== ${smochaStarting} ===========`);
		console.log("  ========================================= ");
		console.log("");
	}
	this.onComplete = function() {
		var statusColorize;
		if (_errors.length) statusColorize = chalk.red.bold.inverse;
		else if (_skips.length) statusColorize = chalk.gray.bold.inverse;
		else statusColorize = chalk.green.bold.inverse;

		const finishStr = _errors.length ? "SMOCHA FINISHED WITH ERRORS" : "SMOCHA FINISHED SUCCESSFULLY";
		const smochaFinished = statusColorize(` ${finishStr} `);
		const numPasses = chalk.green.bold(_passes.length) + chalk.green(" passed.");
		const numErrors = chalk.red.bold(_errors.length) + chalk.red(" errors.");
		const numSkips = chalk.gray.bold(_skips.length) + chalk.gray(" skipped.");
		const duration = (((new Date()) - _startTime) / 1000).toFixed(2);

		console.log("");
		console.log(`  =========== ${smochaFinished} ===========`);
		console.log("");
		console.log(`  ${numPasses} ${numErrors} ${numSkips} ${duration}s`);
		console.log("");
		_errors.forEach(function(arr, i){
			const [node, error] = arr;
			const nodeStr = chalk.bold(node.name);
			const numStr = chalk.red.bold(`(${i+1})`);
			const errStr = util.format(error.stack).replace(/\n/g, `\n  `);
			console.log(`  ${numStr}: Occurred in '${nodeStr}'`)
			console.log(`  ----------------------------------`);
			console.log(`  ${errStr}`)
			console.log("");
		});
	}
	this.onFailure = function(e) {
		console.log(chalk.red.bold("Smocha unexpectedly failed: "), chalk.red(util.format(e)));
	}

	this.log = function(node, args){
		if (_self.silence) return;
		_logType(node, "log", args, true);
	}
	this.logInfo = function(node, str){
		if (_self.silence) return;
		_logType(node, "info", [str], true);
	}
	this.logWarn = function(node, str){
		if (_self.silence) return;
		_logType(node, "warn", [str], true);
	}
}

function getArgs(_arguments) {
	return Array.prototype.slice.call(_arguments);
}

module.exports = SmochaLogger;