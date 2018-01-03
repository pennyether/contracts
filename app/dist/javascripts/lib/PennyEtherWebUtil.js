(function(){

	function PennyEtherWebUtil(niceWeb3) {
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

		this.$getAddrLink = function(name, addr){
			return niceWeb3.ethUtil.$getLink(name, addr || name, "address");
		}
		this.$getTxLink = function(name, tx){
			return niceWeb3.ethUtil.$getLink(name, tx || name, "tx");
		}

		this.toTime = function(timeS) {
			try {
				timeS = (new BigNumber(timeS)).round();
			} catch(e) {
				console.error("Val expected to be a number", timeS);
				return "<unknown>";
			}
			if (timeS.gt(60*60)) {
				const hours = timeS.div(60*60).floor();
				const minutes = timeS.minus(hours.mul(60*60)).div(60).floor();
				return `${hours}h ${minutes}m`;
			}
			if (timeS.gt(60)) {
				const minutes = timeS.div(60).floor();
				const seconds = timeS.minus(minutes.mul(60));
				return `${minutes}m ${seconds}s`;
			}
			return `${timeS}s`;
		}
	}
	
	window.PennyEtherWebUtil = PennyEtherWebUtil;
}())