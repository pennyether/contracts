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
		before: [],
		after: [],
		beforeEach: [],
		afterEach: [],

		// overrides
		'describe.pass': ['bold', 'black'],
		'describe.fail': ['bold', 'red'],
	});
	const _consoleLog = console.log;

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

	this.log = _log;

	this.onBeforeInitialRun = function(node) {
		if (node.type == "describe") {
			_logType(node, "pass", [`${node.name}`]);
		}
	}
	this.onInitialRunPass = function(node) {
		if (node.type == "describe"
			|| node.type == "beforeEach"
			|| node.type == "afterEach") { return; }
		_logType(node, "pass", [`${node.name}`]);
	}
	this.onInitialRunFail = function(node) {
		if (node.type == "describe") {
			var str = colors.indent('└') + " " + colors.fail("Skipped children tasks (describe failed)");
			_log(node, [str, node.runError]);
			return;
		}
		_logType(node, "fail", [`${node.name}`, node.runError]);
	}
	this.onQueuePass = function(node) {
		//console.log(`${_curNode.getName()}: queue complete. Setting _curNode to ${_curNode.getParentName()}`);
		//var args = getArgs(arguments);
		//loggers[`${_curNode.type}.pass`].apply(null, [`${_curNode.name} - queue pass`].concat(args));
	}
	this.onQueueFail = function(node) {
		var str = colors.indent('└') + " " + colors.fail("Skipped children tasks (before failed)");
		_log(node, [str]);
	}
	this.onBeforeFail = function (node) {
		//console.log("Before failed.");
	}
	this.onSkip = function(node) {
		_logType(node, "skip", [`${node.name}`, colors.dim('(skipped)')]);
	}


	this.log = _log;
}

function getArgs(_arguments) {
	return Array.prototype.slice.call(_arguments);
}

module.exports = SmochaLogger;