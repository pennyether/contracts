window.addEventListener('load', function() {
	if (typeof web3 !== 'undefined') {
    	window.web3 = new Web3(web3.currentProvider);
  	} else {
  		if (!window.Web3) throw new Error("Could not find Web3");
    	window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  	}
  	startApp();
});

function startApp() {
	if (!window.TruffleContract){
		throw new Error("TruffleContract was not found -- ensure the script is being loaded.");
	}
	if (!window.Artifacts){
		throw new Error("Could not find artifacts!");
	}

	var Artifacts = window.Artifacts;
	var Contract = window.TruffleContract;
	var provider = web3.currentProvider;

	var Registry = Contract(Artifacts.Registry);
		Registry.setProvider(provider);
	var Treasury = Contract(Artifacts.Treasury);
		Treasury.setProvider(provider);
	var MainController = Contract(Artifacts.MainController);
		MainController.setProvider(provider);
	var PennyAuctionController = Contract(Artifacts.PennyAuctionController);
		PennyAuctionController.setProvider(provider);
	var PennyAuctionFactory = Contract(Artifacts.PennyAuctionFactory);
		PennyAuctionFactory.setProvider(provider);
	var PennyAuction = Contract(Artifacts.PennyAuction);
		PennyAuction.setProvider(provider);

	// other requires can go here
	var BigNumber = web3.toBigNumber(0).constructor;

	var accounts = web3.eth.accounts;
	var registry;
	var owner;
	var admin;
	var treasury;
	var mainController;
	var pac;
	var paf;
	var playground = new Playground(web3);


	$(function(){
		playground.get$().appendTo(document.body);

		// load registry, mainController, pac
		Registry.deployed().then(function(r){
			registry = r;
			return Promise.all([
				registry.addressOf("OWNER").then(ownerAddr => {
					owner = ownerAddr;
				}),
				registry.addressOf("ADMIN").then(adminAddr => {
					admin = adminAddr;
				}),
				registry.addressOf("TREASURY").then(tAddr => {
					treasury = Treasury.at(tAddr);
				}),
				registry.addressOf("MAIN_CONTROLLER").then(mcAddr => {
					mainController = MainController.at(mcAddr);
				}),
				registry.addressOf("PENNY_AUCTION_CONTROLLER").then(pacAddr => {
					pac = PennyAuctionController.at(pacAddr);
				}),
				registry.addressOf("PENNY_AUCTION_FACTORY").then(pafAddr =>{
					paf = PennyAuctionFactory.at(pafAddr);
				})
			])
		}).then(function(){
			playground.addInstance("Treasury", treasury);
			playground.addInstance("MainController", mainController);
			playground.addInstance("PennyAuctionController", pac);
			playground.addInstance("PennyAuctionFactory", paf);
		}).catch(function(e){
			alert("Error!  See console.");
			console.log(e);
		})
	});
};




function logEvent(name, eventLog){
	var $contents;
	if (eventLog){
		var title = name + " - " + eventLog.event + "  (Block: " + eventLog.blockNumber + ")";
		var args = Object.keys(eventLog.args).map(key => {
			return key + ": " + eventLog.args[key].toString();
		});
		$contents = $("<div></div>")
			.append($("<b></b>").text(title))
			.append($("<pre></pre>").text(args.join("\n")));
	} else {
		$contents = $("<div></div>")
			.append($("<b></b>").text(name));
	}

	$("<div>")
		.prependTo($("#log"))
		.css({
			borderRadius: 5,
			padding: "10px",
			margin: "10px",
			border: "1px solid gray"
		})
		.append($contents)
}