(function(){

	function PennyEtherWebUtil(niceWeb3) {
		var _self = this;

		this.bindToElement = function bindToElement(promise, element, doAppend) {
			element.empty().text("loading...");
			promise.then(function(res){
				doAppend
					? element.empty().append(res)
					: element.empty().text(res);
			},function(e){
				element.empty().text(`Error: ${e.message}`);
			});
		};

		this.bindToInput = 	function bindToInput(promise, element) {
			element.empty().text("loading...");
			promise.then(function(res){
				element.val(res);
			},function(e){
				element.val(`Error: ${e.message}`);
			});
		}

		this.$getLogs = function $getLogs(instance, allAtOnce) {
			const lv = new LogViewer({
				events: [{
					instance: instance,
					name: "all"
				}],
				order: "newest",
				allAtOnce: allAtOnce
			});
			return Promise.resolve(lv.$e);
		};

		this.$getLogViewer = function(opts) {
			const lv = new LogViewer(opts);
			return lv.$e;
		}

		this.getGasPriceSlider = function(){
			return new GasPriceSlider();
		}

		this.$getShortAddrLink = function(addr) {
			const addrStr = addr.slice(0, 10) + "...";
			return _self.$getAddrLink(addrStr, addr);
		}
		this.$getAddrLink = function(name, addr){
			return niceWeb3.ethUtil.$getLink(name, addr || name, "address");
		}
		this.$getTxLink = function(name, tx){
			return niceWeb3.ethUtil.$getLink(name, tx || name, "tx");
		}
		this.$getLoadingBar = function(timeMs, speed) {
			return new LoadingBar(timeMs, speed);
		}

		this.toDateStr = function(timestampS){
			if (timestampS.toNumber) timestampS = timestampS.toNumber();
			var options = {
			    day: "numeric",
			    month: "short",
			    hour: "2-digit",
			    minute: "2-digit",
			    second: "2-digit"
			};
			return (new Date(timestampS*1000))
    			.toLocaleString(window.navigator.language, options);
		}

		this.getLocalTime = function(){
			return (new Date()).toLocaleString(window.navigator, {
				hour: "2-digit", minute: "2-digit", second: "2-digit"
			});
		}

		// returns something like "4h 3m 10s"
		this.toTime = function(timeS, numUnits, useColon) {
			try {
				numUnits = numUnits || 2;
				timeS = (new BigNumber(timeS)).round();
			} catch(e) {
				console.error("Val expected to be a number", timeS);
				return "<unknown>";
			}
			const days = timeS.div(60*60*24).floor();
			timeS = timeS.minus(days.mul(60*60*24));
			const hours = timeS.div(60*60).floor();
			timeS = timeS.minus(hours.mul(60*60));
			const minutes = timeS.div(60).floor();
			const seconds = timeS.minus(minutes.mul(60));
			if (days.gt(0)){
				if (numUnits == 1) return `${days}d`;
				if (numUnits == 2) return `${days}d ${hours}h`;
				return `${days}d ${hours}m ${minutes}m`;
			}
			if (hours.gt(0)) {
				if (numUnits == 1) return `${hours}h`;
				if (numUnits == 2) return `${hours}h ${minutes}m`;
				return `${hours}h ${minutes}m ${seconds}s`;
			}
			if (minutes.gt(0)) {
				if (numUnits == 1) return `${minutes}m`;
				return `${minutes}m ${seconds}s`;
			}
			return `${timeS}s`;
		}
	}

	// loading bar that always looks like it'll take timeMs to complete.
	// speed tunes how fast the bar will load (but also the rate at which it slows)
	// exponential functions are such a mathematical gem.
	function LoadingBar(timeMs, speed) {
		const _$e = $(`
			<div class='LoadingBar' style='font-size: 0px; height: 5px;'>
				<div class='loaded' style='height: 100%; position: relative; left: 0px; width: 0%'>&nbsp;</div>
			</div>
		`);
		const _$loaded = _$e.find(".loaded");
		const _startTime = (+new Date());
		const _speed = 1-speed;
		var _timeout;

		function _update() {
			const t = (+new Date()) - _startTime;
			var pct = (1 - Math.pow(_speed, t/timeMs)) * 100
			_$loaded.css("width", pct.toFixed(2) + "%");
			_timeout = setTimeout(_update, 30);
		}

		this.finish = function(durationMs){
			return new Promise((res,rej)=>{
				clearTimeout(_timeout);
				const startTime = (+new Date());
				const startPct = Number(_$loaded[0].style.width.slice(0, -1));
				(function update(){
					const t = Math.min(1, (+new Date() - startTime)/durationMs);
					const newPct = startPct + (100 - startPct)*t;
					_$loaded.css("width", `${newPct.toFixed(2)}%`);
					if (t == 1) res();
					else setTimeout(update, 50);
				}());
			});
		}
		this.$e = _$e;

		if (_speed <= 0 || _speed >= 1)
			throw new Error("Speed must be between 0 and 1");
		_update();
	}

	/*
		opts: {
			events: [{
				instance:
				name:
				filter: {	// topics are ANDed
					topicName: value,
					topic2Name: value
				}
			},{ ... }],
			$head: content to put into head
			// which order to retrieve logs
			order: 'newest' || 'oldest',
			// if set to true, will scan all blocks in one request.
			// useful for things with not an absurd amount of events.
			allAtOnce: false
			// if order == 'oldest', must be provided
			startBlock: [current block],
			// if order == 'newest', tells LogViewer when to stop looking
			stopFn: (event)=>true/false of should stop
			// formatting fns
			dateFn: (event, prevEvent, nextEvent)=>{str}
			valueFn: (event)=>{str}
		}
	*/
	function LogViewer(opts) {
		const _$e = $(`
			<div class='LogViewer'>
				<div class='head'></div>
				<div class='logs' style='overflow-y: auto;'>
					<div class='empty'>No Logs Found</div>
					<table cellspacing="0" cellpadding="0"></table>
				</div>
				<div class='status'></div>
			</div>
		`);
		if (!opts.order) opts.order = 'newest';
		if (!opts.events) throw new Error(`Must provide "events" option.`);
		if (opts.order=='oldest' && !opts.startBlock) throw new Error(`Must provide "startBlock"`);
		const _$logs = _$e.find(".logs").bind("scroll", _checkScroll)
		const _$head = _$e.find(".head");
		const _$table = _$e.find("table");
		const _$empty = _$e.find(".empty");
		const _$status = _$e.find(".status");

		const _order = opts.order;
		const _allAtOnce = opts.allAtOnce || false;
		const _startBlock = opts.startBlock || ethUtil.getCurrentBlockHeight().toNumber();
		const _endBlock = _order == 'newest' ? _startBlock - 500000 : _startBlock + 500000;
		const _stopFn = opts.stopFn || function(){};
		const _dateFn = opts.dateFn || _defaultDateFn;
		const _valueFn = opts.valueFn || _defaultValueFn;

		var _isDone = false;
		var _isLoading = false;
		var _prevBlock = _startBlock;	// the previously loaded block
		var _prevEvent = null;			// the previously loaded event
		var _$prevDateTd = null;		// the date cell of the _prevEvent
		var _leastFromBlock = Infinity;
		var _greatestToBlock = -1;
		
		var _requestCount = 0;

		function _checkScroll() {
			if (_isDone || _isLoading) return;

			const isNearBottom = _$logs[0].scrollHeight - _$logs.scrollTop() - _$logs.outerHeight() < 20;
  			if (!isNearBottom) return;
  			_loadMoreEvents().then(events=>{
  				if (events.length > 0) _$empty.hide();
  				events.forEach((event, i)=>{
  					const $row = $(`<tr></tr>`).appendTo(_$table);
  					const $dateTd = $(`<td class='date'></td>`).appendTo($row);
  					const $valueTd = $(`<td class='value'></td>`).appendTo($row);
  					const prevEvent = _order == 'newest' ? events[i+1] : _prevEvent;
  					const nextEvent = _order == 'newest' ? _prevEvent : events[i+1];
  					const $date = _dateFn(event, prevEvent, nextEvent);
  					const $value = _valueFn(event);
  					$dateTd.append($date);
  					$valueTd.append($value);
  					if (_$prevDateTd && i==0) {
  						const $lastDate = _dateFn(_prevEvent, prevEvent, nextEvent)
	  					_$prevDateTd.empty().append($lastDate);
	  				}
  					_isDone = _isDone || _stopFn(event);
					_prevEvent = event;
					_$prevDateTd = $dateTd;
  				});
  				_checkScroll();
  			});
		}

		function _loadMoreEvents() {
			// return if _isDone or _isLoading
			if (_isDone || _isLoading) return Promise.resolve([]);
			// compute from/to block
			var fromBlock, toBlock;
			if (_allAtOnce) {
	  			fromBlock = 0;
	  			toBlock = ethUtil.getCurrentBlockHeight().toNumber();
	  			_isDone = true;
	  		} else {
	  			if (_order == 'newest'){
					toBlock = _prevBlock;
					fromBlock = Math.max(_prevBlock - 4999, 0);
	  				_prevBlock = fromBlock - 1;
	  				if (fromBlock <= _endBlock) _isDone = true;
	  			} else {
	  				fromBlock = _prevBlock;
	  				toBlock = fromBlock + 4999;
	  				_prevBlock = toBlock + 1;
	  				if (toBlock >= _endBlock) _isDone = true;
	  			}
	  		}
	  		_greatestToBlock = Math.max(toBlock, _greatestToBlock);
	  		_leastFromBlock = Math.min(fromBlock, _leastFromBlock);

			// show that we're loading
			_isLoading = true;
			_$status.text(`Scanning blocks: ${fromBlock} - ${toBlock}...`);
  			// get promises for all events
  			const promises = opts.events.map((ev)=>{
  				if (!ev.instance) throw new Error(`opts.events.instance not defined.`);
  				if (!ev.name) throw new Error(`opts.events.name not defined.`);
  				return ev.name == "all"
  					? ev.instance.getAllEvents(fromBlock, toBlock)
  					: ev.instance.getEvents(ev.name, ev.filter, fromBlock, toBlock);
  			});
  			// concat all events, and sort. if none, try again in prev blocks
  			return Promise.all(promises).then((arr)=>{
  				function order(bool) {
  					return _order=='newest'
  						? bool ? -1 : 1
  						: bool ? 1 : -1;
  				}
  				_isLoading = false;
  				_$status.text(`Scanned blocks: ${_leastFromBlock} - ${_greatestToBlock}.`);

  				var allEvents = [];
  				arr.forEach((events)=>{ allEvents = allEvents.concat(events) });
  				allEvents.sort((a,b)=>{
					return a.blockNumber == b.blockNumber
						? order(a.logIndex > b.logIndex)
						: order(a.blockNumber > b.blockNumber)
				});
  				return allEvents.length
  					? allEvents
  					: _loadMoreEvents();
  			});
		}

		function _defaultDateFn(e) {
			const dateStr = e.args.time
				? util.toDateStr(e.args.time)
				: "Unknown";
			return util.$getTxLink(dateStr, e.transactionHash);
		}
		function _defaultValueFn(e) {
			const $argVals = Object.keys(e.args)
				.filter(name=>name!=="time")
				.map(name=>{
					const val = e.args[name];
					const $e = $("<span></span>").append(`<b>${name}</b>: `);
					if (val.toNumber && val.gt(1000000000)){
						$e.append(ethUtil.toEthStr(val));	
					} else if (!val.toNumber && val.toString().length==42) {
						$e.append(util.$getShortAddrLink(val));
					} else {
						$e.append(val.toString());
					}
					return $e;
				})
			const $e = $("<div></div>").append(`<b>${e.name}</b> - `);
			$argVals.forEach(($v,i)=>{
				if (i!==0) $e.append(", ");
				$e.append($v)
			});
			return $e;
		}

		this.$e = _$e;

		_$head.empty().append(opts.$head || "Log Viewer");
		_checkScroll();
	}

	// A slider to help the user choose a gas price.
	function GasPriceSlider(defaultValue){
		const _$e = $(`
			<div class="GasPriceSlider">
				<div class='head'>Choose Gas Price</div>
				<div class='loading'></div>
				<div class='content'>
					<input type="range" increment="1" class="slider">
					<div class='description'>
						<div class='gasPrice'></div>
						<div class='wait'></div>
					</div>
				</div>
			</div>
		`);
		const _$loading = _$e.find(".loading").text("Not initialized.").show();
		const _$content = _$e.find(".content").hide();
		const _$gasPrice = _$e.find(".gasPrice");
		const _$wait = _$e.find(".wait");
		const _$slider = _$e.find("input").on("input", _onSliderChanged);
		var _gasData = {};
		var _value = defaultValue;
		var _hasValue = false;

		function _refresh() {
			_$loading.show().text(`Loading gas data...`);
			_$content.hide();
			ethUtil.getGasPrices().then(data=>{
				// get min and max, populate gasData
				var min = null;
				var max = null;
				_gasData = {};
				data.forEach(d=>{
					_gasData[d.gasPrice] = d;
					if (!min && d.waitTimeS <= 4*60*60) min = d.gasPrice;
					if (!max && d.waitBlocks <= 2) max = d.gasPrice;
					if (!_value && d.waitTimeS <= 60) _value = d.gasPrice;
				});
				_$slider.attr("min", min);
				_$slider.attr("max", max);
				_$slider.val(_value);
				if (_$slider.val() > max) _$slider.val(max);
				if (_$slider.val() < min) _$slider.val(min);
				_$loading.hide();
				_$content.show();
				_hasValue = true;
				_onSliderChanged();
			}, (e)=>{
				_hasValue = false;
				_$loading.show().text(`Error: ${e}`);
				_$content.hide();
			});
		}

		function _onSliderChanged() {
			const val = _$slider.val();
			const data = _gasData[val];
			const blocks = data.waitBlocks;
			const timeStr = util.toTime(Math.round(data.waitTimeS));

			_value = val;
			_$gasPrice.text(`${val} GWei`);
			_$wait.removeClass("fast slow");
			if (data.waitTimeS <= 60) _$wait.addClass("fast");
			else if (data.waitTimeS > 60*15) _$wait.addClass("slow");
			_$wait.text(`~${blocks} Blocks (${timeStr})`);
		}

		this.getValue = function(){
			if (!_hasValue) return;
			return (new BigNumber(_value)).mul(1e9);
		}
		this.refresh = _refresh;
		this.$e = _$e;
	}
	
	window.PennyEtherWebUtil = PennyEtherWebUtil;
}())