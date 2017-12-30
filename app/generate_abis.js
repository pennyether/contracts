#!/usr/bin/env node

/**
Looks in ../build/contracts and plucks out ABIs and binary data.
Stores them in an object where the key is the contract name.
Only looks for certain ABIs.
*/
const fs = require('fs');
const path = require('path');

const buildDir = __dirname + "/../build/contracts";
if (!fs.lstatSync(buildDir).isDirectory()){
	throw new Error("Please run this from the directory in which it exists.");
}

var result = {};
var filenames = [
    "Comptroller.json",
    "CustodialWallet.json",
    "DividendToken.json",
    "DividendTokenLocker.json",
    "InstaDice.json",
    "MainController.json",
    "PennyAuction.json",
    "PennyAuctionController.json",
    "PennyAuctionFactory.json",
    "Registry.json",
    "Treasury.json",
];
filenames.forEach((filename)=>{
    const fullpath = `${buildDir}/${filename}`;
    if (!fs.existsSync(fullpath)) {
        throw new Error(`Couldn't find ${fullpath}`);
    }
    var obj = JSON.parse(fs.readFileSync(fullpath))
    result[filename.slice(0, -5)] = {
        "abi": obj.abi,
        "unlinked_binary": obj.unlinked_binary
    };
});

const json = JSON.stringify(result, null, 2);
const fileout = __dirname + "/dist/javascripts/lib/ABIs.js";
const str = 
`(function(){
    window.ABIs = ${json}
}());`;

fs.writeFile(fileout, str, function(err) {
    if(err) { return console.error(err); }
    console.log(`Saved to ${fileout}.`);
}); 
