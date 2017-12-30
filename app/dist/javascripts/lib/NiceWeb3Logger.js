(function(){
	// receives calls from NiceWeb3 and displays them in the DOM
	function NiceWeb3Logger(niceWeb3){
		const _$e = $(`
			<div>
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
  					.empty()
  					.append(util.$getTxLink(txHash));
  				$result.show();
  				$resultStatus.text("Mining...");
  			},(e)=>{
  				$hashStatus.removeClass("pending")
  					.addClass("error")
  					.text(e.message);
  			});

  			// update resultStatus
  			p.then((res)=>{
  				console.log(`Success: ${callName}`, res);
	  			$resultStatus.removeClass("pending")
	  				.addClass("success")
	  				.text(`Mined.`);
	  		}, (e)=>{
	  			console.log(`Failure: ${callName}`, e);
	  			$resultStatus.removeClass("pending")
	  				.addClass("error")
	  				.text(e.message);
	  		});
		}

		this.$e = _$e;
	}

	window.NiceWeb3Logger = NiceWeb3Logger;
}());