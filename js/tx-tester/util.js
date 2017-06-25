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
		expectOneLog: async function expectOneLog(promise, eventName, args, address) {
			return await Promise.resolve(promise).then(res => {
				const logs = res.logs.filter(l => !address || l.address == address);
				assert.equal(logs.length, 1, "Expected exactly 1 log");
				assert.equal(logs[0].event, eventName, `no '${eventName}' log`);
				Object.keys(args).forEach(key => {
					const val = args[key];
					assert(logs[0].args.hasOwnProperty(key), `'${key}' not in '${eventName}' log`);	
					if (val !== null)
						assert.strEqual(logs[0].args[key], args[key], `'log.args.${key}' incorrect`);
				});
				return res;
			});
		},

		expectErrorLog: async function expectedErrorLog(promise, msg, address) {
			return await _self.expectOneLog(promise, "Error", {msg: msg}, address);
		},

		expectInvalidOpcode: async function expectInvalidOpcode(promise){
		    try {
		        await promise;
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

		fastForward: function fastForward(timeInSeconds){
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

		getBalance: function getBalance(address){
			if (address.address) address = address.address;
		    return web3.eth.getBalance(address);
		},
		getBlock: function getBlock(blockHash){
		    return web3.eth.getBlock(blockHash)
		},
		getBlockTime: function getBlockTime(blockHash){
			return _self.getBlock(blockHash).timestamp;
		},
		getTx: function getTx(txHash){
		    return web3.eth.getTransaction(txHash)
		},
		getTxReceipt: function getTxReceipt(txHash){
		    return web3.eth.getTransactionReceipt(txHash)   
		},
		getTxFee: function getTxFee(txHash){
		    const tx = _self.getTx(txHash);
		    const txReceipt = _self.getTxReceipt(txHash);
		    return tx.gasPrice.mul(txReceipt.gasUsed);
		},

		transfer: function(from, to, amt, txParams){
			txParams = txParams || {};
			txParams.from = from;
			txParams.to = to;
			txParams.value = amt;
			return Promise.resolve().then(() => web3.eth.sendTransaction(txParams));
		}
	}
	return _self;
}

module.exports = createUtil;