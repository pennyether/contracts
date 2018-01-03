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

		this.toTime = function(timeS, numUnits) {
			try {
				numUnits = numUnits || 2;
				timeS = (new BigNumber(timeS)).round();
			} catch(e) {
				console.error("Val expected to be a number", timeS);
				return "<unknown>";
			}
			if (timeS.gt(60*60*24)){
				const days = timeS.div(60*60*24).floor();
				const hours = timeS.minus(days.mul(60*60*24)).div(60*60).floor();
				const minutes = timeS.minus(days.mul(60*60*24)).minus(hours.mul(60*60)).div(60).floor();
				if (numUnits == 1) return `${days}d`;
				if (numUnits == 2) return `${days}d ${hours}h`;
				return `${days}h ${hours}m ${minutes}m`;
			}
			if (timeS.gt(60*60)) {
				const hours = timeS.div(60*60).floor();
				const minutes = timeS.minus(hours.mul(60*60)).div(60).floor();
				const seconds = timeS.minus(hours.mul(60*60)).minus(minutes.mul(60)).floor();
				if (numUnits == 1) return `${hours}h`;
				if (numUnits == 2) return `${hours}h ${minutes}m`;
				return `${hours}h ${minutes}m ${seconds}s`;
			}
			if (timeS.gt(60)) {
				const minutes = timeS.div(60).floor();
				const seconds = timeS.minus(minutes.mul(60));
				if (numUnits == 1) return `${minutes}m`;
				return `${minutes}m ${seconds}s`;
			}
			return `${timeS}s`;
		}
	}
	
	window.PennyEtherWebUtil = PennyEtherWebUtil;
}())