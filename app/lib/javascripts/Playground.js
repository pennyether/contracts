(function(){
	var __$style =
	$(`
		<style type='text/css'>
			.Playground {
				position: absolute;
				top: 5px;
				right: 5px;
				width: 400px;
				height: 90%;
				border: 1px solid black;
				padding: 5px;
				overflow-y: auto;
			}
			.Playground .Instance {
				border-radius: 5px;
				border: 1px solid gray;
				margin: 10px;
			}
			.Playground .title {
				border-bottom: 1px solid gray;
				padding: 5px;
				position: relative;
				background: #CCC;
			}
				.Playground .title .name {
					font-weight: bold;
					display: inline-block;
				}
				.Playground .title .address {
					display: inline-block;
					font-size: 50%;
				}
				.Playground .title .balance {
					display: inline-block;
					padding: 1px 5px;
					border-radius: 3px;
					border: 1px inset #DDD;
					background: #DDD;
				}
				.Playground .title .remove {
					position: absolute;
					right: 2px;
					top: 2px;
					display: inline-block;
					position: absolute;
					cursor: pointer;
					padding: 0px 4px;
					background: red;
					border: 1px solid gray;
					color: white;
					border-radius: 4px;
				}
			.Playground .info {
				background: #FAFAFA;
			}
			.Playground .tabber {
				display: inline-block;
				position: absolute;
				right: 0px;
			}
				.Playground .tabber .tab {
					display: inline-block;
					margin: 0px 2px;
					padding: 2px 5px;
					border: 1px solid #AAA;
					cursor: pointer;
					background: white;
				}
				.Playground .tabber .tab.on {
					background: navy;
					color: white;
				}
				.Playground .tabber-contents {
					padding: 5px;
				}
			.Playground .event {
				border: 1px solid blue;
				padding: 3px;
				margin: 4px;
			}
			.Playground .ctnr-events .clear-events {
				color: maroon;
				cursor: pointer;
			}
		</style>
	`);
	var __styleIsInjected;
	function __injectStyle(){
		if (!__styleIsInjected){ __$style.appendTo("head"); }
	};

	function Playground(web3){
		__injectStyle();
		var _self = this;
		// var _blockWatcher = web3.eth.filter("latest", (err, res)=>{
		// 	_self.onBlockChange(res);
		// });

		var _$ = $(`
			<div class='Playground'></div>
		`);

		var _instances = [];

		this.addInstance = function(name, inst){
			var instance = new Instance(name, inst);
			instance.get$().appendTo(_$);
			_instances.push(instance);

			instance.beforeKill(function(){
				var index = instances.indexOf(instance);
				instances.splice(index, 1);
			});
		};
		this.onBlockChange = function(res){
			_instances.forEach(i => { i.updateBalance(); });
		};
		this.get$ = () => _$;

	}

	function Instance(name, inst){
		var _self = this;
		var _inst = inst;
		var _web3 = inst.constructor.web3;
		var _curBalance = 0;
		var BigNumber = _web3.toBigNumber().constructor;

		var _$ = $(`
			<div class='Instance'>
				<div class='title'>
					<div class='name'>name</div>
					<div class='address'>address</div>
					<br>
					<div class='balance'>balance</div>
					<div class='tabber'>
						<div class='tab-funcs tab'>Funcs</div>
						<div class='tab-events tab'>Events</div>
					</div>
					<div class='remove'>x</div>
				</div>
				<div class='info'>
					<div class='tabber-contents'>
						<div class='ctnr-funcs'></div>
						<div class='ctnr-events'>
							<div class='options'>
								<span class='clear-events'>clear</span>
							</div>
							<div class='events'></div>
						</div>
					</div>
				</div>
			</div>
		`);

		var _$name = _$.find(".title .name");
		var _$address = _$.find(".title .address");
		var _$balance = _$.find(".title .balance");
		var _$remove = _$.find(".title .remove");
		
		var _$tabFuncs = _$.find(".tab-funcs");
		var _$tabEvents = _$.find(".tab-events");
		var _$ctnrFuncs = _$.find(".ctnr-funcs");
		var _$ctnrEvents = _$.find(".ctnr-events");
		var _$events = _$.find(".events");

		var _$events = _$.find(".events");
		var _$clear_events = _$.find(".clear-events");

		// var _watcher = inst.allEvents(function(err, event){
		// 	if (!err && event.address==_inst.address) _self.addEvent(event);
		// });

		function _init(name, inst){
			_$remove.click(function(){ _self.kill(); });
			_$clear_events.click(function(){ _$events.empty(); });
			_$tabFuncs.click(function(){ _self.toggleTab("funcs"); });
			_$tabEvents.click(function(){ _self.toggleTab("events"); });

			_createFuncs();

			_self.toggleTab("events");
			_self.setName(name);
			_self.setAddress(inst.address);
			_self.updateBalance();
		}

		function _createFuncs() {
			// _inst.abi:
			/**
			[{
				constant: true || false
				name: "method name"
				payable: true || false
				type: "function" || "constructor" || "event"
				inputs: [{
					name: "whatever"
					type: "uint256"
				}]
				outputs: [{
					name: ""
					type: "uint256"
				}]
			}]
			*/
			_inst.abi.map((entry) => {
				return {
					abiEntry: entry,
					$: $("<div class='function'></div>")
				}
			});
		}

		// public methods
		this.setName = function(name){
			_$name.text(name);
		}
		this.setAddress = function(addr){
			_$address.text(addr);
		};
		this.updateBalance = function(){
			_web3.eth.getBalance(_inst.address, function(err, amt){
				if (err) return;

				if (typeof amt != "object"){ amt = new BigNumber(amt); }
				_$balance.text(amt.div(1e18).toNumber().toFixed(5) + " ETH");
				if (!amt.equals(_curBalance)) {
					_$balance.css({"background": "green"});
					setTimeout(function(){
						_$balance.css({"background": ""});
					}, 5000);
				}
				_curBalance = amt;
			});
		};
		this.addEvent = function(event){
			var $event = $(`
				<div class='event'>
					<div class='name'></div>
					<pre class='args'></pre>
				</div>
			`);
			// set title
			$event.find(".name").text(event.event + " (Block " + event.blockNumber + ")");
			// set args
			var chunks = [];
			Object.keys(event.args).forEach((arg)=>{
				var val = event.args[arg];
				var asString;
				if (val.toNumber) {
					if (val.greaterThan(1e12)){
						asString = val.div(1e18).toNumber().toFixed(5) + " ETH?";	
					} else if (val.greaterThan(1400000000) && val.lessThan(1600000000)){
						asString = (new Date(val.toNumber()*1000)).toString();
					} else {
						asString = val.toNumber();
					}
				} else {
					asString = val.toString();
				}
				chunks.push(arg + ": " + asString);
			});
			$event.find(".args").text(chunks.join("\n"));
			// add it.
			$event.prependTo(_$events);
		};
		this.toggleTab = function(str){
			if (str=="events"){
				_$tabEvents.addClass("on");
				_$ctnrEvents.show();
				_$tabFuncs.removeClass("on");
				_$ctnrFuncs.hide();
			} else if (str=="funcs"){
				_$tabEvents.removeClass("on");
				_$ctnrEvents.hide();
				_$tabFuncs.addClass("on");
				_$ctnrFuncs.show();
			}
		}
		this.kill = function(){
			_self.beforeKill();
			_watcher.stopWatching();
			_$.remove();
		};

		// events
		this.beforeKill = function(){}

		this.get$ = function(){
			return _$;
		}

		_init(name, inst);
	}

	window.Playground = Playground;
}())