#!/usr/bin/env node
const generateInterface = require('generate-contract-interface');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

const contractsDir = __dirname + "/contracts";
if (!fs.lstatSync(contractsDir).isDirectory()){
	throw new Error("Please run this from the truffle root directory.");
}

function findInDirectory(dir, extension, callback){
	
   
    if (!fs.existsSync(dir)){
        throw new Error(`No such path: ${dir}`);
    }

    var files = fs.readdirSync(dir);
    var dirs = [];
    files.forEach(file => {
    	var filename = path.join(dir, file);
    	var stat = fs.lstatSync(filename);
    	if (stat.isDirectory()) dirs.push(filename);
    	if (filename.toLowerCase().endsWith(extension.toLowerCase())) callback(filename);
    });

    dirs.forEach(dir => {
    	findInDirectory(dir, extension, callback);
    });
};

findInDirectory(contractsDir, ".sol", solFile => {
	var lines = fs.readFileSync(solFile, 'utf-8')
    	.split('\n')
    	.filter(Boolean);

    var pragma;
    var firstLine;
    var remaining;
    for (var i=0; i<lines.length; i++){
    	var line = lines[i].trim().toLowerCase();
    	if (line.startsWith("pragma")){
    		pragma = line;
    	} else if (line.startsWith("//@createinterface")) {
    		firstLine = lines[i+1];
    		remaining = lines.slice(i).join("\n");
    		break;
    	}
    }

    if (remaining){
    	if (!pragma){
    		throw new Error("No pragma found for " + solFile);
    	}
    	var interfaceName = "I" + firstLine.split(" ").map(w => w.trim()).filter(w => w.length>0)[1];
        var interfaceFilename = contractsDir + "/interfaces/" + interfaceName + ".sol";

        // if interface exists, check for @dontRegenerate flag on resultant file
        try {
            var lines = fs.readFileSync(interfaceFilename, 'utf-8')
                .split('\n')
                .filter(Boolean);
            for (var i=0; i<lines.length; i++){
                var line = lines[i].trim().toLowerCase();
                if (line.startsWith("//@dontregenerate")){
                    console.log(`Skipping ${solFile} because ${interfaceFilename} has @dontRegenerate`);
                    return;
                }
            }
        } catch (e) {}

        try {
            var interface = generateInterface(remaining);
            interface = `${pragma}\ncontract ${interfaceName} {\n` + interface.split("\n").slice(1).join("\n");
        } catch (e){
            console.log("WARNING - COULD NOT PARSE " + solFile);
            console.log(e);
            return;
        }
        
        try {
            generateInterface(interface);
        } catch (e) {
            console.log("WARNING - COULD NOT CREATE VALID INTEFACE FOR " + solFile );
            console.log("The resultant interface was not valid.  You are probably using weird syntax.");
            console.log("\nResultant interface:\n", interface);
            console.log("\n\n");
            return;
        }

        mkdirp(contractsDir + "/interfaces");
    	console.log(`Saving interface to ${path.relative(__dirname, interfaceFilename)}...`);
    	fs.writeFileSync(interfaceFilename, interface);
    }

	// find "// @createInterface", find the pragma, then generate the interface
});

// go through each .sol file, search for // @createInterface

// when found, generate the interface and save it in the corresponding /interfaces/ directory
