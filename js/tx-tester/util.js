var util = require('util');

function createUtil(web3, assert){
	const BigNumber = web3.toBigNumber(0).constructor;
	
	// add .strEqual to assert.
	assert.strEqual = function(val1, val2, msg){
		if (val1 === undefined && val2 !== val1)
			throw new Error(`${msg}: value1 was undefined.`);
		if (val2 === undefined && val2 !== val1)
			throw new Error(`${msg}: value2 was undefined.`);
	    const val1str = val1.toString();
	    const val2str = val2.toString();
	    assert.equal(val1str, val2str, msg);
	}
	assert.strNotEqual = function(val1, val2, msg){
		if (val1 === undefined && val2 !== val1)
			throw new Error(`${msg}: value1 was undefined.`);
		if (val2 === undefined && val2 !== val1)
			throw new Error(`${msg}: value2 was undefined.`);
		const val1str = val1.toString();
	    const val2str = val2.toString();
	    assert.notEqual(val1str, val2str, msg);
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
				throw e;
			}
		},

		expectLog: async function(logs, eventName, args, address) {
			address = (address && address.address) ? address.address : address;
			logs = logs.filter(l => !address || l.address == address);
			if (!args) args = {};

			function validateArgs(log){
				return Promise.all(
					Object.keys(args).map(async function(key){
						const val = await _self.toPromise(args[key]);
						assert(log.args.hasOwnProperty(key), `arg '${key}' not in '${eventName}' log`);	
						if (val !== null)
							assert.strEqual(log.args[key], val, `${eventName}.args.${key}' incorrect`);
					})
				)
			}

			try {
				filteredLogs = logs.filter(l => l.event === eventName);
				if (filteredLogs.length == 0) throw new Error(`did not find any '${eventName}' event.`);
				else if (filteredLogs.length == 1) await validateArgs(filteredLogs[0]);
				else if (filteredLogs.length > 1) {
					for (var i=0; i<filteredLogs.length; i++){
						try {
							await validateArgs(filteredLogs[i]);
							return;
						} catch (e) {}
					}
					const argsStr = util.inspect(args, false, null);
					throw new Error(`Found '${eventName}' events, but none with matching args: ${argsStr}`);
				}
			} catch (e) {
				console.log(`Showing logs 1:`, util.inspect(logs, false, null))
				throw e;
			}
		},

		expectLogCount: async function(logs, num, msg) {
			try {
				msg = msg || `expected exactly ${num} logs`;
				assert.equal(num, logs.length, msg);
			} catch (e) {
				console.log("Showing logs 2:", util.inspect(logs, false, null));
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
		    	return
		        // try {
		        //     assert.include(txError.message, "invalid opcode");
		        //     return;
		        // } catch (assertError) {
		        // 	var e = new Error(`Error did not contain 'invalid opcode':\n${txError.message}`);
		        //     e.stack = txError.stack;
		        //     throw e;
		        // }
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
	        _self.mineBlocks(1);
	        
	        console.log(`Fast forwarded ${timeInSeconds} seconds`);
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

		/**
		Mines a certain number of blocks.
		In order for this to work beyond 1 block, you need to modify
		node_modules/ganache-cli/build/cli.node.js.
		*/
		mineBlocks: function(numBlocks){
			if (numBlocks===undefined) numBlocks = 1;
			if (numBlocks.toNumber) numBlocks = numBlocks.toNumber();
			if (!Number.isInteger(numBlocks))
				throw new Error(`numBlocks must be a number or BigNumber: ${numBlocks}`);
			if (numBlocks <= 0)
				throw new Error(`numBlocks must be greater than 0: ${numBlocks}`);

			const before = _self.getBlockNumber();
			var numMined = 0; var after;
			while (numMined < numBlocks) {
				web3.currentProvider.send({
		            jsonrpc: "2.0",
		            method: "evm_mine",
		            params: [numBlocks],
		            id: new Date().getTime()
		        });
		        after = _self.getBlockNumber();
		        numMined = after - before;
		        if (numBlocks > 1 && numMined == 1) {
		        	console.log(`Your version of evm_mine does not support multiple blocks!`);
		        	console.log(`This may take awhile...`);
		        }
			}
			console.log(`Mined ${numBlocks} blocks. BlockNumber increased from ${before} to ${after}.`);
		},

		// returns a regular number
		getBlockNumber: function() {
			return web3.eth.blockNumber;
		},
		getNextBlockNumber: function() {
			return (new BigNumber(web3.eth.blockNumber)).plus(1);
		},
		getBalance: function (address){
			if (address.address) address = address.address;
		    return web3.eth.getBalance(address);
		},
		getBlock: function (blockHash){
		    return web3.eth.getBlock(blockHash || 'latest');
		},
		// returns a regular number
		getBlockTime: function (blockHash){
			return _self.getBlock(blockHash || 'latest').timestamp;
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
		},

		// multiple transactions in ganache are buggy.
		// this function ensures they occur in expected order, and fixes results.
		fixTxArray: function(txs, txResArr) {
			const tx1res = txResArr[0];
            const block = web3.eth.getBlock(tx1res.receipt.blockNumber);
            expBlock = block.blockNumber;
            if (block.transactions.length != txs.length)
                throw new Error(`Block has ${block.transactions.length} txs, expected ${txs.length}.`);
            
            // ensure transactions occurred in expected order.
            txResArr.forEach((txRes, i) => {
                const hash = txRes.tx;
                if (block.transactions[i] != hash){
                    console.log("block.transactions", block.transactions);
                    console.log("txRes.txs", txResArr.map(txRes=>txRes.tx));
                    throw new Error(`Incorrect order: tx[${i}] was not in block.transactions[${i}]`);
                }
                // fix logs bug (all logs included in all receipts/logs)
                txRes.receipt.logs = txRes.receipt.logs.filter((l) => l.transactionHash == hash);
                txRes.logs = txRes.logs.filter((l) => l.transactionHash == hash);
            });
            // fix ganache bug where .gasUsed includes previous tx's gasUsed
            for (var i=txResArr.length-1; i>=0; i--){
                if (i > 0) txResArr[i].receipt.gasUsed -= txResArr[i-1].receipt.gasUsed;
            }
            console.log("All txs executed on same block, in expected order.");
		}
	}
	return _self;
}

module.exports = createUtil;