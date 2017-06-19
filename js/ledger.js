function Ledger(web3, addresses){
	var _self = this;
	this._web3 = web3;
	this._state = "new";
	this._start_balances = {};
	this._end_balances = {};
	this._addresses = addresses || [];
	this._deltas = {};

	this.reset = function(addresses){
		_self._state = "new";
		_self._start_balances = {};
		_self._end_balances = {};
		if (addresses !== undefined) _self._addresses = addresses;
		return _self;
	};

	this.start = function(){
		if (_self.state=="started")
			throw new Error("Ledger is already started.");

		_self._start_balances = getBalancesObject(web3, _self._addresses);
		_self._state = "started";
		return _self;
	}

	this.stop = function(){
		if (_self._state != "started")
			throw new Error("Ledger cannot be stopped -- it was never started.");

		_self._end_balances = getBalancesObject(web3, _self._addresses);
		_self._state = "stopped";
		_self._deltas = _self.getDeltas();
		return _self;
	}

	this.getDelta = function(address){
		var deltas = _self._deltas;
		if (!deltas.hasOwnProperty(address))
			throw new Error("Address was not added: " + address);
		return deltas[address];
	}

	this.getDeltas = function(){
		if (_self.state == "new")
			throw new Error("Ledger was never started.");
		if (_self._state != "stopped")
			throw new Error("Ledger must be stopped in order to get delta: " + _self._state);

		var obj = {};
		_self._addresses.forEach(address => {
			var end = _self._end_balances[address];
			var start = _self._start_balances[address];
			obj[address] = end.minus(start);
		});
		return obj;
	}
}

function getBalancesObject(web3, addresses){
	var obj = {};
	addresses.forEach(address => {
		obj[address] = web3.eth.getBalance(address);
	})
	return obj;
}

module.exports = Ledger;