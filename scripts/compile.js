#!/usr/bin/env node

/*
Compiles everything in the /contracts folder
Saves to /build:
	- A json file for each Contract definition with:
		.name
		.abi
		.byteCode
		.metadata [see: https://github.com/ethereum/wiki/wiki/Ethereum-Natural-Specification-Format]
*/
const path = require("path");
const fs = require("fs");

// just some dumb options for printing compilation results.
const options = {
	showAbiLength: false,
	showGasEstimates: false
}

const contractDir = path.join(__dirname, "../contracts");
const buildDir = path.join(__dirname, "../build");
if (!fs.lstatSync(contractDir).isDirectory()){
	throw new Error(`Could not find contractDir at: ${contractDir}`);
}
if (!fs.lstatSync(buildDir).isDirectory()){
	throw new Error(`Could not find buildDir at: ${buildDir}`);
}

// Recursively searches a directory for .sol files.
// Returns a mapping of {filename.sol: [fullpath1, fullpath2]}
const solFilepaths = 
	(function getAllSolFilepaths(dir, arr) {
		arr = arr || [];
		if (!fs.statSync(dir).isDirectory())
			throw new Error(`${dir} is not a directory.`);

		fs.readdirSync(dir).forEach(file=>{
			const filepath = path.join(dir, file);
			if (fs.statSync(filepath).isDirectory()){
				return getAllSolFilepaths(filepath, arr);
			}
			if (filepath.toLowerCase().endsWith(".sol")) {
				arr.push(filepath);
			}
		})
		return arr;
	}(contractDir));


function compile(solFilepaths) {
	const sources = {};
	solFilepaths.map(filepath=>{
		console.log(`Will compile ${filepath}...`);
		return sources[filepath] = {content: fs.readFileSync(filepath).toString()};
	});
	const solc = require("solc");
	const outputs = ["abi","evm.bytecode.object"];
	if (options.showGasEstimates) outputs.push("evm.gasEstimates");

	const solcInput = {
		language: "Solidity",
		sources: sources,
		settings: {
			optimizer: {
				enabled: true,
				runs: 200
			},
			outputSelection: {
				// all sources
				"*": {
					// all contracts
					"*": outputs
				}
			}
		}
	}
	console.log(`Compiling...`);
	result = JSON.parse(solc.compileStandard(JSON.stringify(solcInput), function(filepath){
		return {contents: fs.readFileSync(filepath).toString()};
	}));

	console.log(`solc complete.`);
	handleResult(result);
};

function handleResult(result){
	function printError(err){
		if (err.formattedMessage){
			console.log(err.formattedMessage);
			return;
		}
		if (err.sourceLocation){
			const sl = err.sourceLocation;
			console.log(`In file: ${sl.file}, start: ${sl.start}, end: ${sl.end}`);
		}
		console.log(`Solc ${err.type} (${err.component}): ${err.severity} - ${err.message}`);
	}
	function saveFile(str, path){
		
	}

	if (result.errors){
		const errors = result.errors.filter(x=>x.severity=="error");
		const warnings = result.errors.filter(x=>x.severity=="warning");
		if (errors.length){
			console.log(`!! solc errored out !!`);
			errors.forEach(printError);
			return;
		}
		if (warnings.length){
			console.log(`\nsolc gave some errors:\n`);
			warnings.forEach(printError);
		}
	}

	Object.entries(result.contracts).forEach(entry=>{
		const [filepath, contracts] = entry;
		console.log(`Found ${Object.keys(contracts).length} contracts within ${filepath}...`);
		Object.entries(contracts).forEach(entry=>{
			const [name, obj] = entry;
			const json = {
				abi: obj.abi,
				unlinked_binary: obj.evm.bytecode.object
			};
			const filepath = path.join(buildDir, `${name}.json`);
			console.log(`  * Saving ${filepath}...`);
			fs.writeFileSync(filepath, JSON.stringify(json, null, 2));

			if (options.showAbiLength) {
				console.log(`  - Abi has ${obj.abi.length} entries.`);
			}
			if (options.showGasEstimates && obj.evm.gasEstimates) {
				Object.entries(obj.evm.gasEstimates).forEach(entry=>{
					const [name, values] = entry;
					Object.entries(values).forEach(entry=>{
						const [key, val] = entry;
						console.log(`  - ${name}.${key}: ${val}`);
					})
				});
			}
		});
	});
	console.log(`\nAll done.`);
}

compile(solFilepaths);