(function(){
	function EthStatus(ethUtil, niceWeb3) {
		const _ethUtil = ethUtil;
		const _niceWeb3 = niceWeb3;
		const _self = this;
		const _$e = $(`
			<div class="EthStatus">
				<div class="icon">
					<img src="/images/ethereum.png" width="30"/>
					<div class="notifications">3</div>
				</div>
				<div class="content">
					<div class="network">
						<div class="left">
							<div class="connected"></div>	
							<div class="name"></div>
						</div>
						<div class="right">
							<span class="block"></span>
							<span class="blockTimeAgo"></span>
						</div>
					</div>
					<div class="account">
						<div class="address"></div>
						<div class="balance"></div>
					</div>
					<div class="pendingTxs">
						<div class="head">PennyEther Transactions
							<span class="clear" style="display: none;">(clear)</span>
						</div>
						<div class="no-txs">You have no pending transactions.</div>
						<div class="txs"></div>
					</div>
				</div>
				<div class="tx template" style="display: none;">
					<div class="table">
						<div class="left">
							<div class="status" data-tippy-trigger="mouseenter"></div>
						</div>
						<div class="right">
							<div class="contractName"></div>
							<div class="fnName tipped" data-tippy-trigger="mouseenter"></div>
							<div class="fnArgs" data-tippy-trigger="mouseenter">(...)</div>
							<div class="opts tipped" data-tippy-trigger="mouseenter">[opts]</div>
						</div>
					</div>
					<div style="display: none;">
						<div class="statusTip">
							<div class="title"></div>
							<div class="error"></div>
							<div class="gas"></div>
							<div class="events"></div>
						</div>
						<div class="argsTip">Tip for args</div>
						<div class="optsTip">Tip for opts</div>
					</div>
				</div>
			</div>
		`);
		// state stuff
		const _$icon = _$e.find(".icon").click(()=>_$e.toggleClass("open"));
		const _$block = _$e.find(".network .block");
		const _$blockTimeAgo = _$e.find(".network .blockTimeAgo");
		const _$networkConnected = _$e.find(".network .connected");
		const _$networkName = _$e.find(".network .name");
		const _$acctCtnr = _$e.find(".account");
		const _$acctAddr = _$e.find(".account .address");
		const _$acctBal = _$e.find(".account .balance");
		// txs stuff
		const _$notifications = _$e.find(".notifications").hide();
		const _$txTemplate = _$e.find(".tx.template");
		const _$txs = _$e.find(".txs");
		const _$noTxs = _$e.find(".no-txs");
		const _$clearPending = _$e.find(".clear").click(function(){
			_$clearPending.hide();
			_$txs.empty();
			_$noTxs.show();
			_$notifications.hide();
		}).hide();
		console.log(_$txs);

		// Keep track of latest block. Init to empty block.
		var _curState = {latestBlock: {}};
		var _timeOfLatestBlock = 0;

		// on state change, maybe update block - always refresh all.
		_ethUtil.onStateChanged(newState => {
			if (!newState.latestBlock || !_curState.latestBlock) {
				_timeOfLatestBlock = new Date();
			} else {
				if (newState.latestBlock.number !== _curState.latestBlock.number) {
					_timeOfLatestBlock = new Date();			
				}
			}
			_curState = newState;
			_refreshAll();
		});
		// on niceWeb3 call, display TX
		_niceWeb3.setCallHook(_onCall);

		function _refreshAll(){
			_refreshNetwork();
			_refreshAddress();
			_refreshBlock();
		}

		function _refreshNetwork(){
			const isConnected = _curState.isConnected;
			const networkId = _curState.networkId;
			const networkName = ({
				1: "MainNet",
				2: "Morden",
				3: "Ropsten",
				4: "Rinkeby",
				42: "Kovan"
			})[networkId] || `(Unknown Network)`;
			
			_$networkConnected
				.removeClass("true")
				.removeClass("false")
				.addClass(isConnected ? "true" : "false");
			if (isConnected){
				_$networkName.text(networkName);	
			} else {
				_$networkName.text("Not Connected!");
			}
			_$e.removeClass("off");
			if (!isConnected || !_curState.account) _$e.addClass("off");
		}

		function _refreshAddress(){
			const acctAddr = _curState.account;
			if (!acctAddr) {
				_$acctCtnr.addClass("none");
				_$acctAddr.text("⚠ No Account Available");
				return;
			} else {
				const acctStr = acctAddr.slice(0,6) + "..." + acctAddr.slice(-4);
				const $link = _ethUtil.$getLink(acctStr, acctAddr, "address")
				_$acctCtnr.removeClass("none");
				_$acctAddr.empty().append("Account: ").append($link);
				_$acctBal.text("...");
				_ethUtil.getBalance(acctAddr).then((res)=>{
					if (res===null) {
						_$acctBal.text("<error>");
					} else {
						_$acctBal.text(res.div(1e18).toFixed(4) + " ETH");
					}
				});
			}
		}

		function _refreshBlock(){
			const latestBlock = _curState.latestBlock;
			const isConnected = _curState.isConnected;
			if (!latestBlock || !isConnected) {
				_$block.text("").hide();
			} else {
				const str = `#${latestBlock.number}`;
				const $link = _ethUtil.$getLink(str, latestBlock.num, "block");
				_$block.show().empty().append($link);
			}
			_refreshBlockTimeAgo();
		}

		function _refreshBlockTimeAgo(){
			if (!_curState.isConnected || !_curState.latestBlock){
				_$blockTimeAgo.hide();
				return;
			}
			const secondsAgo = Math.round(((+new Date) - _timeOfLatestBlock)/1000);
			_$blockTimeAgo.show().text(`(${secondsAgo}s ago)`);
		}

		// todo:
		// 	- add tips for:
		//		- fnComment
		// 		- args 
		// 		- opts
		// 		- events
		//	- stylize
		function _onCall(p) {
	  		if (p.metadata.isConstant) return;

	  		// states: signing, tx-id-error, pending, tx-error
	  		const callName = p.metadata.callName;
	  		const $e = _$txTemplate.clone().show().prependTo(_$txs);
	  		console.log($e);
			const $table = $e.find(".table");
				const $contractName = $table.find(".contractName");
				const $fnName = $table.find(".fnName");
				const $fnArgs = $table.find(".fnArgs");
				const $opts = $table.find(".opts");
			const $status = $e.find(".status");
			const $events = $e.find(".events");
			const $statusTip = $e.find(".statusTip");
			const $fnTip = $e.find(".fnTip");
			const $argsTip = $e.find(".argsTip");
			const $optsTip = $e.find(".optsTip");
			const hasArgs = p.metadata.inputs.length > 0;

			// show _pendingTxs()
			const count = _$txs.children().length;
			_$clearPending.show();
			_$noTxs.hide();
			_$notifications.removeClass("new").show().text(count);
			setTimeout(()=>{ _$notifications.addClass("new"); }, 50);

			// fill out name and args
			$contractName.text(p.metadata.contractName);
			$fnName.text(p.metadata.fnName).attr("title", p.metadata.abiDef.comment);
			$fnArgs.text(hasArgs ? "(...)" : "()");

			// add Tips for fnName, opts, and optionally args
			tippy($status[0], {html: $statusTip[0]});
			tippy($fnName[0], {dynamicTitle: true});
			tippy($opts[0], {html: $optsTip[0]});
			if (hasArgs) {
				tippy($fnArgs[0], {html: $argsTip[0]});
				$fnArgs.addClass("tipped");
			}

  			$e.addClass("signing")
  			$status.text("Signing");
  			$statusTip.text("Your transaction is awaiting signature by your provider.");
  			p.getTxHash.then((txHash)=>{
  				const $link = util.$getTxLink("Pending", txHash);
  				$status.empty().append($link);
  				$statusTip.text("Your transaction is being mined into the blockchain.");
  				$e.removeClass("signing").addClass("pending");
  			},(e)=>{
  				$status.empty().append("Signing Error");	// todo: tooltip
  				$statusTip.html(`Your provider threw an error:<br><br>${e.message}`);
  				$e.removeClass("signing").addClass("tx-id-error");
  			});
  			p.then((res)=>{
  				onMined(res, false);
	  		}, (e)=>{
	  			// this errored out in getTx instead.
	  			if (!e.result) return;
	  			onMined(e, true);
	  		});

  			// update resultStatus
  			function onMined(resOrError, isError) {
  				const res = isError ? resOrError.result : resOrError;
  				const err = isError ? resOrError : null;
  				const txId = res.receipt.transactionHash;
  				const block = res.receipt.blockNumber;
  				const gasUsed = res.receipt.gasUsed;
  				const $link = util.$getTxLink(`Confirmed`, txId);
  				const events = res.events;
  				$status.empty().append($link);
  				$e.removeClass("waiting pending");
  				if (isError) {
  					$statusTip.text(`Your transaction was mined, but resulted in an error: ${err.message}. Click to view your transaction on Etherscan.`);
  					$e.addClass("tx-error");
  				} else {
  					$statusTip.text(`Your transaction was mined. Click to view it in on Etherscan.`);
  					$e.addClass("tx-success");
  				}
  				$events.show().text(`${events.length} events`);
  			}

	  		// open EthStatus, flash item
	  		$e.addClass("new");
		}

		this.$e = _$e;

		_init();
		function _init(){
			(function _poll() {
				_refreshBlockTimeAgo();
				setTimeout(_poll, 1000);
			}());	
		}
	}
	window.EthStatus = EthStatus;
}());