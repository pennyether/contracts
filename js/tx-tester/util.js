var path = require('path');

function createUtil(web3, assert){
	// add .strEqual to assert.
	assert.strEqual = function(val1, val2, msg){
	    const additionalArgs = Array.prototype.slice.call(arguments, 2);
	    const val1str = val1.toString();
	    const val2str = val2.toString();
	    assert.equal(val1str, val2str, msg);
	}

	var _self = {
		// expects 1 log, with a specific error message.
		// note the extra address argument -- this is due to
		// a bug in web3 where it will include logs of other addresses.
		// https://github.com/ethereum/web3.js/issues/895
		expectOneLog: function(logs, eventName, args, address) {
			address = (address && address.address) ? address.address : address;
			logs = logs.filter(l => !address || l.address == address);
			if (!args) args = {};

			try {
				assert.equal(logs.length, 1, "Expected exactly 1 log");
				assert.equal(logs[0].event, eventName, `no '${eventName}' log`);
				Object.keys(args).forEach(key => {
					const val = args[key];
					assert(logs[0].args.hasOwnProperty(key), `'${key}' not in '${eventName}' log`);	
					if (val !== null)
						assert.strEqual(logs[0].args[key], args[key], `'log.args.${key}' incorrect`);
				});
			} catch (e) {
				console.log("expectOneLog failed, showing logs:", logs);
				throw e;
			}
		},

		expectLog: function(logs, eventName, args, address) {
			address = (address && address.address) ? address.address : address;
			logs = logs.filter(l => !address || l.address == address);
			if (!args) args = {};

			try {
				var found = false;
				logs.forEach(log => {
					if (found) return;
					if (log.event != eventName) return;
					found = true;
					Object.keys(args).forEach(key => {
						const val = args[key];
						assert(log.args.hasOwnProperty(key), `'${key}' not in '${eventName}' log`);	
						if (val !== null)
							assert.strEqual(log.args[key], args[key], `'log.args.${key}' incorrect`);
					});
				});
				if (!found) throw new Error(`expectLog did not find event: ${eventName} with args ${args}`);
			} catch (e) {
				console.log(`expectLog ${eventName} failed, logs are:`, logs)
				throw e;
			}
		},

		expectErrorLog: function(logs, msg, address) {
			_self.expectOneLog(logs, "Error", {msg: msg}, address);
		},

		expectInvalidOpcode: async function(txPromise){
		    try {
		        await txPromise;
		    } catch (txError) {
		        try {
		            assert.include(txError.message, "invalid opcode");
		            return;
		        } catch (assertError) {
		        	var e = new Error(`Error did not contain 'invalid opcode':\n${txError.message}`);
		            e.stack = txError.stack;
		            throw e;
		        }
		    }
		    throw new Error("This transaction call was expected to fail.");
		},

		fastForward: function (timeInSeconds){
			if (timeInSeconds.toNumber)
				timeInSeconds = timeInSeconds.toNumber();
			if (!Number.isInteger(timeInSeconds))
				throw new Error("Passed a non-number: " + timeInSeconds);
			if (timeInSeconds <= 0)
				throw new Error("Can not fastforward a negative amount: " + timeInSeconds);
			
			// move time forward.
			web3.currentProvider.send({
	            jsonrpc: "2.0",
	            method: "evm_increaseTime",
	            params: [timeInSeconds],
	            id: new Date().getTime()
	        });
			// mine a block to make sure future calls use updated time.
			web3.currentProvider.send({
	            jsonrpc: "2.0",
	            method: "evm_mine",
	            params: null,
	            id: new Date().getTime()
	        });
		},

		stopMining: function(){
			web3.currentProvider.send({
	            jsonrpc: "2.0",
	            method: "miner_stop",
	            params: null,
	            id: new Date().getTime()
	        });
		},
		startMining: function(){
			web3.currentProvider.send({
	            jsonrpc: "2.0",
	            method: "miner_start",
	            params: null,
	            id: new Date().getTime()
	        });
		},
		mineBlocks: function(numBlocks){
			if (numBlocks===undefined) numBlocks = 1;
			if (numBlocks.toNumber) numBlocks = numBlocks.toNumber();
			if (!Number.isInteger(numBlocks))
				throw new Error("Passed a non-number: " + numBlocks);

			for (var i=0; i<numBlocks; i++){
				web3.currentProvider.send({
		            jsonrpc: "2.0",
		            method: "evm_mine",
		            params: null,
		            id: new Date().getTime()
		        });
			}
		},

		getBlockNumber: function() {
			return web3.eth.blockNumber;
		},
		getBalance: function (address){
			if (address.address) address = address.address;
		    return web3.eth.getBalance(address);
		},
		getBlock: function (blockHash){
		    return web3.eth.getBlock(blockHash)
		},
		getBlockTime: function (blockHash){
			return _self.getBlock(blockHash).timestamp;
		},
		getTx: function (txHash){
		    return web3.eth.getTransaction(txHash)
		},
		getTxReceipt: function (txHash){
		    return web3.eth.getTransactionReceipt(txHash)   
		},
		getTxFee: function (txHash){
		    const tx = _self.getTx(txHash);
		    const txReceipt = _self.getTxReceipt(txHash);
		    return tx.gasPrice.mul(txReceipt.gasUsed);
		},
		getTruffleResultFromNew: function(res){
			if (!res.contract || !res.contract.transactionHash)
				throw new Error("Expected '.new()' result to have .contract and .contract.transactionHash")
			
			const contract = res;
			const txHash = res.contract.transactionHash;
			const receipt = _self.getTxReceipt(txHash);
			const blockNum = receipt.blockNumber;
			const events = res.contract.allEvents({fromBlock: blockNum, toBlock: blockNum})
			return new Promise(function(resolve, reject){
				events.get(function(err, logs){
					resolve({
						tx: txHash,
						receipt: receipt,
						logs: logs,
						contract: contract
					});
				})
			});
		},

		transfer: function(from, to, amt, txParams){
			txParams = txParams || {};
			txParams.from = from;
			txParams.to = to;
			txParams.value = amt;
			return Promise.resolve().then(() => web3.eth.sendTransaction(txParams));
		},

		toPromise: function(val) {
			const type = Object.prototype.toString.call(val);
			return type === '[object Function]' || type === '[object AsyncFunction]'
				? Promise.resolve(val())
				: Promise.resolve(val);
		}
	}
	return _self;
}

module.exports = createUtil;