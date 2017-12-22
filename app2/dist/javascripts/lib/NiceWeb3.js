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
	function NiceWeb3(web3, ethAbi) {
		const _self = this;
		this._knownInstances = {};
		this.web3 = web3;
		this.ethUtil = new EthUtil(web3, ethAbi);

		this.createContractFactory = function(contractName, abi, unlinked_binary){
			return new NiceWeb3ContractFactory(_self, contractName, abi, unlinked_binary);
		};
		this.addKnownInstance = function(instance, name) {
			if (!instance.address) throw new Error(`Provided instance must have an address.`);
			if (!name) name = `${instance.contractName}@${instance.address}`;
			_self._knownInstances[instance.address.toLowerCase()] = instance;
		};
		// gets all events in a way shitamask and infura can live with
		this.getAllEvents = function(instance) {
			return _self.ethUtil.sendAsync("eth_getLogs", [{
				address: instance.address,
				fromBlock: web3.toHex(0),
				toBlock: "latest"
			}]).then((rpcResponse)=>{
				const events = rpcResponse.result;
				const arr = _self.decodeKnownEvents(events);
				if (arr[0].length !== events.length)
					throw new Error("Unable to decode events", instance, events)
				return arr[0];
			});
		};
		// will decode events where the address matches a known instance
		// and that instance has the topic in its ABI
		this.decodeKnownEvents = function(events) {
			const knownEvents = [];
			const unknownEvents = [];
			events.forEach((event)=>{
				// return if its not known
				const instance = _self._knownInstances[event.address];
				if (!instance) { unknownEvents.push(event); return; }
				// try to decode it (ABI may not have the topic)
				const decodedEvent = _self.ethUtil.decodeEvent(event, instance.abi);
				decodedEvent
					? knownEvents.push(decodedEvent)
					: unknownEvents.push(event);
			})
			return [knownEvents, unknownEvents];
		};

		// allows for someone to watch all calls from instances
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
			if (typeof address!=='string' || address.length!==42)
				throw new Error(`Expected an address, but got: ${address}.`);
			// create standard web3 instance
			const _contractFactory = _self.contract;
			const instance = _contractFactory.at.call(_contractFactory, address);
			instance.niceContractFactory = _self;
			// attach a bunch of useful functions...
			// you know, that return actual promises and useful results.
			abi.filter(def=>def.type==='function').forEach(def=>{
				const oldCall = instance[def.name].bind(instance);
				instance[def.name] = getCallFn(oldCall, def, instance);
			});
			instance.getAllEvents = ()=>niceWeb3.getAllEvents(instance);
			// add instance to known instances (so can parse events)
			niceWeb3.addKnownInstance(instance);
			//console.log(`Created ${contractName} @ ${instance.address}`);
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
				if (!opts.from) opts.from = _web3.eth.accounts[0];
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
					callName: callName,
					isConstant: def.constant,
					inputsObj: inputsObj,
					inputs: inputs,
					opts: opts
				};
				const p = _doPromisifiedCall(oldCallFn, metadata);
				niceWeb3.onNewCall(p);
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
			const inputs = metadata.inputs;
			const opts = metadata.opts;
			const inputStr = metadata.inputs.join(",");
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
					niceWeb3.ethUtil.getTxReceipt(txHash),
					niceWeb3.ethUtil.getTx(txHash)
				]).then(
					(arr)=>{
						const receipt = arr[0];
						const tx = arr[1];
						if (receipt.status === 0) {
							throw new Error(`Transaction failed (out of gas, or other error)`);
						}

						const result = {};
						if (receipt.contractAddress){
							result.instance = _self.at(receipt.contractAddress)
						}
						[known, unknown] = niceWeb3.decodeKnownEvents(receipt.logs);
						result.knownEvents = known;
						result.unknownEvents = unknown;
						result.receipt = receipt;
						result.metadata = metadata;
						result.transaction = tx;
						return result;
					},(err)=>{
						throw new Error(`${callStr} Failed to get receipt: ${err.message}`);
					}
				).then(niceWeb3.ethUtil.getTx(txHash))
			});

			if (!isConstant) txResultPromise.getTxHash = txCallPromise;
			txResultPromise.metadata = metadata;
			return txResultPromise;
		}
	}

	function EthUtil(web3, ethAbi) {
		const _web3 = web3;
		const _ethAbi = ethAbi;
		const _self = this;

		this.NO_ADDRESS = "0x0000000000000000000000000000000000000000";

		// decodes event, or returns null if no matching topic in abi
		this.decodeEvent = function(event, abi) {
			// find corresponding ABI entry
			const def = abi.find((abi)=>{
				return (abi.type === 'event' && 
					event.topics[0].startsWith(_ethAbi.encodeSignature(abi)));
			});
			if (!def) { return null; }
			// update the event to have nice names.
			event.name = def['name'];
			event.args = _ethAbi.decodeEvent(def, event.data, undefined, false);
			event.argStrs = {};
			def.inputs.forEach((i) => {
				event.argStrs[i.name] = ethUtil.inputToString(i.name, i.type, event.args[i.name]);
			});
			delete event.data;
			delete event.topics;
			return event;
		};

		this.inputToString = function(name, type, val) {
			if (name=="time") {
				return (new Date(val.toNumber()*1000)).toString();
			} else {
				return `${val}`;
			}
		}

		// does a low-level JSON RPC call with provided method/params
		this.sendAsync = function(method, params){
	        return new Promise((res,rej)=>{
	        	const paramsStr = JSON.stringify(params);
	        	const name = `$method (${paramsStr}`;
	        	const obj = {
		            jsonrpc: "2.0",
		            method: method,
		            params: params,
		            id: new Date().getTime()
		        };
		        console.log(`starting asyncSend: ${name}...`);
	        	_web3.currentProvider.sendAsync(obj, function(err, result){
	        		console.log(`finished asyncSend: ${name}...`, err, result);
		        	if (err) rej(err);
		        	else res(result);
		        });	
	        });
		};

		// resolves/rejects with response from web3.eth.<name>(args[0], args[1],...)
		this.doEthCall = function(name, args) {
			if (!args) args = [];
			if (!Array.isArray(args))
				throw new Error(`doAsyncEthCall(${name}) expects an array as args.`);
			return new Promise((resolve, reject)=>{
				function callback(err, result){
					if (err){ reject(err); }
					if (result!==null){ resolve(result); }
					reject(`_web3.eth.${name} returned null.`);
				}
				_web3.eth[name].apply(_web3.eth, args.concat(callback));
			});
		};

		// waits for a non-null response from web3.eth.<name>(args[0], args[1],...)
		this.pollEthCall = function(name, args) {
			if (!args) args = [];
			if (!Array.isArray(args))
				throw new Error(`doAsyncEthCall(${name}) expects an array as args.`);

			return new Promise((resolve, reject)=>{
				function callback(err, result){
					if (err){ reject(err); return; }
					if (result !== null){ resolve(result); return; }
					setTimeout(poll, 1000);
				}
				function poll() {
					_web3.eth[name].apply(_web3.eth, args.concat(callback));
				}
				poll();	
			});
		}

		//////// COMMON ETH CALLS ///////////////////////////////
		this.getTxReceipt = function(transactionHash) {
			return _self.pollEthCall("getTransactionReceipt", [transactionHash]);
		};
		this.getTx = function(transactionHash) {
			return _self.pollEthCall("getTransaction", [transactionHash]);
		};
		this.getBalance = function(addr) {
			if (addr.address) addr = addr.address;
			return _self.doEthCall("getBalance", [addr]);
		};
		this.getBlockNumber = function(){
			return _self.doEthCall("getBlockNumber");
		}

		this.toEth = function(val) {
			try { var bn = new BigNumber(val); }
			catch (e) { throw new Error(`${val} is not convertable to a BigNumber`); }
			return bn.div(1e18);
		}
		this.toWei = function(val) {
			try { var bn = new BigNumber(val); }
			catch (e) { throw new Error(`${val} is not convertable to a BigNumber`); }
			return bn.mul(1e18);
		}
		this.getLogs = function(filterObj){
			_self.doProviderSend("eth_getLogs", filterObj);
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
		abiInputs.forEach((abiInput, i) => {
			const name = abiInput.name ? `"${abiInput.name}"` : "";
			const type = abiInput.type;
			const val = providedInputsArr[i];
			const nameAsStr = `[${i}]${name}: (${type})`;
			if (!providedInputsArr.hasOwnProperty(i)) {
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
		});
		return providedInputsArr;
	}

	// Validates options passed in against isPayable
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