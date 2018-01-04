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

const comments = {
    MainController: {
        startPennyAuction: `Starts a pre-defined Penny Auction for a given index, \
provided it can be started. On success, rewards the caller.`,
        refreshPennyAuctions: `For each active auction, will send the collected fees \
to the Treasury. For any auction that has ended, will pay the winner and move \
the auction to the endedAuctions array. Rewards the caller with a percentage \
of the fees collected, as well as a fixed amount per auction ended.`,
        setPennyAuctionRewards: `Changes the rewards paid for .startPennyAuction() and \
.refreshPennyAuctions()`
    },
    PennyAuction: {
        fallback: `Places a bid on a Penny Auction. Refunds the bid if for any reason sender \
is not set to the currentWinner.`
    }
};

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

// only pluck out the requested contracts
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

// inject comments into functions
Object.keys(comments).forEach((cName)=>{
    const abi = result[cName].abi;
    if (!abi){
        console.log(`Comment defined for ${cName}, but no ABI found.`);
        return;
    }
    const fnComments = comments[cName];
    Object.keys(fnComments).forEach((fnName)=>{
        const fDef = abi.find((def)=>
            fnName=="fallback" ? def.type=="fallback" : (def.type=="function" && def.name==fnName)
        );
        if (!fDef){
            console.log(`Comment defined for ${cName}.${fnName}, but no such function defined in ABI.`);
            return;
        }
        fDef.comment = fnComments[fnName];
        console.log(`Added comment for ${cName}.${fnName}`);
    });
});
//console.log(result["MainController"].abi);

// create .JSON file
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
