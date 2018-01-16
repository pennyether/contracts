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
if (!fs.existsSync(outputDir)){
	console.log(`Creating directory: ${outputDir}`);
	fs.mkdirSync(outputDir)
}

function execute(command){
	return new Promise((res,rej)=>{
		process.env.FORCE_COLOR = true;
		console.log(`Executing ${command}...`);
		const s = spawnSync(command, {shell: true, env: process.env});
		if (!s.code) res(s.stdout.toString());
		else rej(s.stderr.toString());
	});
};

function saveHtmlForFile(filename) {
	const filepath = path.join(testsDir, filename);	
	return execute(`./test.js ${filepath}`).then((res)=>{
		console.log("Got result:", res);
		const testHtml = (new Converter({fg: "#000"})).toHtml(res);
		saveTestResult(filename, testHtml);
	}).catch((e)=>{
		console.log("Something failed", e);
		saveTestResult(filename, e.toString());
	});
}

function saveTestResult(filename, testHtml) {
	const html = `
<html>
	<head>
		<title>Test results for: ${filename}</title>
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
		<pre>${testHtml}</pre>
	</body>
</html>
`;
	const filepath = path.join(outputDir, `${filename}.html`);
	console.log(`Saving result of ${filename} to ${filepath}...`);
	fs.writeFileSync(filepath, html);
}

saveHtmlForFile("PennyAuctionFactory.js").then(function(){
	console.log("Done");
});