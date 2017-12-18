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
			addScript("https://cdn.rawgit.com/ethereum/web3.js/develop/dist/web3.js"),
			addScript("https://code.jquery.com/jquery-3.2.1.slim.min.js"),
			addScript("./javascripts/lib/EthAbi.js"),
			addScript("./javascripts/lib/ABIs.js"),
			addScript("./javascripts/lib/NiceWeb3.js")
		]).then(()=>{
			var Web3 = require("web3");
			if (!window.Web3) throw new Error("Unable to find web3.");
			if (!window.ethAbi) throw new Error("Unable to find ethAbi.")
			if (!window.NiceWeb3) throw new Error("Unable to find NiceWeb3.");
			if (!window.ABIs){ throw new Error("window.ABIs not found!"); }

		    // create web3 object depending on if its from browser or not
		    var web3_backup = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
			if (typeof web3 !== 'undefined') {
				console.log("Got the injected web3!");
		    	window.web3 = new Web3(web3.currentProvider);
		  	} else {
		  		throw new Error("No injected web3 found.");
		  		//var web3_backup = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
		  		//window.web3 = web3_backup;
		  	}
		  	window.web3_backup = web3_backup;

		  	
		  	// web3.eth.filter("latest", function(){
		  	// 	console.log("Latest got something:", arguments);
		  	// });
		  	const niceWeb3 = new NiceWeb3(web3, ethAbi);
		  	niceWeb3.setCallHook(function(p){
		  		const name = `${p.metadata.contractName}.${p.metadata.fnName}()`;
		  		const isImmediate = !p.getTxHash;
		  		if (isImmediate) {
		  			p.then((res)=>{
		  				console.log(`${name} call returned result:`, res);
		  			})
		  		} else {
		  			console.log(`${name} waiting for txId...`);
		  			p.getTxHash.then((txHash)=>{
		  				console.log(`${name} got txHash: ${txHash}`)
		  			});
		  			p.then((res)=>{
			  			console.log(`${name} mined, with result:`, res);
			  		});
		  		}
		  	})
		  	Object.keys(ABIs).forEach((contractName) => {
		  		var abi = ABIs[contractName];
		  		window[contractName] = niceWeb3.createContractFactory("Registry", abi.abi, abi.unlinked_binary);
				window[`_${contractName}`] = web3_backup.eth.contract(abi.abi);
				console.log(`Set window.${contractName} to new niceWeb3ContractFactory`);
		  	});
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

