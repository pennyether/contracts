window.addEventListener('load', function() {
	// check for global dependancies
	if (!window.Web3) throw new Error("Expected window.web3 to exist.");
	if (!window.TruffleContract){ throw new Error("window.TruffleContract not found!"); }
	if (!window.Artifacts){ throw new Error("window.Artifacts not found!"); }
	if (!window.PennyEth){ throw new Error("window.PennyEth not found!"); }
	if (!window.jQuery){ throw new Error("window.jQuery not found!"); }

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
	$(function(){
		$("<button>mine</button>").click(function(){
			// use backup, since others don't allow this method.
			web3_backup.currentProvider.send({
	            jsonrpc: "2.0",
	            method: "evm_mine",
	            params: null,
	            id: new Date().getTime()
	        });
		}).appendTo("body");

		$("<button>New Auction</button>").click(function(){
			var initialPrize = new BigNumber(.005e18);
			var bidPrice     = new BigNumber(.001e18);
			var bidTimeS     = new BigNumber(600);          // 10 minutes
			var bidFeePct    = new BigNumber(60);
			var auctionTimeS = new BigNumber(60*60*12);     // 12 hours

			pennyEth.main_controller.createPennyAuction(
				initialPrize,
				bidPrice,
				bidTimeS,
				bidFeePct,
				auctionTimeS,
				{from: pennyEth.admin, gas: 4000000}
			).then(function(res){
				console.log("created?", res);
			});
		}).appendTo("body");
	})
		
	pennyEth.initialize().then(function(){
		var playground = new Playground(web3);
		playground.get$().appendTo("body");
		playground.addInstance("Treasury", pennyEth.treasury);
		playground.addInstance("MainController", pennyEth.main_controller);
		playground.addInstance("PennyAuctionController", pennyEth.pac);
		playground.addInstance("PennyAuctionFactory", pennyEth.paf);
	});
};