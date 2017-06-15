var path = require('path');
var Ledger = require("./ledger");

function MakeTestUtil(web3, assert){
	// add .strEqual to assert.
	assert.strEqual = function(val1, val2){
	    var additionalArgs = Array.prototype.slice.call(arguments, 2);
	    val1 = val1.toString();
	    val2 = val2.toString();
	    assert.equal.apply(assert.equal, [val1.toString(), val2.toString()].concat(additionalArgs));
	}

	var _self = {
		Ledger: Ledger.bind(null, web3),

		expectInvalidOpcode: async function expectInvalidOpcode(promise){
		    try {
		        await promise;
		    } catch (txError) {
		        try {
		            assert.include(txError.message, "invalid opcode", "Error contains 'invalid opcode'");
		            return;
		        } catch (assertError) {
		            assertError.message = "Error did not contain 'invalid opcode':\n" + txError.message;
		            throw assertError;
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
		    var tx = _self.getTx(txHash);
		    var txReceipt = _self.getTxReceipt(txHash);
		    return tx.gasPrice.mul(txReceipt.gasUsed);
		},

		transfer: function(from, to, amt, txParams){
			var txParams = txParams || {};
			txParams.from = from;
			txParams.to = to;
			txParams.value = amt;
			return web3.eth.sendTransaction(txParams);
		},

		getContractState: (function(){
			// takes a mapping of {key=>promise}
			// returns a promise fulfilled with {key=>result}
			function multiPromise(promisesObj){
				var keys = Object.keys(promisesObj);
				var values = keys.map(k => promisesObj[k]);
				return Promise.all(values).then(arrResults => {
					var obj = {};
					arrResults.forEach((v,i) => obj[keys[i]] = v);
					return obj;
				});
			}

			return function(contract){
				var obj = {};
				contract.abi.forEach(o => {
					if (o.constant && o.inputs.length==0){ obj[o.name] = contract[o.name].call(); }
				});
				return multiPromise(obj);
			}
		}())
	}
	return _self;
}

module.exports.make = MakeTestUtil;