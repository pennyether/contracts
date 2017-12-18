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
	function NiceWeb3(web3, ethAbi) {
		const _self = this;
		this._knownInstances = {};
		this.web3 = web3;
		this.ethAbi = ethAbi;
		this.createContractFactory = function(contractName, abi, unlinked_binary){
			return new NiceWeb3ContractFactory(_self, contractName, abi, unlinked_binary);
		};
		this.addKnownInstance = function(instance, name) {
			if (!instance.address) throw new Error(`Provided instance must have an address.`);
			if (!name) name = `${instance.contractName}@${instance.address}`;
			_self._knownInstances[instance.address.toLowerCase()] = instance;
		};
		this.decodeKnownEvents = function(events) {
			// for each log, see if the address matches.
			const knownEvents = [];
			const unknownEvents = [];
			events.forEach((event)=>{
				const instance = _self._knownInstances[event.address];
				if (!instance) { unknownEvents.push(event); return; }
				// find corresponding ABI entry
				const def = instance.abi.find((abi)=>{
					return (abi.type === 'event' && 
						event.topics[0].startsWith(ethAbi.encodeSignature(abi)));
				});
				if (!def) { unknownEvents.push(event); return; }
				// update the event to have nice names.
				event.name = def['name'];
				event.args = ethAbi.decodeEvent(def, event.data);
				delete event.data;
				delete event.topics;
				knownEvents.push(event);
			})
			return [knownEvents, unknownEvents];
		};
		this.doEthCall = function(name) {
			const params = Array.prototype.slice.call(arguments);
			params.shift();
			return new Promise((resolve, reject)=>{
				web3.eth[name].apply(web3.eth, params, function(err, result){
					if (err){ reject(err); return; }
					resolve(result);
				});
			});
		};
		this.waitForReceipt = function(transactionHash) {
			var resolve, reject;
			const p = new Promise((res, rej)=>{ resolve=res; reject=rej; });
			function lookForReceipt() {
				web3.eth.getTransactionReceipt(transactionHash, function(err, result){
					if (err){ reject(err); return; }
					if (result){ resolve(result); return; }
					setTimeout(lookForReceipt, 1000);
				});
			}
			lookForReceipt();
			return p;
		};
		this.setCallHook = function(callHook) {
			_callHook = callHook;
		};
		this.onNewCall = function(promise){
			if (_callHook) _callHook(promise);
		}
	}

	function NiceWeb3ContractFactory(niceWeb3, contractName, abi, unlinked_binary) {
		if (!contractName) throw new Error("First arg must be the name of this Contract type.");
		if (!abi) throw new Error("Second arg must be the abi");
		
		const _self = this;
		const _web3 = niceWeb3.web3;
		const _ethAbi = niceWeb3.EthAbi;
		const BigNumber = _web3.toBigNumber(0).constructor;

		this.niceWeb3 = niceWeb3
		this.contract = _web3.eth.contract(abi);
		this.contractName = contractName;

		// Creates a new instance, which is a standard web3 contract
		// with a few extras added on:
		// 		- niceContractFactory
		//		- getDecodedEvent(<event>)
		// 
		// Returns a promise resolved with the NiceContract instance.
		// You can also do return.getTxHash().then()
		this.new = function(inputsObj, options){
			const _contractFactory = _self.contract;
			const oldNew = _contractFactory.new.bind(_contractFactory);
			const constructorDef = abi.find(def=>def.type==='constructor');
			if (!constructorDef)
				throw new Error(`${contractName} ABI doesn't define a constructor.`);
			
			return getCallFn(oldNew, constructorDef, null)(inputsObj, options);
		};

		// Returns a NiceContract instance, which is:
		//	- a regular web3 contract instance
		//	- all transactional calls return promises
		//	- all constant calls... um... fail I guess.
		//	- can decode events, provided the addresses matchh
		this.at = function(address) {
			const _contractFactory = _self.contract;
			const instance = _contractFactory.at.call(_contractFactory, address);
			abi.filter(def=>def.type==='function').forEach(def=>{
				const oldCall = instance[def.name].bind(instance);
				instance[def.name] = getCallFn(oldCall, def, instance);
			});
			instance.niceContractFactory = _self;
			return instance;
		};

		// Returns a function that calls 
		//	 - oldCallFn(...validatedInputs, validatedOptions, [custom callback])
		// And returns
		//   - a Promise resolved with a nice object.
		//	 - with a .getTxHash() property that resolves first.
		// See: _doPromisifiedCall()
		// todo: handle if this is a constant function!
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
				const metadata = {
					contractName: contractName,
					instance: instance,
					fnName: fnName,
					inputsObj: inputsObj,
					inputs: inputs,
					opts: opts
				};
				const p = _doPromisifiedCall(oldCallFn, metadata, def.constant);
				niceWeb3.onNewCall(p);
				return p;
			}
		}

		// Does a call to oldCallFn, and returns an object:
		//	- .getResult() after receipt is confirmed. returns a tx object thing.
		//  - .getTxHash() if call is submitted successfully
		function _doPromisifiedCall(oldCallFn, metadata, returnImmediate) {
			const contractName = metadata.contractName;
			const inputs = metadata.inputs;
			const opts = metadata.opts;
			const instance = metadata.instance;
			const fnName = metadata.fnName;
			const inputStr = metadata.inputs.join(",");
			const optsStr = Object.keys(metadata.opts)
				.map(name=>`${name}: ${metadata.opts[name]}`).join(", ");
			const callStr = `${contractName}.${fnName}(${inputStr}, {${optsStr}})`;
			
			
			var resResult, rejResult;
			const resultPromise = new Promise((_res, _rej)=>{ resResult=_res; rejResult=_rej});
			var resTxHash, rejTxHash;
			const txHashPromise = new Promise((_res, _rej)=>{ resTxHash=_res; rejTxHash=_rej});
			function callbackHandler(err, result){
				if (err) {
					const e = new Error(`${callStr} Failed: ${err.message}`);
					e.prev = err;
					rejTxHash(e);
					rejResult(e);
					return;
				}
				if (returnImmediate){
					resResult(result);
					return;
				} 

				const transactionHash = result.transactionHash || result;
				resTxHash(transactionHash);	
				niceWeb3.waitForReceipt(transactionHash).then(
					(receipt)=>{
						const result = {
							receipt: receipt,
							metadata: metadata
						};
						if (receipt.contractAddress){
							result.instance = _self.at(receipt.contractAddress)
							niceWeb3.addKnownInstance(result.instance);
							console.log(`${contractName} created @ ${result.instance.address}`, result.instance);
						}
						[known, unknown] = niceWeb3.decodeKnownEvents(receipt.logs);
						result.knownEvents = known;
						result.unknownEvents = unknown;
						resResult(result);
					},(err)=>{
						rejResult(new Error(`${callStr} Failed to get receipt: ${err.message}`));
					}
				);
			}

			oldCallFn.apply(null, inputs.concat(opts, callbackHandler));
			if (!returnImmediate) resultPromise.getTxHash = txHashPromise;
			resultPromise.metadata = metadata;
			return resultPromise;
		}
	}

	// validates providedInputs against abiInputs
	function _validateInputs(providedInputs, abiInputs, callName) {
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
			const val = providedInputs[name];
			const nameAsStr = `${type} ${name}`;
			if (!providedInputs.hasOwnProperty(name)) {
				throw new Error(`Not passed expected input: "${nameAsStr}"`);
			}

			const e = new Error(`Passed invalid value for "${nameAsStr}" input. Got this: ${val}`);
			if (type == "address") {
				if (typeof val!=='string') { throw e; }
				else if (!val.startsWith("0x")) { throw e; }
				else if (val.length != 42) { throw e; }
			} else if (type == "uint256") {
				try { const bn = new BigNumber(val); }
				catch(_e){ throw e; }
			} else if (type == "string" || type == "bytes32") {
				if (typeof val!=='string') { throw e; }
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
		if (!opts.hasOwnProperty("from") || !opts.from) {
			throw new Error(`'from' option is missing.`);
		}
		return opts;
	}

	window.NiceWeb3 = NiceWeb3;
}());