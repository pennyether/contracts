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

		this.$getLogs = function $getLogs(instance) {
			return niceWeb3.getAllEvents(instance).then((events)=>{
				const $ctnr = $("<div class='logs'></div>");
				events.reverse().forEach((e)=>{
					const argsStr = Object.keys(e.args)
						.map((name)=>`${name}: ${e.args[name]}`)
						.join(", ");
					$("<div></div>")
						.text(`${e.name} - ${argsStr}`)
						.appendTo($ctnr);
				})
				return $ctnr;
			});
		};

		this.$getLogViewer = function(opts) {
			const lv = new LogViewer(opts);
			return lv.$e;
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
			// if order == 'oldest', must be provided
			startBlock: [number]
			// if order == 'newest', must be provided
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
					<table cellspacing="0" cellpadding="0"></table>
				</div>
			</div>
		`);
		if (!opts.order) opts.order == 'newest';
		if (!opts.events) throw new Error(`Must provide "events" option.`);
		if (opts.order=='newest' && !opts.stopFn) throw new Error(`Must provide "stopFn" option.`);
		if (opts.order=='oldest' && !opts.startBlock) throw new Error(`Must provide "startBlock"`);
		const _$logs = _$e.find(".logs").bind("scroll", _checkScroll)
		const _$head = _$e.find(".head");
		const _$table = _$e.find("table");
		const _order = opts.order;
		const _dateFn = opts.dateFn || _defaultDateFn;
		const _valueFn = opts.valueFn || _defaultValueFn;
		const _stopFn = opts.stopFn;
		const _startBlock = opts.startBlock || ethUtil.getCurrentBlockHeight().toNumber();
		const _endBlock = _order == 'newest' ? _startBlock - 500000 : _startBlock + 500000;
		var _isDone = false;
		var _isLoading = false;
		var _lastEvent = null;
		var _lastBlock = _startBlock;
		var _$lastDateTd = null;

		function _checkScroll() {
			if (_isDone || _isLoading) { return; }
			const isNearBottom = _$logs[0].scrollHeight - _$logs.scrollTop() - _$logs.outerHeight() < 1;
  			if (!isNearBottom) return;
  			_loadMoreEvents().then(events=>{
  				const lastEvent = null;
  				const nextEvent = null;

  				events.forEach((event, i)=>{
  					const $row = $(`<tr></tr>`).appendTo(_$table);
  					const $dateTd = $(`<td class='date'></td>`).appendTo($row);
  					const $valueTd = $(`<td class='value'></td>`).appendTo($row);
  					const prevEvent = _order == 'newest' ? events[i+1] : _lastEvent;
  					const nextEvent = _order == 'newest' ? _lastEvent : events[i+1];
  					const $date = _dateFn(event, prevEvent, nextEvent);
  					const $value = _valueFn(event);
  					$dateTd.append($date);
  					$valueTd.append($value);
  					if (_$lastDateTd && i==0) {
  						const $lastDate = _dateFn(_lastEvent, prevEvent, nextEvent)
	  					_$lastDateTd.empty().append($lastDate);
	  				}
  					_isDone = _isDone || _stopFn(event);
					_lastEvent = event;
					_$lastDateTd = $dateTd;
  				});
  				_checkScroll();
  			});
		}

		function _loadMoreEvents() {
			// return if _isDone
			if (_isDone || _isLoading) {
				return Promise.resolve([]);
			}
			// compute from/to block
			var fromBlock, toBlock;
			if (_order == 'newest'){
				toBlock = _lastBlock;
				fromBlock = Math.max(_lastBlock - 499, 0);
  				_lastBlock = fromBlock - 1;
  				if (fromBlock <= _endBlock) _isDone = true;
  			} else {
  				fromBlock = _lastBlock;
  				toBlock = fromBlock + 499;
  				_lastBlock = toBlock + 1;
  				if (toBlock >= _endBlock) _isDone = true;
  			}
			// show that we're loading
			_isLoading = true;
			const $loading = $("<div class='loading'></div>")
				.text(`Loading logs from blocks ${fromBlock} - ${toBlock}...`)
				.appendTo(_$logs);
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
  				$loading.remove();

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

		this.$e = _$e;

		_$head.empty().append(opts.$head || "Log Viewer");
		_checkScroll();
	}
	
	window.PennyEtherWebUtil = PennyEtherWebUtil;
}())