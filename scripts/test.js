#!/usr/bin/env node

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const assert = require("chai").assert;
const contract = require("truffle-contract");
const path = require("path");
const fs = require("fs");
const Smocha = require("./js/smocha/smocha");

const contractsDir = path.join(__dirname, "build", "contracts");

if (!web3.isConnected())
	throw new Error(`Web3 not connected. Ensure ganache is running on localhost:8545.`);

global["assert"] = assert;
global["web3"] = web3;
global["artifacts"] = {
	require: function(str) {
		if (str.endsWith(".sol")) str = str.slice(0,-4);
		const filename = path.join(contractsDir, `${str}.json`);
		if (!fs.existsSync(filename)){
			throw new Error(`Couldn't load artifact for ${str}: ${filename} doesn't exist.`);
		} else {
			const json = fs.readFileSync(filename).toString();
			const obj = JSON.parse(json);
			const tContract = contract({
				abi: obj.abi,
				unlinked_binary: obj.unlinked_binary,
				gas: 5000000
			});
			tContract.defaults({ gas: 5000000, gasPrice: 2e12 });
			tContract.setProvider(web3.currentProvider);
			return tContract;
		}
	}
};

// recursively gets all files matching an extension
function getAllFiles(dir, ext, arr){
	ext = ext.toLowerCase();
	if (!arr) arr = [];
	if (!fs.statSync(dir).isDirectory())
		throw new Error(`${dir} is not a directory.`);

	fs.readdirSync(dir).forEach(file=>{
		const filepath = path.join(dir, file);
		if (fs.statSync(filepath).isDirectory()){
			return getAllTestFiles(filepath, ext, arr);
		}
		if (filepath.toLowerCase().endsWith(ext)) {
			arr.push(filepath);
		}
	});
	return arr;
}


if (!process.argv[2])
	throw new Error("Please provide a filename, or 'all'.");

const smocha = new Smocha();
const files = process.argv.slice(2);
if (files[0] === 'all'){
	const testDir = path.join(__dirname, "test");
	const jsFiles = getAllFiles(testDir, ".js");
	console.log(`Found ${jsFiles.length} .js files in ${testDir}.`);
	jsFiles.forEach((file)=>{ smocha.file(file); });
} else {
	files.forEach((file)=>{ smocha.file(file); });
}
smocha.start();