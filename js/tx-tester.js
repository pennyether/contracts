var TestUtil = require("./test-util");
/**
For use with truffle-contract, allows for chaining together common
test operations.

eg:

	TxTester.watch([address1, address2])
		.do( () => <tx promise> )
		.assertLostTxFee(address1)
        .assertDelta(address2, 123)
        .assertOneLog("SomeEvent", "Lost only txFee", {arg1: "arg1val", arg2: "arg2val"});
*/

function TxTester(web3, assert) {
	var _self = this;
	var _util = TestUtil.make(web3, assert);
	var _ledger = new _util.Ledger();
	var _done = true;

	// Anything added to this array gets tacked onto the .do() object.
	// Provided with a context of {chain, res, ledger, util}
	this.assertFns = {
		assertInvalidOpCode: function() {
			if (!this.err){
				throw new Exception("Expected call to fail.");
			}
			assert.include(this.err.message, "invalid opcode", "Error contains 'invalid opcode'");
		},
		assertLostTxFee: async function(address) {
			var txFee = await this.util.getTxFee(this.res.tx).mul(-1);
			var diff = this.ledger.getDelta(address)
			assert.strEqual(diff, txFee, "Address lost only the TxFee");
		},
		assertDelta: function(address, amt) {
			assert.strEqual(this.ledger.getDelta(address), amt, "balance was changed");
		},
		assertOneLog: function(eventName, args, address) {
			this.util.expectOneLog(this.res, eventName, args, address);
		},
		assertErrorLog: function(msg, address) {
			this.util.expectErrorLog(this.res, msg, address);
		}
	};

	// Optionally called before .do() if you wish to track balances
	this.watch = function(addresses) {
		if (!_done)
			throw new Error("Cannot use this until previous chain is done.");
		_ledger.reset(addresses);
		return this;
	};

	// Passed a function that returns a truffle-contract res object (or a promise of one)
	// Must be passed a function to ensure the ledger can start watching before
	// the transaction is started.
	this.do = function(resultFn) {
		if (!_done)
			throw new Error("Cannot use this until previous chain is done.");
		if (typeof resultFn !== 'function')
			throw new Error(".do must be passed a function");

		_done = false;

		var assertions = {};
		var assertionsChainStarted = false;
		// on next tick, set assertionChainStarted to true.
		// this means you can only add assertions on current tick.
		Promise.resolve().then(() => { assertionsChainStarted = true; });
		var addAssertion = function(name, fn) {
			if (assertionsChainStarted)
				throw Error("Cannot add assertion because they are already being run.");
			assertions[name] = fn;
		}
		// return a promise fulfilled when all assertions are done.
		var runAssertions = function() {
			var p = Promise.resolve();
			Object.keys(assertions).forEach(name => {
				p = p.then(assertions[name]).catch(assertionError => {
					assertionError.message = `txTester.${name} failed: ${assertionError.message}`;
					throw assertionError;
				});
			});
			return p;
		}	


		// this object will be passed as context to all assertions
		// res and err are set within the below chain
		var assertionContextObj = {
			chain: resChain,
			res: null,
			err: null,
			ledger: _ledger,
			util: _util,
		};

		// this fulfills when the resultFn, ledger, and all assertions are done.
		// We will add some handy methods to this promise at the end.
		var resChain = 
			Promise.resolve().then(_ledger.start).then(
				() => {
					return resultFn().catch(e => {
						assertionContextObj.err = e;
						return null;
					}).then(r => {
						assertionContextObj.res = r;
						return Promise.resolve().then(_ledger.stop).catch(ledgerError => {
							ledgerError.message = `txTester: Failed to stop ledger: ${ledgerError.message}`;
							throw ledgerError;
						});
					}).then(() => {
						return runAssertions();
					});
				},
				ledgerError => {
					ledgerError.message = `txTester: Failed to start ledger: ${ledgerError.message}`;
					throw ledgerError;
				}
			).then(
				() => {
					_done = true;
					_ledgerPromise = null;
				},
				err => {
					_done = true;
					_ledgerPromise = null;
					throw err;
				}
			);		

		// tack on the assertFns to the resChain for suger
		Object.keys(_self.assertFns).forEach( key => {
			resChain[key] = function(){
				// create a fn executed with the contextObj as context, and pass it arguments
				var args = Array.prototype.slice.call(arguments);
				var assertFn = _self.assertFns[key];
				var boundAssertFn =
					Function.prototype.bind.apply(assertFn, [assertionContextObj].concat(args));
				// add the assertion to the assertions array, if possible
				addAssertion(key, boundAssertFn);
				// return resChain to maintain chainable assert calls
				return resChain;
			};
		});

		return resChain;
	}
}
module.exports = TxTester;