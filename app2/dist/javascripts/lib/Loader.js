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

	function Loader(){
		var _self = this;

		this.promise = Promise.all([
			new Promise((res, rej)=>{ window.addEventListener('load', res); }),
			addScript("https://code.jquery.com/jquery-3.2.1.slim.min.js"),
			addScript("https://unpkg.com/tippy.js@2.0.8/dist/tippy.all.min.js"),
			addScript("/javascripts/lib/external/web3.min.js"),
			addScript("/javascripts/lib/external/EthAbi.js"),
			addScript("/javascripts/lib/NiceWeb3.js"),
			addScript("/javascripts/lib/NiceWeb3Logger.js"),
			addScript("/javascripts/lib/ABIs.js"),
			addStyle("/styles/global.css")
		]).then(()=>{
			var Web3 = require("web3");
			if (!window.$) throw new Error("Unable to find jQuery.");
			if (!window.Web3) throw new Error("Unable to find web3.");
			if (!window.ethAbi) throw new Error("Unable to find ethAbi.")
			if (!window.NiceWeb3) throw new Error("Unable to find NiceWeb3.");
			if (!window.NiceWeb3Logger){ throw new Error("Unable to find NiceWeb3Logger."); }
			if (!window.ABIs){ throw new Error("Unable to find ABIs."); }
			if (!window.tippy){ throw new Error("Unable to find Tippy."); }

		    // create web3 object depending on if its from browser or not
		    const _web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/"));
			if (typeof web3 !== 'undefined' && !false) {
				window.hasWeb3 = true;
		    	window.web3 = new Web3(web3.currentProvider);
		  	} else {
		  		window.hasWeb3 = false;
		  		window.web3 = _web3;
		  	}

		  	// these are back-up web3's, in case Metamask shits the bed.
		  	window._web3 = _web3;
		  	window._niceWeb3 = new NiceWeb3(_web3, ethAbi);

		  	// public things.
		  	window.niceWeb3 = new NiceWeb3(web3, ethAbi); 
		  	window.ethUtil = niceWeb3.ethUtil;
		  	window.BigNumber = web3.toBigNumber().constructor;

		  	// make public all ContractFactories.
		  	Object.keys(ABIs).forEach((contractName) => {
		  		var abi = ABIs[contractName];
		  		window[contractName] = niceWeb3.createContractFactory(contractName, abi.abi, abi.unlinked_binary);
				window[`_${contractName}`] = _web3.eth.contract(abi.abi);
		  	});

			// make Registry public
		  	const registry = Registry.at("0xc1096f203834d7ef377865dc248c1b8b0adcab88");

		  	// attach logger to body
		  	const logger = new NiceWeb3Logger(niceWeb3);
		  	logger.$e.appendTo(document.body);

		  	// attach Tippy's
		  	tippy.defaults.trigger = "click";
		  	tippy.defaults.interactive = true;
		  	tippy.defaults.sticky = true;
		  	tippy.defaults.performance = true;
		  	tippy.defaults.arrow = true;
		  	$('[title]:not(.tipLeft)').addClass("tipRight");
		  	tippy('.tipLeft', {placement: "top"});
		  	tippy('.tipRight', {placement: "right"});

		  	// done.
		  	console.log("Loader is done setting things up.");
		  	return registry;
		});

		// Returns a fake promise with which you can pass a function.
		// That function will be invoked with params as the instances.
		this.require = function(){
			var _callback = null;
			const strs = Array.prototype.slice.call(arguments);

			Promise.resolve(_self.promise).then((reg)=>{
				const mappings = {
					"comp": [Comptroller, "COMPTROLLER"],
					"tr": [Treasury, "TREASURY"],
					"mc": [MainController, "MAIN_CONTROLLER"],
					"pac": [PennyAuctionController, "PENNY_AUCTION_CONTROLLER"]
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
							console.log("addr", addr);
							return type.at.call(type, addr);
						});
					})
				)
			}).then((arr)=>{
				if (_callback){ _callback.apply(null, arr); }
			})

			return {
				then: function(cb) { _callback = cb; }
			}
		}
	}
	window.Loader = new Loader();
}());

