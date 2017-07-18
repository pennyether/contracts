window.addEventListener('load', function() {
	// check for global dependancies
	if (!window.Web3) throw new Error("Expected window.web3 to exist.");
	if (!window.TruffleContract){ throw new Error("window.TruffleContract not found!"); }
	if (!window.Artifacts){ throw new Error("window.Artifacts not found!"); }
	if (!window.PennyEth){ throw new Error("window.PennyEth not found!"); }
	if (!window.jQuery){ throw new Error("window.jQuery not found!"); }
	if (!window.PennyAuctionUi){ throw new Error("window.PennyAuctionUi not found!"); }

    // create web3 object depending on if its from browser or not
    var web3_backup = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
	if (typeof web3 !== 'undefined') {
    	window.web3 = new Web3(web3.currentProvider);
  	} else {
  		window.web3 = web3_backup;
  	}

  	// create some public variables.
  	window.web3_backup = web3_backup;
  	window.BigNumber = web3_backup.toBigNumber(0).constructor;
  	window.pennyEth = new PennyEth(Artifacts, TruffleContract, web3.currentProvider);

  	startApp();
});

function startApp() {
	pennyEth.initialize().then(function(){
		return pennyEth.getOpenAuctions();
	}).then(function(auctions){
		auctions.forEach(function(auction){
			(new PennyAuctionUi(auction)).get$().appendTo("body");
		});
	})
};