(function(){
	// receives calls from NiceWeb3 and displays them in the DOM
	function NiceWeb3Logger(niceWeb3){
		const _$e = $(`
			<div>
				<style>
					.Web3Logger {
						position: fixed;
						background: #CCC;
						border: 1px solid black;
						padding: 10px;
						bottom: 10px;
						right: 10px;
					}

					.Web3Logger .tx {
						margin: 2px 0px;
						border: 1px solid gray;
						background: #DDD;
					}
					.Web3Logger .tx .name {
						font-weight: bold;
						padding: 2px 4px;
						border-bottom: 1px solid gray;
					}
					.Web3Logger .body {
						padding: 3px;
					}
					.Web3Logger .tx .transaction {
						font-size: 90%;
					}
					.Web3Logger .tx .header {
						font-weight: bold;
						text-decoration: underline;
					}
					.Web3Logger .tx .pending {
						color: gray;
					}
					.Web3Logger .tx .error {
						color: red;
					}
					.Web3Logger .tx .success {
						color: green;
					}
				</style>
				<div class="Web3Logger">
					<div>Test</div>
					<div class="calls"></div>
					<div class="tx template" style="display: none;">
						<div class="name"></div>
						<div class="body">
							<div class="hash">
								<div class="header">Transaction:</div>
								<div class="status"></div>
							</div>
							<div class="result" style="display: none;">
								<div class="header">Result:</div>
								<div class="status"></div>
							</div>
						</div>
					</div>
					<div class="txs"></div>
				</div>
			</div>
		`);
		const _$txTemplate = _$e.find(".tx.template").removeClass(".template");
		const _$txs = _$e.find(".txs");
		const _$calls = _$e.find(".calls");

		const _niceWeb3 = niceWeb3;
		var _numPendingCalls = 0;
		var _numSuccessfulCalls = 0;
		var _numFailedCalls = 0;

		_niceWeb3.setCallHook(_onCall);

		function _onCall(p) {
	  		if (p.metadata.isConstant) {
	  			function updateCalls(){
	  				const str = [
	  					`Pending: ${_numPendingCalls}`,
	  					`Successful: ${_numSuccessfulCalls}`,
	  					`Failed: ${_numFailedCalls}`
	  				].join(", ");
					_$calls.text(str);
	  			}

	  			_numPendingCalls++;
	  			updateCalls();

	  			p.then((res)=>{
	  				_numSuccessfulCalls++;
	  				//console.log(`${p.metadata.callName} done.`, e, p);
	  			}, (e)=>{
	  				_numFailedCalls++;
	  				console.log(`${p.metadata.callName} failed.`, e, p);
	  			}).then(()=>{
	  				_numPendingCalls--;
	  				updateCalls();
	  			});
	  			return;
	  		}

	  		const callName = p.metadata.callName;
	  		const $e = _$txTemplate.clone().show().prependTo(_$txs);
			const $name = $e.find(".name").text(p.metadata.callName);
			const $hashStatus = $e.find(".hash .status");
			const $result = $e.find(".result");
			const $resultStatus = $e.find(".result .status");

	  		// wait for txHash. on success/error, show result status.
  			$hashStatus.addClass("pending").text("Waiting for transactionHash...");
  			p.getTxHash.then((txHash)=>{
  				$hashStatus.removeClass("pending")
  					.addClass("success")
  					.text(`${txHash}`);
  				$result.show();
  				$resultStatus.text("Mining...");
  			},(e)=>{
  				$hashStatus.removeClass("pending")
  					.addClass("error")
  					.text(e.message);
  			});

  			// update resultStatus
  			p.then((res)=>{
  				console.log(`${callName} success`, res);
	  			$resultStatus.removeClass("pending")
	  				.addClass("success")
	  				.text(`Mined.`);
	  		}, (e)=>{
	  			console.log(`${callName} failure`, e);
	  			$resultStatus.removeClass("pending")
	  				.addClass("error")
	  				.text(e.message);
	  		});
		}

		this.$e = _$e;
	}

	window.NiceWeb3Logger = NiceWeb3Logger;
}());