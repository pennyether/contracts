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
			if (result.indexOf("SMOCHA FINISHED WITH ERRORS") !== -1) {
				console.log(`  * TEST CONTAINED ERRORS`);
			}
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
	var startTime = +new Date();
	return execute(`${testScript} ${filepath}`).then((res)=>{
		const htmlStr = (new Converter({fg: "#000"})).toHtml(res);
		saveTestResult(titleStr, htmlStr, resultfilepath);
		return (+new Date()) - startTime;
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

	const dir = path.dirname(filepath);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);
	fs.writeFileSync(filepath, html);
	return filepath;
}

function saveAllTests() {
	if (!fs.existsSync(outputDir)){
		console.log(`Creating directory: ${outputDir}`);
		fs.mkdirSync(outputDir)
	}

	const testFiles = [
		"CustodialWallet.test.js",
		"DividendToken.test.js",
		"DividendTokenLocker.test.js",
		"Treasury.test.js",
		"Comptroller.test.js",
		"Registry.test.js",
		"TaskManager.test.js",
		"games/InstaDice.test.js",
		"games/VideoPoker.test.js",
		"games/VideoPokerUtils.test.js",
		"games/MonarchyGame.test.js",
		"games/MonarchyFactory.test.js",
		"games/MonarchyController.test.js",
		"common/AddressSet.test.js",
		"common/Bankrollable.test.js",
		"common/Ledger.test.js"
	]
	var p = Promise.resolve();
	testFiles.forEach(async function(testfile){
		const testfilepath = path.join(testsDir, testfile);
		const filename = `${testfile}.html`;
		const resultfilepath = path.join(outputDir, filename);
		p = p.then(()=>{
			console.log(`=== ${testfilepath} ===`);
			return executeAndSave(testfilepath, resultfilepath);
		}).then((t)=>{
			console.log(`  * Done in ${t/1000}s`);
			console.log('');	
		});
	});

	p.then(()=>{
		const getAllFiles = dir =>
			fs.readdirSync(dir).reduce((files, file) => {
				const name = path.join(dir, file);
				const isDirectory = fs.statSync(name).isDirectory();
				return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
			}, []);

		const links = [];
		getAllFiles(outputDir).forEach(file => {
			if (file.indexOf("test.js")===-1) return;
			const href = path.relative(outputDir, file);
			const contract = href.replace(".test.js.html", ".sol");
			links.push(`<li><a href="./${href}">${contract}</a></li>`);
		});

		// todo: just create list based on existance of file
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