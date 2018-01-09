// Wraps a web3 and does sensible things...
//	- Requires named params to contract calls, and validates them.
//	  	THIS WILL SAVE YOU A FUCKING LIFETIME IN DEBUGGING.
//	  	WHY THIS IS NOT A DEFAULT, NOBODY KNOWS.
//	- Result object contains useful details:
//		- the original call data
//		- the TX receipt
//		- all logs, nicely parsed
//  - Unfortunately still subject to the retardation of MetaMask
//		- events may not work
//		- other shit might randomly not work
(function() {
	function NiceWeb3(web3, ethAbi, EthUtil) {
		const _self = this;
		const _ethUtil = new EthUtil(web3, ethAbi);
		var _callHook = null;

		this._knownInstances = {};
		this.web3 = web3;
		this.ethUtil = _ethUtil;

		this.createContractFactory = function(contractName, abi, unlinked_binary){
			return new NiceWeb3ContractFactory(_self, contractName, abi, unlinked_binary);
		};
		this.addKnownInstance = function(instance, name) {
			if (!instance.address) throw new Error(`Provided instance must have an address.`);
			if (!name) name = `${instance.contractName}@${instance.address}`;
			_self._knownInstances[instance.address.toLowerCase()] = instance;
		};
		// gets all events in a way shitamask and infura can live with
		this.getAllEvents = function(instance, fromBlock, toBlock) {
			return _ethUtil.sendAsync("eth_getLogs", [{
				address: instance.address,
				fromBlock: web3.toHex(fromBlock) || web3.toHex(0),
				toBlock: web3.toHex(toBlock) || "latest"
			}]).then((events)=>{
				return _self.decodeKnownEvents(events);
			});
		};
		// gets all events given a name and filter (filters are ANDed)
		// eg: {topic1Name: value, topic2Name: value}
		this.getEvents = function(instance, name, filter, fromBlock, toBlock) {
			filter = filter || {};
			const def = instance.abi.find((def)=>def.type=="event" && def.name==name);
			if (!def) throw new Error(`${instance._getName()} has no "${name}" event.`);
			// first topic is the signature of the event
			const topics = [ethUtil.getEventSignature(def, name)];
			const indexedInputs = def.inputs.filter(input=>input.indexed);
			// ensure each filter provided is an indexedInput
			Object.keys(filter).forEach(inputName=>{
				if (!indexedInputs.find(input=>input.name==inputName))
					throw new Error(`${instance._getName()} ${name} event has no index on ${inputName}.`);
			});
			// for each indexed input, add to topics array as null or our value
			indexedInputs.forEach(input=>{
				const topicValue = filter.hasOwnProperty(input.name)
					? "0x"+ethUtil.toBytesStr(filter[input.name], 32)
					: null;
				topics.push(topicValue);
			});
			
			// do it.
			return _ethUtil.sendAsync("eth_getLogs", [{
				address: instance.address,
				fromBlock: fromBlock ? web3.toHex(fromBlock) : web3.toHex(0),
				toBlock: toBlock ? web3.toHex(toBlock) : "latest",
				topics: topics
			}]).then((events)=>{
				return _self.decodeKnownEvents(events);
			});
		}
		// will decode events where the address matches a known instance
		// and that instance has the topic in its ABI
		this.decodeKnownEvents = function(events) {
			return events.map((event)=>{
				// return if its not known
				event.decoded = false;
				const instance = _self._knownInstances[event.address];
				if (!instance) { return event; }
				// decode it
				const decodedEvent = _ethUtil.decodeEvent(event, instance.abi);
				// convert any BigNumbers into our BigNumber
				if (decodedEvent) {
					Object.keys(decodedEvent.args).forEach((key)=>{
						const val = decodedEvent.args[key];
						if (val && val.toNumber)
							decodedEvent.args[key] = new BigNumber(val);
					});
					delete decodedEvent.args["_eventName"];
					decodedEvent.decoded = true;
				}
				return decodedEvent ? decodedEvent : event;
			})
		};

		// allows for someone to watch all calls from instances
		// note: non-instance calls (eg: web3.eth.getTransaction) will not be hooked.
		this.setCallHook = function(callHook) {
			_callHook = callHook;
		};
		// this is invoked by instances to notify of a new call.
		this.notifyCall = function(promise){
			if (_callHook) _callHook(promise);
		}
	}

	function NiceWeb3ContractFactory(niceWeb3, contractName, abi, unlinked_binary) {
		if (!contractName) throw new Error("First arg must be the name of this Contract type.");
		if (!abi) throw new Error("Second arg must be the abi");
		
		const _self = this;
		const _web3 = niceWeb3.web3;
		const _ethUtil = niceWeb3.ethUtil;
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
		//	- can decode events, provided the addresses matchh
		this.at = function(address) {
			if (typeof address!=='string' || address.length!==42)
				throw new Error(`Expected an address, but got: ${address}.`);
			// create standard web3 instance
			const _contractFactory = _self.contract;
			const instance = _contractFactory.at.call(_contractFactory, address);
			// add on useful things
			instance.type = _self;
			instance._getName = () => _self.contractName;
			instance._getFullName = () => `${_self.contractName}@${instance.address}`;
			instance._getNiceWeb3 = () => niceWeb3;
			// attach a bunch of useful functions...
			// you know, that return actual promises and useful results.
			abi.filter(def=>def.type==='function').forEach(def=>{
				const oldFn = instance[def.name];
				const oldCall = oldFn.bind(instance);
				instance[def.name] = getCallFn(oldCall, def, instance, def.constant);
				if (oldFn.estimateGas){
					const oldCall = oldFn.estimateGas.bind(oldFn);
					instance[def.name].estimateGas = getCallFn(oldCall, def, instance, true);
				}
				if (oldFn.call){
					const oldCall = oldFn.call.bind(oldFn);
					instance[def.name].call = getCallFn(oldCall, def, instance, true);
				}
				if (oldFn.getData) {
					// returns an immediate result, not a promise
					const oldCall = oldFn.getData.bind(oldFn);
					instance[def.name].getData = getCallFn(oldCall, def, instance, true, true);
				}
			});
			// attach .sendTransaction()
			var sendTransactionDef = abi.find(def=>def.type=="fallback");
			if (sendTransactionDef){
				sendTransactionDef.inputs = [];
				sendTransactionDef.name = "<fallback>";
				const oldSendTransaction = _web3.eth.sendTransaction.bind(_web3.eth);
				instance.sendTransaction = getCallFn(oldSendTransaction, sendTransactionDef, instance, false)
					.bind(instance, []);
			}
			// attach getAllEvents
			instance.getAllEvents = function(fromBlock, toBlock){
				return niceWeb3.getAllEvents(instance, fromBlock, toBlock);
			}
			instance.getEvents = function(name, filter, fromBlock, toBlock) {
				return niceWeb3.getEvents(instance, name, filter, fromBlock, toBlock);
			}
			// add instance to known instances (so can parse events)
			niceWeb3.addKnownInstance(instance);
			return instance;
		};

		// Returns a function that calls 
		//	 - oldCallFn(...validatedInputs, validatedOptions, [custom callback])
		// And returns
		//   - a Promise resolved with a nice object.
		//	 - with a .getTxHash() property that resolves first.
		//   - if isImmediate is true, returns immediate value
		// See: _doPromisifiedCall()
		function getCallFn(oldCallFn, def, instance, isConstant, isImmediate) {
			const isConstructor = def.type === "constructor";
			const abiInputs = def.inputs;
			const isPayable = def.payable;
			const fnName = def.name || "<constructor>";
			const inputStr = def.inputs.map(input=>input.name).join(",");
			const callName = isConstructor 
				? `new ${contractName}(${inputStr})`
				: `${contractName}.${fnName}(${inputStr})`;

			return function NiceWeb3ContractCall(inputsObj, opts, callback) {
				var inputsArr, opts;
				if (callback !== undefined){
					throw new Error(`${callName} was passed a callback. Don't do that.`);
				}
				if (!opts) opts = {}
				if (!inputsObj) inputsObj = {};
				if (!opts.from) {
					opts.from = _ethUtil.getCurrentAccount(!isConstant) || _ethUtil.NO_ADDRESS;
				}
				if (!opts.to && !isConstructor) {
					opts.to = instance.address;
				}
				if (opts.to && isConstructor) {
					throw new Error(`${callName} passed a 'to' field, but is a constructor.`);
				}
				try {
					[inputsArr, inputsObj] = _validateInputs(inputsObj, abiInputs);
					opts = _validateOpts(opts, isPayable);
					if (isConstructor){
						if (!unlinked_binary) throw new Error(`No unlinked_binary provided.`);
						opts.data = unlinked_binary;
					}
				} catch (e) {
					console.error(e);
					throw new Error(`${callName} Validation Error: ${e.message}`);
				}
				if (isImmediate) {
					return oldCallFn.apply(null, inputs);
				}

				const metadata = {
					contractName: contractName,
					instance: instance,
					fnName: fnName,
					abiDef: def,
					callName: callName,
					isConstant: isConstant,
					inputsArr: inputsArr,
					inputsObj: inputsObj,
					opts: opts
				};
				const p = _doPromisifiedCall(oldCallFn, metadata);
				niceWeb3.notifyCall(p);
				return p;
			}
		}

		// Does a call to oldCallFn, and returns a promise:
		//	- if a constant:
		//		- resolves with result
		//	- if a call
		//		- resolves with a big useful object.
		//      - promise.getTxHash: a promise tracking tx submission
		function _doPromisifiedCall(oldCallFn, metadata) {
			const contractName = metadata.contractName;
			const instance = metadata.instance;
			const fnName = metadata.fnName;
			const isConstant = metadata.isConstant;
			const inputs = metadata.inputsArr;
			const opts = metadata.opts;
			const inputStr = Object.keys(metadata.inputsObj)
				.map(name=>`${name}: ${metadata.inputsObj[name]}`).join(",");
			const optsStr = Object.keys(metadata.opts)
				.map(name=>`${name}: ${metadata.opts[name]}`).join(", ");
			const callStr = `${contractName}.${fnName}(${inputStr}, {${optsStr}})`;
			
			
			const txCallPromise = new Promise((resolve, reject)=>{
				function callbackHandler(err, result) {
					if (err) {
						reject(err);
						return;
					}
					const ret = isConstant
						? result
						: result.transactionHash || result;
					resolve(ret);
				}
				oldCallFn.apply(null, inputs.concat(opts, callbackHandler));
			});
			const txResultPromise = Promise.resolve(txCallPromise).then((hashOrResult)=>{
				const txHash = isConstant ? null : hashOrResult;
				const result = isConstant ? hashOrResult : null;
				if (isConstant) return result;

				return Promise.all([
					_ethUtil.getTxReceipt(txHash),
					_ethUtil.getTx(txHash)
				]).then(
					(arr)=>{
						const receipt = arr[0];
						const tx = arr[1];
						const result = {};
						if (receipt.contractAddress){
							result.instance = _self.at(receipt.contractAddress)
						}
						result.events = niceWeb3.decodeKnownEvents(receipt.logs);
						result.receipt = receipt;
						result.transaction = tx;
						result.metadata = metadata;
						console.log(`${callStr} completed.`, result);

						if (receipt.status == 0 || receipt.status == "0x0") {
							const e = new Error(`Transaction failed (out of gas, or other error)`);
							e.result = result;
							throw e;
						} else {
							return result;
						}						
					},(err)=>{
						throw new Error(`${callStr} Failed to get receipt: ${err.message}`);
					}
				)
			});

			if (!isConstant) txResultPromise.getTxHash = txCallPromise;
			txResultPromise.metadata = metadata;
			return txResultPromise;
		}
	}

	// validates providedInputs against abiInputs
	// Can accept cardinal values:
	// 		[val1, val2, val3]
	// or named values:
	// 		{arg1: val1, arg2: val2}
	function _validateInputs(providedInputs, abiInputs) {
		const expectedInputsStr = abiInputs.map(function(def, i){
			return `${def.name ? def.name : i}: ${def.type}`;
		}).join(", ");

		// If we abi has no inputs and we also didn't get any, return.
		if (abiInputs.length==0 && !providedInputs) return [];
		// if we expected inputs, but got none, throw.
		if (abiInputs.length>0 && !providedInputs)
			throw new Error(`Expected inputs: ${expectedInputsStr}, but got none.`);
		// if provided inputs is not an object, complain
		if (typeof providedInputs !== "object")
			throw new Error(`Must be passed an array or object.`);
		
		
		var providedInputsArr;
		if (Array.isArray(providedInputs)) {
			providedInputsArr = providedInputs;
		} else {
			// If object, for each providedInput key, validate it exists in abiInputs
			// create a mapping of index => name || index
			const abiInputsByName = abiInputs.map((def, i)=>def.name ? def.name : i);
			
			// for each providedInput key, map the value to corresponding ABI index.
			// if ABI index not found, its an invalid key.
			providedInputsArr = [];
			const invalidInputs = [];
			Object.keys(providedInputs).forEach((name) => {
				const index = abiInputsByName.indexOf(name);
				if (index === -1) invalidInputs.push(name);
				else providedInputsArr[index] = providedInputs[name];
			});

			if (invalidInputs.length)
				throw new Error(`Passed unexpected inputs: ${invalidInputs}`);
		}

		// validate providedInputsArr has correct length
		if (providedInputsArr.length > abiInputs.length)
			throw new Error(`Expected ${abiInputs.length} arguments, but got ${providedInputsArr.length}.`);

		// for each abi input, validate exists correctly in providedInputsArr
		const providedInputsObj = {};
		abiInputs.forEach((abiInput, i) => {
			const name = abiInput.name ? abiInput.name : "";
			const type = abiInput.type;
			const val = providedInputsArr[i];
			const nameAsStr = `[${i}]"${name}": (${type})`;
			if (!providedInputsArr.hasOwnProperty(i)) {
				throw new Error(`Not passed expected input: "${nameAsStr}"`);
			}

			const e = new Error(`Passed invalid value for "${nameAsStr}" input. Got this: ${val}`);
			if (type == "address") {
				if (typeof val!=='string') { throw e; }
				else if (!val.startsWith("0x")) { throw e; }
				else if (val.length != 42) { throw e; }
			} else if (type.startsWith("uint") || type.startsWith("int")) {
				try { const bn = new BigNumber(val); }
				catch(_e){ throw e; }
			} else if (type == "string" || type == "bytes32") {
				if (typeof val!=='string') { throw e; }
			} else {
				console.warn(`NiceWeb3 Validation for input not supported: ${nameAsStr}`);
			}
			providedInputsObj[name] = val;
		});
		return [providedInputsArr, providedInputsObj];
	}

	// Validates options passed in against isPayable
	function _validateOpts(opts, isPayable) {
		const allowedNames = ["from","to","value","gas","gasPrice","blockNumber"];
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