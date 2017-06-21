function Ledger(web3, addresses){
	var _self = this;
	this._web3 = web3;
	this._addresses = [];
	this._state = "new";
	this._start_balances = {};
	this._end_balances = {};
	this._deltas = {};

	function init() {
		_self.setAddresses(addresses);
	}

	this.reset = function(addresses) {
		_self._state = "new";
		_self._start_balances = {};
		_self._end_balances = {};
		_self.setAddresses(addresses);
		return _self;
	};

	this.start = function() {
		if (_self.state=="started")
			throw new Error("Ledger is already started.");

		_self._start_balances = getBalancesObject(web3, _self._addresses);
		_self._state = "started";
		return _self;
	}

	this.stop = function() {
		if (_self._state != "started")
			throw new Error("Ledger cannot be stopped -- it was never started.");

		_self._end_balances = getBalancesObject(web3, _self._addresses);
		_self._state = "stopped";
		_self._deltas = _getDeltas();
		return _self;
	}

	this.getDelta = function(address) {
		if (_self.state == "new")
			throw new Error("Ledger was never started.");
		if (_self._state != "stopped")
			throw new Error("Ledger must be stopped in order to get delta: " + _self._state);

		address = _parseAddress(address);
		var deltas = _self._deltas;
		if (!deltas.hasOwnProperty(address))
			throw new Error("Address was not added: " + address);

		return deltas[address];
	}

	this.getDeltas = function() {
		if (_self.state == "new")
			throw new Error("Ledger was never started.");
		if (_self._state != "stopped")
			throw new Error("Ledger must be stopped in order to get delta: " + _self._state);

		return _self._deltas;
	}

	this.setAddresses = function(addresses) {
		_self._addresses = (addresses || []).map(_parseAddress);
	}

	function _parseAddress(address) {
		if (!address) throw new Error("Ledger: Invalid address passed: " + address);
		if (address.address) address = address.address;
		return address;
	}

	function _getDeltas() {
		var obj = {};
		_self._addresses.forEach(address => {
			var end = _self._end_balances[address];
			var start = _self._start_balances[address];
			obj[address] = end.minus(start);
		});
		return obj;
	}

	init();
}

function getBalancesObject(web3, addresses) {
	var obj = {};
	addresses.forEach(address => {
		obj[address] = web3.eth.getBalance(address);
	})
	return obj;
}

module.exports = Ledger;