function PennyAuctionUI(inst) {
	var _inst = inst;
	var _state = {};

	var _$ = $(`
		<div class='PennyAuction'>
			<div class='prize'>...</div>
			<div class='bid-price'>...</div>
			<div class='bid-fee-pct'>...</div>
			<div class='bid-time-s'>...</div>
			<div class='time-opened'>...</div>

			<div class='time-remaining'>...</div>
			<div class='num-bids'>...</div>
			<div class='current-winner'>...</div>
			<div class='state'>...</div>
			<button>bid</button>
		</div>
	`);
	var _$prize = _$.find(".prize");
	var _$bid_price = _$.find(".bid-price");
	var _$bid_fee_pct = _$.find(".bid-fee-pct");
	var _$bid_time_s = _$.find(".bid-time-s");
	var _$time_opened = _$.find(".time-opened");

	var _$time_remaining = _$.find(".time-remaining");
	var _$num_bids = _$.find(".num-bids");
	var _$current_winner = _$.find(".current-winner");
	var _$state =_$.find(".state");
	var _$button = _$.find("button").click(function(){
		inst.sendTransaction({value: _state.bidPrice.toNumber()})
			.then(function(res){
				console.log("bid result:", res);
			})
	});

	function toEther(bn) { return bn.div(1e18).toNumber().toFixed(3) + " ETH"; }
	function toPct(bn) { return bn.toNumber() + "%"; }
	function toDate(bn) {
		var d = new Date(bn.toNumber() * 1000);
		return d.toLocaleDateString() + " " + d.toLocaleTimeString();
	}
	function toDuration(bn){
		var hours = 0;
		var minutes = 0;
		var seconds = 0;
		var n = bn.toNumber();
		if (n > 60*60) {
			hours = Math.floor(n/(60*60));
			n = n - hours * 60 * 60;
		}
		if (n > 60) {
			minutes = Math.floor(n/60);
			n = n - minutes * 60;
		}
		seconds = n;
		return `${hours}:${minutes}:${seconds}`;
	}

	function _init(inst) {
		Promise.all([
			inst.prize(),
			inst.bidPrice(),
			inst.bidFeePct(),
			inst.bidTimeS(),
			inst.timeOpened()
		]).then(function(arr){
			_state.prize = arr[0];
			_state.bidPrice = arr[1];
			_state.bidFeePct = arr[2];
			_state.bidTimeS = arr[3];
			_state.timeOpened = arr[4];

			_$prize.text("Prize: " + toEther(_state.prize));
			_$bid_price.text("Bid Price: " + toEther(_state.bidPrice));
			_$bid_fee_pct.text("Bid Fee Pct: " + toPct(_state.bidFeePct));
			_$bid_time_s.text("Each bid adds: " + _state.bidTimeS + " seconds");
			_$time_opened.text("Time Opened: " + toDate(_state.timeOpened));
		});
		_update();
	}

	// loads state that may have changed
	function _update() {
		Promise.all([
			inst.numBids(),
			inst.getTimeRemaining(),
		]).then(function(arr){
			_state.numBids = arr[0];
			_$num_bids.text("Num Bids: " + _state.numBids);
			_$time_remaining.text("Time Left: " + toDuration(arr[1]));
		})
	}


	_init(inst);

	this.update = _update;
	this.get$ = function(){ return _$; };
}