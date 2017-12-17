// Wraps a web3 and does sensible things...
//	- Requires named params to contract calls, and validates them.
//	  	THIS WILL SAVE YOU A FUCKING LIFETIME IN DEBUGGING.
//	  	WHY THIS IS NOT A DEFAULT, NOBODY KNOWS.
//	- Lets you name register names to addresses
//	- Result object contains useful details:
//		- the original call data
//		- the TX receipt
//		- all logs, nicely parsed (by name of registered addresses)
//		- how long it took, txFee in ETH


		// var _old = web3.eth.sendRawTransaction;
		// web3.eth.sendRawTransaction = function(){
		// 	var argArray = Array.prototype.slice.call(arguments);
		// 	var lastArg = arguments.slice(-1).pop();
		// 	if (typeof lastArg == 'function') {
		// 		// override callback
		// 	}
		// 	console.log("Did I Hook The Bitch?", arguments);
		// 	var _self = this;
		// 	_old.apply(_self, arguments);
		// }

(function() {
	var _web3;
	function NiceWeb3(web3) {
		_web3 = web3;
		this.ContractFactory = NiceWeb3ContractFactory;
	}
	
	function NiceWeb3ContractFactory(contractName, abi, unlinked_binary) {
		if (!contractName) throw new Error("First arg must be the name of this Contract type.");
		if (!abi) throw new Error("Second arg must be the abi");

		const _contractFactory = _web3.eth.contract(abi);
		this.new = function(inputsObj, options){
			// The old `new` does as follows, when passed a callback:
			//	- creates an instance
			//	- packs up args using constructor param
			//	- does sendTransaction
			//	- calls the callback once (passing it the contract)
			//	- meanwhile, waits for it to get mined
			//	- after its mined, calls callback a second time
			//	- this time, the instace has methods on it.
			const oldNew = _contractFactory.new.bind(_contractFactory);
			const constructorDef = abi.find(def=>def.type==='constructor');
			if (!constructorDef)
				throw new Error(`${contractName} ABI doesn't define a constructor.`);
			return getCallFn(oldNew, constructorDef, null)(inputsObj, options)
				.then(res => {
					const instance = res.result;
					attachNiceCalls(instance);
					return res;
				});
		};
		this.at = function(){
			const instance = _contractFactory.at.apply(_contractFactory, arguments);
			attachNiceCalls(instance);
			return instance;
		};
		this._contract = _contractFactory;

		function attachNiceCalls(instance) {
			abi.filter(def=>def.type==='function').forEach(def=>{
				const oldCall = instance[def.name].bind(instance);
				instance[def.name] = getCallFn(oldCall, def, instance);
				console.log(`Overwrote ${def.name} on ${contractName} instance.`);
				// todo: make realized call return a promi-event instead of a promise.
			});
		}

		// Returns a function that calls 
		//	 - oldCallFn(...validatedInputs, validatedOptions, [custom callback])
		// And returns
		//   - a Promise resolved when the oldCallFn() callback is fired.
		// This promise will resolve with extra stuff, but always .result
		// See: _getPromisifiedCallback()
		function getCallFn(oldCallFn, def, instance) {
			const isConstructor = def.type === "constructor";
			const abiInputs = def.inputs;
			const isPayable = def.payable;
			const fnName = def.name || "<constructor>";
			const inputStr = def.inputs.map(input=>input.name).join(",");
			const callName = isConstructor 
				? `new ${contractName}(${inputStr})`
				: `${contractName}.${fnName}(${inputStr})`;

			return function NiceWeb3ContractCall(inputsObj, opts, callback) {
				var inputs, opts;
				if (callback !== undefined){
					throw new Error(`${callName} was passed a callback. Don't do that.`);
				}
				if (!opts) opts = {};
				if (!inputsObj) inputsObj = {};
				try {
					inputs = _validateInputs(inputsObj, abiInputs);
					opts = _validateOpts(opts, isPayable);
					if (isConstructor){
						if (!unlinked_binary) throw new Error(`No unlinked_binary provided.`);
						opts.data = unlinked_binary;
					}
				} catch (e) {
					throw new Error(`${callName} Validation Error: ${e.message}`);
				}
				
				return new Promise((resolve, reject)=>{
					callback = _getPromisifiedCallback({
						contractName: contractName,
						instance: instance,
						fnName: fnName,
						inputsObj: inputsObj,
						inputs: inputs,
						opts: opts
					}, resolve, reject);
					oldCallFn.apply(null, inputs.concat(opts, callback));
				});
			}
		}
	}

	// validates providedInputs against abiInputs
	function _validateInputs(providedInputs, abiInputs, callName) {
		const BigNumber = _web3.toBigNumber(0).constructor;

		// If we abi has no inputs and we also didn't get any, return.
		if (abiInputs.length==0 && !providedInputs) return [];
		// If provided inputs is not an object or is null, and we
		// are expecting some inputs, then throw.
		if (typeof providedInputs !== "object" || providedInputs === null) {
			if (abiInputs.length)
				throw new Error(`Expected an input object, but got: ${providedInputs}`);
		}

		// For each providedInput, valid it exists in abiInputs
		const invalidInputs = [];
		Object.keys(providedInputs).forEach((providedName) => {
			if (!abiInputs.some((input)=>input.name===providedName)) {
				invalidInputs.push(providedName);
			}
		});
		if (invalidInputs.length) {
			throw new Error(`Passed invalid inputs: ${invalidInputs}`);
		}

		// for each abi input, validate exists correctly in providedInputs
		// if so, add it to the cardinal inputs array to be returned.
		const inputs = [];
		abiInputs.forEach((abiInput) => {
			const name = abiInput.name;
			const type = abiInput.type;
			const nameAsStr = `${name} (${type})`;
			const val = providedInputs[name];
			if (!providedInputs.hasOwnProperty(name)) {
				throw new Error(`Not passed expected input: ${nameAsStr}`);
			}

			const e = new Error(`Passed invalid value for ${nameAsStr} input. Got this: ${val}`);
			if (type == "address") {
				if (typeof val!=='string') { throw e; }
				else if (val.length != 42) { throw e; }
				else if (!val.startsWith("0x")) { throw e; }
			} else if (type == "uint256") {
				try { const bn = new BigNumber(val); }
				catch(_e){ throw e; }
			} else {
				throw new Error(`Passed unsupported input type: ${nameAsStr}.`);
			}
			inputs.push(val);
		});
		return inputs;
	}

	// Validates options passed in.
	function _validateOpts(opts, isPayable) {
		const allowedNames = ["from","value","gas","gasPrice"];
		const invalidOpts = [];
		Object.keys(opts).forEach((name)=>{
			if (allowedNames.indexOf(name)===-1) invalidOpts.push(name);
		});
		if (invalidOpts.length){
			throw new Error(`Passed invalid opt(s): ${invalidOpts.join(",")}`);
		}
		if (isPayable && !opts.hasOwnProperty('value')){
			throw new Error(`Is payable, but no value passed in options.`);
		}
		if (!isPayable && opts.hasOwnProperty('value')){
			throw new Error(`Is not payable, but was passed a value in options.`);
		}
		return opts;
	}

	// returns a callback that can be sent to contract.someMethod() and factory.new()
	// It returns useful stuff.
	function _getPromisifiedCallback(meta, resolve, reject) {
		const contractName = meta.contractName;
		const isNew = !meta.instance;
		const fnName = isNew ? "<constructor>" : meta.fnName;
		const inputStr = meta.inputs.join(",");
		const optsStr = Object.keys(meta.opts).map(name=>`${name}: ${meta.opts[name]}`).join(", ");
		const callStr = `${contractName}.${fnName}(${inputStr}, {${optsStr}})`;
		var count = 0;
		return function(err, result){
			if (err) {
				const e = new Error(`${callStr} Failed: ${err.message}`);
				e.prev = err;
				reject(e);
				return;
			}
			// todo: figure out what to do if is constant or not.

			if (isNew && !result.address) {
				// we got the transaction hash in result.transactionHash
				debugger;
				console.log("Got this result:", result);
				return;
			} 
			resolve({
				result: result,
				instance: isNew ? result : meta.instance,
				metadata: meta
			});
		}	
	}

	window.NiceWeb3 = NiceWeb3;
}());