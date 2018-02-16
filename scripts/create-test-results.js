#!/usr/bin/env node
/*
Populates the ../test/results directory with index.html and resultant .html files.
*/
const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;
const Converter = require('ansi-to-html');

const rootDir = path.join(__dirname, "..");
const testsDir = path.join(rootDir, "tests");
const outputDir = path.join(testsDir, "results");
const testScript = path.join(path.join(rootDir, "scripts"), "test.js");

function execute(command){
	return new Promise((res,rej)=>{
		process.env.FORCE_COLOR = true;
		console.log(`  * Executing ${command}...`);
		const s = spawnSync(command, {shell: true, env: process.env});
		if (!s.code) {
			const result = s.stdout.toString();
			console.log(`  * Execution successful.`);
			res(result);
		} else {
			const result = s.stderr.toString();
			console.log(`  * Execution failed.`);
			rej(result);
		}
	});
};

function executeAndSave(filepath, resultfilepath) {
	const filename = path.relative(rootDir, filepath);
	const titleStr = `Test results for: ${filename}`;
	return execute(`${testScript} ${filepath}`).then((res)=>{
		const htmlStr = (new Converter({fg: "#000"})).toHtml(res);
		saveTestResult(titleStr, htmlStr, resultfilepath);
	}).catch((e)=>{
		saveTestResult(titleStr, e.toString(), resultfilepath);
	});
}

function saveTestResult(titleStr, htmlStr, filepath) {
	const html = `
<html>
	<head>
		<title>${titleStr}</title>
		<style>
			body {
				background: #FFF;
				padding: 10px;
			}
			pre {
				font-family: Consolas, 'Courier New';
				font-size: 75%;
			}
		</style>
	</head>
	<body>
		<h1>${titleStr}</h1>
		<pre>${htmlStr}</pre>
	</body>
</html>
`;
	console.log(`  * Saving result to ${filepath}...`);
	fs.writeFileSync(filepath, html);
	return filepath;
}

function saveAllTests() {
	if (!fs.existsSync(outputDir)){
		console.log(`Creating directory: ${outputDir}`);
		fs.mkdirSync(outputDir)
	}

	const links = [];
	const testFiles = [
		"CustodialWallet.js",
		"DividendToken.js",
		"DividendTokenLocker.js",
		"Treasury.js",
		"Comptroller.js",
		"MainController.js",
		"InstaDice.js",
		"PennyAuction.js",
		"PennyAuctionFactory.js",
		"PennyAuctionController.js",
	]
	var p = Promise.resolve();
	testFiles.forEach(async function(testfile){
		const testfilepath = path.join(testsDir, testfile);
		const filename = path.basename(testfile) + ".html";
		const resultfilepath = path.join(outputDir, filename);
		p = p.then(()=>{
				console.log(`=== ${testfilepath} ===`);
				executeAndSave(testfilepath, resultfilepath)
			}).then(()=>{
				console.log('  * Done');
				links.push(`<li><a href="./${filename}">${filename}</a></li>`);	
			});
	});

	p.then(()=>{
		console.log("Saving index.html...");
		const html = `
			<html>
				<head>
					<title>PennyEther Contract Test Results</title>
				</head>
				<body style='padding: 20px;'>
					<ul>
					${links.join("\n")}
					</ul>
				</body>
			</html>
		`
		const indexFilename = path.join(outputDir, "index.html");
		fs.writeFileSync(indexFilename, html);
		console.log("All done!");
	});
}

saveAllTests();