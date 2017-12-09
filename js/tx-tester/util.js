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
		expectOneLog: async function(logs, eventName, args, address) {
			try {
				await _self.expectLogCount(logs, 1);
				await _self.expectLog(logs, eventName, args, address);
			} catch (e) {
				console.log(`Showing logs:`, logs);
				throw e;
			}
		},

		expectLog: async function(logs, eventName, args, address) {
			address = (address && address.address) ? address.address : address;
			logs = logs.filter(l => !address || l.address == address);
			if (!args) args = {};

			function validateArgs(log){
				return Promise.all(Object.keys(args).map(async function(key){
					const val = await _self.toPromise(args[key]);
					assert(log.args.hasOwnProperty(key), `arg '${key}' not in '${eventName}' log`);	
					if (val !== null)
						assert.strEqual(log.args[key], val, `${eventName}.args.${key}' incorrect`);
				}))
			}

			try {
				logs = logs.filter(l => l.event === eventName);
				if (logs.length == 0) throw new Error(`did not find any '${eventName}' event.`);
				if (logs.length == 1) await validateArgs(logs[0]);
				if (logs.length > 1) {
					for (var i=0; i<logs.length; i++){
						try { await validateArgs(logs[i]); return; }
						catch (e) {}
					}
					throw new Error(`Found '${eventName}' events, but none with matching args.`)
				}
			} catch (e) {
				console.log(`Showing logs:`, logs)
				throw e;
			}
		},

		expectLogCount: async function(logs, num, msg) {
			try {
				msg = msg || `expected exactly ${num} logs`;
				assert.equal(num, logs.length, msg);
			} catch (e) {
				console.log("Showing logs:", logs);
				throw e;
			}
		},

		expectOnlyErrorLog: async function(logs, msg, address) {
			await _self.expectOneLog(logs, "Error", {msg: msg}, address);
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