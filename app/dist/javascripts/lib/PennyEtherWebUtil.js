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
					const argsStr = Object.keys(e.argStrs)
						.map((name)=>`${name}: ${e.argStrs[name]}`)
						.join(", ");
					$("<div></div>")
						.text(`${e.name} - ${argsStr}`)
						.appendTo($ctnr);
				})
				return $ctnr;
			});
		};
	}
	
	window.PennyEtherWebUtil = PennyEtherWebUtil;
}())