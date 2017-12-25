(function(){
	function EthStatus(web3) {
		const _self = this;
		const _$e = $(`
			<div class="EthStatus">
				<div class="icon">
					<img src="/images/ethereum.png" width="30"/>
				</div>
				<div class="content">
					<div class="network">
						<div class="left">
							<div class="connected"></div>	
							<div class="name"></div>
						</div>
						<div class="right">
							<span class="block tipLeft" title="Latest block"></span>
							<span class="blockTimeAgo"></span>
						</div>
					</div>
					<div class="account">
						<div class="address">
							0x92348...8324
						</div>
						<div class="balance">
							4389.3491 ETH ↺
						</div>
					</div>
					<div>
						Pending Transactions:
						<div>
							<div>Bid on PennyAuction #2 ...</div>
							<div>Mining for 25s</div>
						</div>
					</div>
					<div>
						Recent Transactions:
						<div>
							<div>Bid on PennyAuction #2 ...</div>
							<div>Mined 40s ago (results)</div>
						</div>
					</div>
				</div>
			</div>
		`);
		const _$icon = _$e.find(".icon").click(()=>_$e.toggleClass("open"));
		const _$block = _$e.find(".network .block");
		const _$blockTimeAgo = _$e.find(".network .blockTimeAgo");
		const _$networkConnected = _$e.find(".network .connected");
		const _$networkName = _$e.find(".network .name");
		const _$acctCtnr = _$e.find(".account");
		const _$acctAddr = _$e.find(".account .address");
		const _$acctBal = _$e.find(".account .balance");

		// Once per second, see if any of these changed.
		// If they did, then refresh the whole state.
		// If not, update the blockTimeAgo and wait 1 second.
		const _curState = {};
		var _timeOfLatestBlock = 0;


		function _checkState() {
			function getLatestBlockNum() {
				return new Promise((resolve, reject)=>{
					web3.eth.getBlock("latest", function(err, res){
						if (err) reject(err);
						else resolve(res.number);
					});
				});
			}

			// returns the current state. on any error, will return
			// the not connected state.
			function getCurState() {
				const notConnectedState = {
					isConnected: false,
					account: null,
					networkId: null,
					latestBlock: null
				};
				if (!web3.isConnected()){
					return Promise.resolve(notConnectedState);
				}

				return Promise.resolve(getLatestBlockNum()).then(blockNum=>{
					return {
						isConnected: web3.isConnected(),
						account: web3.eth.accounts[0],
						networkId: web3.version.network,
						latestBlock: blockNum,
					}
				}).catch(e=>{
					console.log("Unexpected error getting new EthStatus state.", e);
					return notConnectedState;
				});
			}


			// for each property of newState, see if it's different.
			// if so, refresh everything. otherwise just refresh blockTimeAgo.
			getCurState().then((newState)=>{
				var doRefresh = false;
				Object.keys(newState).forEach((k)=>{
					if (newState[k] !== _curState[k]) {
						if (k==="latestBlock") _timeOfLatestBlock = new Date();
						doRefresh = true;
					}
					_curState[k] = newState[k];
				});
				if (doRefresh) _refreshAll();
				else _refreshBlockTimeAgo();
			}).then(()=>{
				setTimeout(_checkState, _curState.isConnected ? 1000 : 5000);
			}).catch((e)=>{
				console.log("Unexpected error updated EthStatus state.", e);
				setTimeout(_checkState, 1000);
			});
		}

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
			})[networkId] || `Id: ${networkId}`;
			
			_$networkConnected
				.removeClass("true")
				.removeClass("false")
				.addClass(isConnected ? "true" : "false");
			if (isConnected){
				_$e.removeClass("off");
				_$networkName.text(networkName);	
			} else {
				_$e.addClass("off");
				_$networkName.text("Not Connected!");
			}
			
		}

		function _refreshAddress(){
			function getBalance(addr){
				return new Promise((resolve, reject)=>{
					web3.eth.getBalance(addr, (err,res)=>{
						if (err) resolve(null);
						else resolve(res);
					});
				})
			}

			const acctAddr = _curState.account;
			if (!acctAddr) {
				_$acctCtnr.addClass("none");
				_$acctAddr.text("⚠ No Account Available");
				return;
			} else {
				_$acctCtnr.removeClass("none");
				_$acctAddr.text(acctAddr.slice(0,6) + "..." + acctAddr.slice(-4));
				_$acctBal.text("...");
				getBalance(acctAddr).then((res)=>{
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
				_$block.show().text(`#${latestBlock}`);
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

		this.$e = _$e;

		_checkState();
	}
	window.EthStatus = EthStatus;
}());