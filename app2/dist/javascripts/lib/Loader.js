(function(){
	function addScript(src) {
		return new Promise((res, rej)=>{
			var timeout;
		    var script = document.createElement('script');
		    script.type = 'text/javascript';
		    script.async = false;
		    script.src = src;
		    script.onload = res;
		    script.onerror = rej;
		    document.getElementsByTagName('head')[0].appendChild(script);
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
			if (typeof web3 !== 'undefined') {
				console.log("Got the injected web3!");
		    	window.web3 = new Web3(web3.currentProvider);
		  	} else {
		  		throw new Error("No injected web3 found.");
		  		//var web3_backup = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
		  		//window.web3 = web3_backup;
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
		  	// attach logger to body
		  	const logger = new NiceWeb3Logger(niceWeb3);
		  	logger.$e.appendTo(document.body);
		  	// done.
		  	$('[title]').addClass("tipped");
		  	tippy('[title]', {
		  		trigger: 'click',
		  		interactive: true,
		  		sticky: true,
		  		performance: true,
		  		arrow: true, 
		  	});
		  	console.log("Loader is done setting things up.");
		});
	}
	window.Loader = new Loader();
}());

// <script src="https://cdn.rawgit.com/ethereum/web3.js/develop/dist/web3.js"></script>
// <script>Web3 = require("web3");</script>
// <script src="https://cdn.rawgit.com/trufflesuite/truffle-contract/master/dist/truffle-contract.min.js"></script>
// <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js"
// 			integrity="sha256-k2WSCIexGzOj3Euiig+TlR8gA0EmPjuc79OEeY5L45g="
// 			crossorigin="anonymous"></script>
// 	<script src="./javascripts/artifacts.js"></script>
// 	<script src="./javascripts/Playground.js"></script>
// 	<script src="./javascripts/PennyAuctionUI.js"></script>
// 	<script src="./javascripts/app.js"></script>

