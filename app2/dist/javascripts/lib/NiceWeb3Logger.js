(function(){
	// receives calls from NiceWeb3 and displays them in the DOM
	function NiceWeb3Logger(niceWeb3){
		const _$e = $(`
			<style>
				.Web3Logger {
					position: fixed;
					background: #CCC;
					border: 1px solid black;
					padding: 10px;
					bottom: 10px;
					right: 10px;
				}

				.Web3Logger .call {
					margin: 5px;
					border: 1px solid gray;
					background: #DDD;
				}
				.Web3Logger .call .name {
					font-weight: bold;
					padding: 2px 4px;
					border-bottom: 1px solid gray;
				}
				.Web3Logger .call .transaction {
					font-size: 90%;
				}
				.Web3Logger .call .header {
					font-weight: bold;
					text-decoration: underline;
				}
				.Web3Logger .call .pending {
					color: gray;
				}
				.Web3Logger .call .error {
					color: red;
				}
				.Web3Logger .call .success {
					color: green;
				}
			</style>
			<div class="Web3Logger">
				<div>Test</div>
				<div class="calls"></div>
				<div class="tx template" style="display: none;">
					<div class="name"></div>
					<div class="hash">
						<div class="header">Transaction:</div>
						<div class="status"></div>
					</div>
					<div class="result" style="display: none;">
						<div class="header">Result:</div>
						<div class="status"></div>
					</div>
				</div>
				<div class="txs"></div>
			</div>
		`).appendTo(document.body);
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
  			},(e)=>{
  				$hashStatus.removeClass("pending")
  					.addClass("error")
  					.text(e.message);
  			}).then(()=>{
  				$result.show();
  				$resultStatus
  					.addClass("pending")
  					.text("Mining...");
  			});

  			// update resultStatus
  			p.then((res)=>{
	  			$resultStatus.removeClass("pending")
	  				.addClass("success")
	  				.text(`Mined.`);
	  		}, (e)=>{
	  			$resultStatus.removeClass("pending")
	  				.addClass("error")
	  				.text(e);
	  		});
		}

		this.$e = _$e;
	}

	window.NiceWeb3Logger = NiceWeb3Logger;
}());