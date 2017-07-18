function PennyEth(Artifacts, Contract, provider){
	var _self = this;
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

	this.Artifacts = Artifacts;
	this.Contract = Contract;
	this.provider = provider;

	this.is_initialized = false;

	this.owner = null;
	this.admin = null;

	this.registry = null;
	this.pac = null;
	this.treasury = null;
	this.main_controller = null;
	this.pac = null;
	this.paf = null;

	this.initialize = function() {
		_self.is_initialized = false;
		return Registry.deployed().then(function(r){
			_self.registry = r;
			return Promise.all([
				r.addressOf("OWNER"),
				r.addressOf("ADMIN"),
				r.addressOf("TREASURY"),
				r.addressOf("MAIN_CONTROLLER"),
				r.addressOf("PENNY_AUCTION_CONTROLLER"),
				r.addressOf("PENNY_AUCTION_FACTORY")
			]);
		}).then(function(arr){
			_self.owner = arr[0];
			_self.admin = arr[1];
			_self.treasury = Treasury.at(arr[2]);
			_self.main_controller = MainController.at(arr[3]);
			_self.pac = PennyAuctionController.at(arr[4]);
			_self.paf = PennyAuctionFactory.at(arr[5]);
			_self.is_initialized = true;
		});
	};

	this.getOpenAuctions = function() {
		if (!_self.is_initialized){ throw new Error("Not yet initialized."); }
		return _self.pac.getNumOpenAuctions().then(function(num){
			var promises = [];
			for (var i=0; i<num.toNumber(); i++){
				promises.push(_self.pac.openAuctions(i));
			}
			return Promise.all(promises);
		}).then(function(addresses){
			return addresses.map(function(address){
				return PennyAuction.at(address);
			});
		});
	};
}