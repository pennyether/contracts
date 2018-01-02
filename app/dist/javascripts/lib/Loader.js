(function(){
	function addScript(src) {
		return new Promise((res, rej)=>{
			var timeout;
		    var script = document.createElement('script');
		    script.type = 'text/javascript';
		    script.async = true;
		    script.src = src;
		    script.onload = res;
		    script.onerror = rej;
		    document.getElementsByTagName('head')[0].appendChild(script);
		})
	}
	function addStyle(src) {
		return new Promise((res, rej)=>{
			var link = document.createElement('link');
			link.rel = "stylesheet";
			link.type = "text/css";
			link.href = src;
			link.onload = res;
			link.onerror = rej;
			document.getElementsByTagName('head')[0].appendChild(link);	
		})
	}

	/**
	Loads all required scripts and styles, then does the following:
		- sets up an infura _web3 (to use when if/when metamask is broken)
			- also _niceWeb3
		- sets up a default web3 (metamask, fallback to infura)
			- also niceWeb3
		- adds to global scope:
			- ethUtil
			- BigNumber
			- util
			- NiceWeb3: Registry, PennyAuction, etc
			- Also _Registry, _PennyAuction, (uses _niceWeb3)
		- Sets up the Nav and EthStatus
		- Sets up the Logger
		- Initializes all tippies
	*/
	function Loader(){
		var _self = this;

		this.promise = Promise.all([
			new Promise((res, rej)=>{ window.addEventListener('load', res); }),
			addScript("https://code.jquery.com/jquery-3.2.1.slim.min.js"),
			addScript("https://unpkg.com/tippy.js@2.0.8/dist/tippy.all.min.js"),
			addScript("/javascripts/lib/external/web3.min.js"),
			addScript("/javascripts/lib/external/EthAbi.js"),
			addScript("/javascripts/lib/EthUtil.js"),
			addScript("/javascripts/lib/NiceWeb3.js"),
			addScript("/javascripts/lib/NiceWeb3Logger.js"),
			addScript("/javascripts/lib/ABIs.js"),
			addScript("/javascripts/lib/PennyEtherWebUtil.js"),
			addScript("/javascripts/lib/Nav.js"),
			addScript("/javascripts/lib/EthStatus.js"),
			addStyle("/styles/global.css")
		]).then(()=>{
			var Web3 = require("web3");
			if (!window.$) throw new Error("Unable to find jQuery.");
			if (!window.tippy){ throw new Error("Unable to find Tippy."); }
			if (!window.Web3) throw new Error("Unable to find web3.");
			if (!window.ethAbi) throw new Error("Unable to find ethAbi.")
			if (!window.EthUtil) throw new Error("Unable to find EthUtil.");
			if (!window.NiceWeb3) throw new Error("Unable to find NiceWeb3.");
			if (!window.NiceWeb3Logger){ throw new Error("Unable to find NiceWeb3Logger."); }
			if (!window.ABIs){ throw new Error("Unable to find ABIs."); }
			if (!window.PennyEtherWebUtil){ throw new Error("Unable to find PennyEtherWebUtil."); }
			if (!window.Nav){ throw new Error("Unable to find Nav"); }
			if (!window.EthStatus){ throw new Error("Unable to find EthStatus"); }
			

		    // create web3 object depending on if its from browser or not
		    const _web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/"));
			if (typeof web3 !== 'undefined') {
				window.hasWeb3 = true;
		    	window.web3 = new Web3(web3.currentProvider);
		  	} else {
		  		window.hasWeb3 = false;
		  		window.web3 = _web3;
		  	}

		  	// these are back-up web3's, in case Metamask shits the bed.
		  	window._web3 = _web3;
		  	window._niceWeb3 = new NiceWeb3(_web3, ethAbi, EthUtil);

		  	// public things.
		  	window.niceWeb3 = new NiceWeb3(web3, ethAbi, EthUtil); 
		  	window.ethUtil = niceWeb3.ethUtil;
		  	window.BigNumber = web3.toBigNumber().constructor;
		  	window.util = new PennyEtherWebUtil(niceWeb3);

		  	// tell ethUtil to poll for state change
		  	ethUtil.pollForStateChange();
		  	const statePromise = ethUtil.getCurrentState(true);

		  	// make public all ContractFactories.
		  	Object.keys(ABIs).forEach((contractName) => {
		  		var abi = ABIs[contractName];
		  		window[contractName] = niceWeb3.createContractFactory(contractName, abi.abi, abi.unlinked_binary);
				window[`_${contractName}`] = _web3.eth.contract(abi.abi);
		  	});

			// make Registry public
		  	const registry = Registry.at("0x3a98e0a23e4b90357ebb937bdbc9144cb7ac0dd3");

		  	// attach visual components
		  	const ethStatus = new EthStatus(ethUtil);
		  	const nav = new Nav();
		  	nav.setEthStatusElement(ethStatus.$e)
		  	$("#Content").prepend(nav.$e);
		  	// const logger = new NiceWeb3Logger(niceWeb3);
		  	// logger.$e.appendTo(document.body);

		  	// attach Tippies
		  	tippy.defaults.trigger = "click";
		  	tippy.defaults.interactive = true;
		  	tippy.defaults.sticky = true;
		  	tippy.defaults.arrow = true;
		  	$('[title]:not(.tipLeft):not(.dontTip)').addClass("tipRight");
		  	tippy('.tipLeft:not(.dontTip)', {placement: "top"});
		  	tippy('.tipRight:not(.dontTip)', {placement: "right"});

		  	// done.
		  	return statePromise.then(()=>{
		  		console.log("Loader is done setting things up.");
		  		return registry;
		  	})
		});

		// Loads items from the registry, and also ensures that ethUtil
		//  	has a current state.
		// Returns a fake promise with which you can pass a function.
		// That function will be invoked with params as the instances.
		this.require = function(){
			var _callback = null;
			const strs = Array.prototype.slice.call(arguments);

			const p = Promise.resolve(_self.promise).then((reg)=>{
				const mappings = {
					"comp": [Comptroller, "COMPTROLLER"],
					"tr": [Treasury, "TREASURY"],
					"mc": [MainController, "MAIN_CONTROLLER"],
					"pac": [PennyAuctionController, "PENNY_AUCTION_CONTROLLER"],
					"dice": [InstaDice, "INSTADICE"]
				};
				strs.forEach(str => {
					if (!mappings[str] && str!=="reg")
						throw new Error(`Unknown requirement: ${str}`);
				});

				return Promise.all(
					strs.map((str)=>{
						if (str==="reg") return reg;
						const type = mappings[str][0];
						const name = mappings[str][1];
						return reg.addressOf([name]).then(addr => {
							const instance = type.at.call(type, addr);
							window[str] = instance;
							console.log(`found ${str} @ ${addr}`);
							return instance;
						}).catch((e)=>{
							console.error(`Could not find address of ${name}: ${e.message}`);
							throw e;
						});
					})
				)
			}).then((arr)=>{
				console.log(`Loader finished requirements: ${strs}`)
				return arr;
			})

			return {
				then: function(cb) {
					return Promise.resolve(p).then(arr=>{
						cb.apply(null, arr);
					});
				}
			}
		}
	}
	window.Loader = new Loader();
}());


function doScrolling(element, duration) {
	function getElementY(query) {
		return window.pageYOffset + document.querySelector(query).getBoundingClientRect().top
	}
	var startingY = window.pageYOffset
	var elementY = getElementY(element)
	var targetY = document.body.scrollHeight - elementY < window.innerHeight
		? document.body.scrollHeight - window.innerHeight
		: elementY
	var diff = targetY - startingY
	var easing = function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 }
	
	var start;
	if (!diff) return

	// Bootstrap our animation - it will get called right before next frame shall be rendered.
	window.requestAnimationFrame(function step(timestamp) {
		if (!start) start = timestamp
		var time = timestamp - start
		var percent = Math.min(time / duration, 1)
		percent = easing(percent)
		window.scrollTo(0, startingY + diff * percent)
		if (time < duration) {
			window.requestAnimationFrame(step)
		}
	});
}
