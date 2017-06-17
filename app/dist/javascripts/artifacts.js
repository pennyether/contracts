/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 6);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = {
	"contract_name": "MainController",
	"abi": [
		{
			"constant": true,
			"inputs": [],
			"name": "getPennyAuctionController",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [],
			"name": "changePennyAuctionSettings",
			"outputs": [],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getTreasury",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getRegistry",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getAdmin",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getOwner",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [
				{
					"name": "_minFeeThreshold",
					"type": "uint256"
				}
			],
			"name": "updatePennyAuctions",
			"outputs": [
				{
					"name": "_didUpdate",
					"type": "bool"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [
				{
					"name": "_initialPrize",
					"type": "uint256"
				},
				{
					"name": "_bidPrice",
					"type": "uint256"
				},
				{
					"name": "_bidTimeS",
					"type": "uint256"
				},
				{
					"name": "_bidFeePct",
					"type": "uint256"
				},
				{
					"name": "_auctionTimeS",
					"type": "uint256"
				}
			],
			"name": "createPennyAuction",
			"outputs": [
				{
					"name": "_pennyAuction",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"inputs": [
				{
					"name": "_registry",
					"type": "address"
				}
			],
			"payable": false,
			"type": "constructor"
		},
		{
			"payable": true,
			"type": "fallback"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "addr",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				}
			],
			"name": "PennyAuctionStarted",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "numAuctionsClosed",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				}
			],
			"name": "UpdatedPennyAuctions",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "initialPrize",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidPrice",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidTimeS",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidFeePct",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "auctionTimeS",
					"type": "uint256"
				}
			],
			"name": "CreateCalled",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160208061069d83398101604052515b805b815b825b825b600160a060020a038116151561003c5760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b505b505b61062c806100716000396000f300606060405236156100725763ffffffff60e060020a600035041663028078c2811461007b57806316a85370146100a75780633b19e84a146100b95780635ab1bd53146100e55780636e9960c314610111578063893d20e81461013d578063b6533f9e14610169578063df15196d14610190575b6100795b5b565b005b341561008357fe5b61008b6101cb565b60408051600160a060020a039092168252519081900360200190f35b34156100af57fe5b6100796101fa565b005b34156100c157fe5b61008b610226565b60408051600160a060020a039092168252519081900360200190f35b34156100ed57fe5b61008b610245565b60408051600160a060020a039092168252519081900360200190f35b341561011957fe5b61008b610255565b60408051600160a060020a039092168252519081900360200190f35b341561014557fe5b61008b610271565b60408051600160a060020a039092168252519081900360200190f35b341561017157fe5b61017c6004356102e9565b604080519115158252519081900360200190f35b341561019857fe5b61008b600435602435604435606435608435610460565b60408051600160a060020a039092168252519081900360200190f35b60006101f4604160020a772822a7272cafa0aaa1aa24a7a72fa1a7a72a2927a62622a902610590565b90505b90565b610202610271565b600160a060020a031633600160a060020a03161415156100765760006000fd5b5b5b565b60006101f460c060020a67545245415355525902610590565b90505b90565b600054600160a060020a03165b90565b60006101f460d960020a6420a226a4a702610590565b90505b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156102ce57fe5b6102c65a03f115156102dc57fe5b5050604051519150505b90565b600060006102f5610255565b600160a060020a031633600160a060020a03161415156103155760006000fd5b61031d6101cb565b9050600081600160a060020a03166384621ac66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561036757fe5b6102c65a03f1151561037557fe5b5050506040518051905011806103e757508281600160a060020a03166340806f7c6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156103cd57fe5b6102c65a03f115156103db57fe5b50505060405180519050115b15610454576103f46101cb565b600160a060020a03166385464ad36000604051604001526040518163ffffffff1660e060020a028152600401809050604060405180830381600087803b151561043957fe5b6102c65a03f1151561044757fe5b5060019350610459915050565b600091505b5b50919050565b6000600061046c610255565b600160a060020a031633600160a060020a031614151561048c5760006000fd5b610494610226565b600160a060020a031663c12eab90886000604051602001526040518263ffffffff1660e060020a02815260040180828152602001915050602060405180830381600087803b15156104e157fe5b6102c65a03f115156104ef57fe5b506104fc91506101cb9050565b905080600160a060020a0316638d3054378889898989896000604051602001526040518763ffffffff1660e060020a02815260040180868152602001858152602001848152602001838152602001828152602001955050505050506020604051808303818588803b151561056c57fe5b6125ee5a03f1151561057a57fe5b505060405151935050505b5b5095945050505050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156105e357fe5b6102c65a03f115156105f157fe5b5050604051519150505b9190505600a165627a7a72305820345dbf1a1839a8dba149edb05e71960b70be2adab74e6c7e8b923b7bd92891080029",
	"networks": {
		"1497250094702": {
			"links": {},
			"events": {},
			"updated_at": 1497335739771,
			"address": "0x2323addbb06813cd52bfcb44a459547cc30ab808"
		},
		"1497564287593": {
			"events": {
				"0x767f6158e677670f2af7e39aea0760d1f0dd3fcf03db82202cb22f3a99836c23": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						}
					],
					"name": "PennyAuctionStarted",
					"type": "event"
				},
				"0x20b70612292d490053134f41f1fc28ded3ffd9c2db6b61e6facf48e617876a0e": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "numAuctionsClosed",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						}
					],
					"name": "UpdatedPennyAuctions",
					"type": "event"
				}
			},
			"links": {},
			"address": "0xa9d0c56e8dd0f67ef4587f47299103bc1a18ca12",
			"updated_at": 1497652521705
		},
		"1497654807337": {
			"events": {
				"0x767f6158e677670f2af7e39aea0760d1f0dd3fcf03db82202cb22f3a99836c23": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						}
					],
					"name": "PennyAuctionStarted",
					"type": "event"
				},
				"0x20b70612292d490053134f41f1fc28ded3ffd9c2db6b61e6facf48e617876a0e": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "numAuctionsClosed",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						}
					],
					"name": "UpdatedPennyAuctions",
					"type": "event"
				},
				"0x2c9f40b4165ee09ae6cefcbd24396426aff35b665629390101567677f1beeea1": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "CreateCalled",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x70486690ebaab87d230377cfea0bf4b29d34d97e",
			"updated_at": 1497659500743
		},
		"1497667709496": {
			"events": {
				"0x767f6158e677670f2af7e39aea0760d1f0dd3fcf03db82202cb22f3a99836c23": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						}
					],
					"name": "PennyAuctionStarted",
					"type": "event"
				},
				"0x20b70612292d490053134f41f1fc28ded3ffd9c2db6b61e6facf48e617876a0e": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "numAuctionsClosed",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						}
					],
					"name": "UpdatedPennyAuctions",
					"type": "event"
				},
				"0x2c9f40b4165ee09ae6cefcbd24396426aff35b665629390101567677f1beeea1": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "CreateCalled",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x853c8ce3a35b71ef223b0e0c39308ecbf74e442b",
			"updated_at": 1497667719889
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497667719889
};

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = {
	"contract_name": "PennyAuction",
	"abi": [
		{
			"constant": true,
			"inputs": [],
			"name": "bidPrice",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "isClosedOrRedeemed",
			"outputs": [
				{
					"name": "_bool",
					"type": "bool"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "bidFeePct",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "timeOpened",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [],
			"name": "redeemFees",
			"outputs": [
				{
					"name": "_feesSent",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "timeClosed",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [],
			"name": "close",
			"outputs": [],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "bidTimeS",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "isCloseable",
			"outputs": [
				{
					"name": "_bool",
					"type": "bool"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "initialPrize",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "collector",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "fees",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "currentWinner",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [],
			"name": "redeem",
			"outputs": [
				{
					"name": "_prizeSent",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "state",
			"outputs": [
				{
					"name": "",
					"type": "uint8"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "isClosed",
			"outputs": [
				{
					"name": "_bool",
					"type": "bool"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "auctionTimeS",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "numBids",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getTimeRemaining",
			"outputs": [
				{
					"name": "_timeRemaining",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "prize",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "admin",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [],
			"name": "open",
			"outputs": [],
			"payable": true,
			"type": "function"
		},
		{
			"inputs": [
				{
					"name": "_admin",
					"type": "address"
				},
				{
					"name": "_collector",
					"type": "address"
				},
				{
					"name": "_initialPrize",
					"type": "uint256"
				},
				{
					"name": "_bidPrice",
					"type": "uint256"
				},
				{
					"name": "_bidTimeS",
					"type": "uint256"
				},
				{
					"name": "_bidFeePct",
					"type": "uint256"
				},
				{
					"name": "_auctionTimeS",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "constructor"
		},
		{
			"payable": true,
			"type": "fallback"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				}
			],
			"name": "Started",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "bidder",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				}
			],
			"name": "BidOccurred",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "winner",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "prize",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "numBids",
					"type": "uint256"
				}
			],
			"name": "Closed",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "redeemer",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "recipient",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "amtSent",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "successful",
					"type": "bool"
				}
			],
			"name": "RedeemAttempted",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160e080610aea83398101604090815281516020830151918301516060840151608085015160a086015160c09096015193959293919290915b600085116100555760006000fd5b600084116100635760006000fd5b603c8310156100725760006000fd5b60648211156100815760006000fd5b6102588110156100915760006000fd5b60008054600160a060020a03808a16600160a060020a031992831617835560018054918a16919092161781556002879055600386905560058590556004849055600683905560088054909160ff1990911690835b02179055505b505050505050505b6109e8806101026000396000f3006060604052361561010c5763ffffffff60e060020a60003504166319afe47381146102055780631ebcd53f14610227578063267410031461024b5780632e1a0f321461026d5780633a047bb31461028f57806343713d35146102b157806343d726d6146102d357806346ac5e2b146102e55780637a00cf4614610307578063856631191461032b578063913e77ad1461034d5780639af1d35a14610379578063aabe2fe31461039b578063be040fb0146103c7578063c19d93fb146103e9578063c2b6b58c1461041d578063c326186e14610441578063ce9ec0a614610463578063dac6270d14610485578063e3ac5d26146104a7578063f851a440146104c9578063fcfff16f146104f5575b6102035b60006001805b60085460ff16600381111561012757fe5b146101325760006000fd5b600a5433600160a060020a039081169116141561014f5760006000fd5b600b54421061015e5760006000fd5b600354341461016d5760006000fd5b60045460649034025b600d80549290910491820190556009805434839003019055600a8054600160a060020a03191633600160a060020a0316908117909155600554600b80549091019055600c805460010190556040805191825242602083015280519294507f1e05deb7b042138fe08c48558c26d4914a565892058cea78fbf5dd38056d34d292918290030190a15b5b5b5050565b005b341561020d57fe5b6102156104ff565b60408051918252519081900360200190f35b341561022f57fe5b610237610505565b604080519115158252519081900360200190f35b341561025357fe5b610215610522565b60408051918252519081900360200190f35b341561027557fe5b610215610528565b60408051918252519081900360200190f35b341561029757fe5b61021561052e565b60408051918252519081900360200190f35b34156102b957fe5b6102156105c8565b60408051918252519081900360200190f35b34156102db57fe5b6102036105ce565b005b34156102ed57fe5b61021561066e565b60408051918252519081900360200190f35b341561030f57fe5b610237610674565b604080519115158252519081900360200190f35b341561033357fe5b61021561069f565b60408051918252519081900360200190f35b341561035557fe5b61035d6106a5565b60408051600160a060020a039092168252519081900360200190f35b341561038157fe5b6102156106b4565b60408051918252519081900360200190f35b34156103a357fe5b61035d6106ba565b60408051600160a060020a039092168252519081900360200190f35b34156103cf57fe5b6102156106c9565b60408051918252519081900360200190f35b34156103f157fe5b6103f961088a565b6040518082600381111561040957fe5b60ff16815260200191505060405180910390f35b341561042557fe5b610237610893565b604080519115158252519081900360200190f35b341561044957fe5b6102156108b0565b60408051918252519081900360200190f35b341561046b57fe5b6102156108b6565b60408051918252519081900360200190f35b341561048d57fe5b6102156108bc565b60408051918252519081900360200190f35b34156104af57fe5b6102156108db565b60408051918252519081900360200190f35b34156104d157fe5b61035d6108e1565b60408051600160a060020a039092168252519081900360200190f35b6102036108f0565b005b60035481565b600060015b60085460ff16600381111561051b57fe5b1190505b90565b60045481565b60075481565b600e5460009060ff16156105425760006000fd5b600e805460ff1916600117905560005433600160a060020a0390811691161461056b5760006000fd5b600d54151561057c575060006105b8565b50600d80546000918290556001546040519192600160a060020a0390911691839181818185876187965a03f19250505015156105b85760006000fd5b5b5b600e805460ff191690555b90565b600b5481565b6001805b60085460ff1660038111156105e357fe5b146105ee5760006000fd5b600b5442116105fd5760006000fd5b600880546002919060ff19166001835b0217905550600a54600954600c5460408051600160a060020a039094168452426020850152838101929092526060830152517f904e5f2a528d60cdd1b1bca4a2d088e253bc223d75ae567e66de3401ee20bd9d9181900360800190a15b5b50565b60055481565b600060015b60085460ff16600381111561068a57fe5b1480156106995750600b544210155b90505b90565b60025481565b600154600160a060020a031681565b600d5481565b600a54600160a060020a031681565b600e54600090819060ff16156106df5760006000fd5b600e805460ff191660011790556002805b60085460ff16600381111561070157fe5b1461070c5760006000fd5b60005433600160a060020a03908116911614806107375750600a5433600160a060020a039081169116145b15156107435760006000fd5b600880546003919060ff19166001835b02179055506000546001925033600160a060020a03908116911614156107a557600a54600954604051600160a060020a039092169181156108fc0291906000818181858888f1935050505091506107e4565b600a5433600160a060020a03908116911614156107e457600a54600954604051600160a060020a0390921691600081818185876187965a03f194505050505b5b81151561080657600880546002919060ff19166001835b0217905550600091505b600a5460095460408051600160a060020a0333811682529093166020840152428382015260608301919091528315156080830152517fb0061869ebea4a96e9396a8394c8a2d81caeef0431463f7c89d1d8e4d50bcd209181900360a00190a181610871576000610875565b6009545b92505b5b5b50600e805460ff191690555b5090565b60085460ff1681565b600060025b60085460ff1660038111156108a957fe5b1490505b90565b60065481565b600c5481565b600b5460009042106108d05750600061051f565b42600b540390505b90565b60095481565b600054600160a060020a031681565b6000805b60085460ff16600381111561090557fe5b146109105760006000fd5b60005433600160a060020a0390811691161461092c5760006000fd5b600254341461093b5760006000fd5b600880546001919060ff191682805b0217905550600254600955600154600a8054600160a060020a031916600160a060020a039092169190911790554260078190556006548101600b5560408051918252517e6e0c97de781a7389d44ba8fd35d1467cabb17ed04d038d166d34ab819213f39181900360200190a15b5b5b505600a165627a7a723058204627b63bc9fab1824d39cb68fcb6f6d9a7330ae5c8b7812d9f119c393e4ef0880029",
	"networks": {},
	"schema_version": "0.0.5",
	"updated_at": 1497659499592
};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = {
	"contract_name": "PennyAuctionController",
	"abi": [
		{
			"constant": true,
			"inputs": [],
			"name": "totalFees",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "totalPrizes",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [
				{
					"name": "_maxOpenAuctions",
					"type": "uint256"
				},
				{
					"name": "_maxInitialPrize",
					"type": "uint256"
				}
			],
			"name": "setSettings",
			"outputs": [],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "maxOpenAuctions",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getAvailableFees",
			"outputs": [
				{
					"name": "_feesAvailable",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getRegistry",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getNumClosedAuctions",
			"outputs": [
				{
					"name": "_len",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "maxInitialPrize",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getNumActionableAuctions",
			"outputs": [
				{
					"name": "_numActionableAuctions",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [],
			"name": "checkOpenAuctions",
			"outputs": [
				{
					"name": "_numAuctionsCompleted",
					"type": "uint256"
				},
				{
					"name": "_feesRedeemed",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getOwner",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "totalBids",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getNumOpenAuctions",
			"outputs": [
				{
					"name": "_len",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [
				{
					"name": "_initialPrize",
					"type": "uint256"
				},
				{
					"name": "_bidPrice",
					"type": "uint256"
				},
				{
					"name": "_bidTimeS",
					"type": "uint256"
				},
				{
					"name": "_bidFeePct",
					"type": "uint256"
				},
				{
					"name": "_auctionTimeS",
					"type": "uint256"
				}
			],
			"name": "startNewAuction",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": true,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"name": "openAuctions",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getPennyAuctionFactory",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getMainController",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"name": "closedAuctions",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"inputs": [
				{
					"name": "_registry",
					"type": "address"
				},
				{
					"name": "_maxOpenAuctions",
					"type": "uint256"
				},
				{
					"name": "_maxInitialPrize",
					"type": "uint256"
				}
			],
			"payable": false,
			"type": "constructor"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "addr",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "initialPrize",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidPrice",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidTimeS",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidFeePct",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "auctionTimeS",
					"type": "uint256"
				}
			],
			"name": "AuctionStarted",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "addr",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "winner",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "prize",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "numBids",
					"type": "uint256"
				}
			],
			"name": "AuctionCompleted",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b6040516060806110b08339810160409081528151602083015191909201515b825b835b815b600160a060020a03811615156100475760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b50600482905560058190555b5050505b61102a806100866000396000f300606060405236156100e05763ffffffff60e060020a60003504166313114a9d81146100e257806325e6c3041461010457806337a28979146101265780633b13b0951461013e57806340806f7c146101605780635ab1bd53146101825780635bc1fda5146101ae578063618976c2146101d057806384621ac6146101f257806385464ad314610214578063893d20e81461023d5780638b034136146102695780638b5cef6f1461028b5780638d305437146102ad578063a9d46e8a146102e0578063c71731561461030f578063cd769b371461033b578063cefd99fc14610367575bfe5b34156100ea57fe5b6100f2610396565b60408051918252519081900360200190f35b341561010c57fe5b6100f261039c565b60408051918252519081900360200190f35b341561012e57fe5b61013c6004356024356103a2565b005b341561014657fe5b6100f26103da565b60408051918252519081900360200190f35b341561016857fe5b6100f26103e0565b60408051918252519081900360200190f35b341561018a57fe5b6101926104b6565b60408051600160a060020a039092168252519081900360200190f35b34156101b657fe5b6100f26104c6565b60408051918252519081900360200190f35b34156101d857fe5b6100f26104cd565b60408051918252519081900360200190f35b34156101fa57fe5b6100f26104d3565b60408051918252519081900360200190f35b341561021c57fe5b610224610641565b6040805192835260208301919091528051918290030190f35b341561024557fe5b610192610beb565b60408051600160a060020a039092168252519081900360200190f35b341561027157fe5b6100f2610c63565b60408051918252519081900360200190f35b341561029357fe5b6100f2610c69565b60408051918252519081900360200190f35b610192600435602435604435606435608435610c70565b60408051600160a060020a039092168252519081900360200190f35b34156102e857fe5b610192600435610e63565b60408051600160a060020a039092168252519081900360200190f35b341561031757fe5b610192610e95565b60408051600160a060020a039092168252519081900360200190f35b341561034357fe5b610192610ec1565b60408051600160a060020a039092168252519081900360200190f35b341561036f57fe5b610192600435610ee7565b60408051600160a060020a039092168252519081900360200190f35b60015481565b60025481565b6103aa610ec1565b600160a060020a031633600160a060020a03161415156103ca5760006000fd5b600482905560058190555b5b5050565b60045481565b600060006103ec610ec1565b600160a060020a031633600160a060020a031614151561040c5760006000fd5b5060005b6006548110156104b057600680548290811061042857fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316639af1d35a6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561048d57fe5b6102c65a03f1151561049b57fe5b5050604051519290920191505b600101610410565b5b5b5090565b600054600160a060020a03165b90565b6007545b90565b60055481565b600060006104df610ec1565b600160a060020a031633600160a060020a03161415156104ff5760006000fd5b5060005b6006548110156104b057600680548290811061051b57fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316637a00cf466000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561058057fe5b6102c65a03f1151561058e57fe5b505060405151905080610626575060068054829081106105aa57fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316631ebcd53f6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561060f57fe5b6102c65a03f1151561061d57fe5b50506040515190505b15610632576001820191505b5b600101610503565b5b5b5090565b600060006000600060006000610655610ec1565b600160a060020a031633600160a060020a03161415156106755760006000fd5b600092505b600654831015610bd457600680548490811061069257fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316915081600160a060020a0316637a00cf466000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156106fa57fe5b6102c65a03f1151561070857fe5b5050604051511590506107645781600160a060020a03166343d726d66040518163ffffffff1660e060020a028152600401809050600060405180830381600087803b151561075257fe5b6102c65a03f1151561076057fe5b5050505b81600160a060020a031663c2b6b58c6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156107aa57fe5b6102c65a03f115156107b857fe5b50506040515115905061081d5781600160a060020a031663be040fb06000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561080b57fe5b6102c65a03f1151561081957fe5b5050505b81600160a060020a0316633a047bb36000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561086357fe5b6102c65a03f1151561087157fe5b5050604080518051600180548201905560006020928301819052835160e060020a631ebcd53f028152935199820199919550600160a060020a0387169450631ebcd53f936004808201949392918390030190829087803b15156108d057fe5b6102c65a03f115156108de57fe5b505060405151159050610b795781600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561093157fe5b6102c65a03f1151561093f57fe5b505060408051805160028054909101905560006020918201819052825160e160020a63674f60530281529251600160a060020a038716945063ce9ec0a69360048082019493918390030190829087803b151561099757fe5b6102c65a03f115156109a557fe5b5050604051516003805490910190555060078054600181016109c78382610f89565b916000526020600020900160005b84909190916101000a815481600160a060020a030219169083600160a060020a03160217905550506001860195507f793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a824284600160a060020a031663aabe2fe36000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610a6c57fe5b6102c65a03f11515610a7a57fe5b5050506040518051905085600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610aca57fe5b6102c65a03f11515610ad857fe5b5050506040518051905086600160a060020a031663ce9ec0a66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610b2857fe5b6102c65a03f11515610b3657fe5b5050604080518051600160a060020a03978816825260208201969096529390951683860152506060820152608081019190915290519081900360a00190a1610bc8565b838314610bc15781600685815481101515610b9057fe5b906000526020600020900160005b6101000a815481600160a060020a030219169083600160a060020a031602179055505b6001909301925b5b60019092019161067a565b83610be0600682610f89565b505b5b505050509091565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b1515610c4857fe5b6102c65a03f11515610c5657fe5b5050604051519150505b90565b60035481565b6006545b90565b60006000610c7c610ec1565b600160a060020a031633600160a060020a0316141515610c9c5760006000fd5b348714610ca95760006000fd5b600554871115610cb95760006000fd5b60045460065410610cca5760006000fd5b610cd2610e95565b600160a060020a0316638a157df388888888886000604051602001526040518663ffffffff1660e060020a0281526004018086815260200185815260200184815260200183815260200182815260200195505050505050602060405180830381600087803b1515610d3f57fe5b6102c65a03f11515610d4d57fe5b50506040515160068054919350915060018101610d6a8382610f89565b916000526020600020900160005b83909190916101000a815481600160a060020a030219169083600160a060020a031602179055505080600160a060020a031663fcfff16f886040518263ffffffff1660e060020a0281526004018090506000604051808303818588803b1515610ddd57fe5b6125ee5a03f11515610deb57fe5b505060408051600160a060020a03851681524260208201528082018b9052606081018a90526080810189905260a0810188905260c0810187905290517f6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b93509081900360e0019150a18091505b5b5095945050505050565b6006805482908110610e7157fe5b906000526020600020900160005b915054906101000a9004600160a060020a031681565b6000610ebb605860020a7450454e4e595f41554354494f4e5f464143544f525902610f19565b90505b90565b6000610ebb608960020a6e26a0a4a72fa1a7a72a2927a62622a902610f19565b90505b90565b6007805482908110610e7157fe5b906000526020600020900160005b915054906101000a9004600160a060020a031681565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b1515610f6c57fe5b6102c65a03f11515610f7a57fe5b5050604051519150505b919050565b815481835581811511610fad57600083815260209020610fad918101908301610fdd565b5b505050565b815481835581811511610fad57600083815260209020610fad918101908301610fdd565b5b505050565b6104c391905b808211156104b05760008155600101610fe3565b5090565b905600a165627a7a7230582005d9e6348933c7a7ef9b411850d38e1d17272cb80a4fc698dfafdb4e26d2d6f20029",
	"networks": {
		"1497250094702": {
			"links": {},
			"events": {
				"0x6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "prize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionStarted",
					"type": "event"
				},
				"0x793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "winner",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "prize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "numBids",
							"type": "uint256"
						}
					],
					"name": "AuctionCompleted",
					"type": "event"
				},
				"0xb42c0a713f11ea828c45aae95183eaebdf2084440bab22288a02c93c75e91a98": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "_addr",
							"type": "address"
						}
					],
					"name": "GotSupervisor",
					"type": "event"
				}
			},
			"updated_at": 1497335739771,
			"address": "0x38eb376c6079e9a9f1314f2f379c3e4561fd39a7"
		},
		"1497564287593": {
			"events": {
				"0x6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionStarted",
					"type": "event"
				},
				"0x793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "winner",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "prize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "numBids",
							"type": "uint256"
						}
					],
					"name": "AuctionCompleted",
					"type": "event"
				}
			},
			"links": {},
			"address": "0xe095b4cbb2fdd88f6c83227cee39d6c6b34165e6",
			"updated_at": 1497652521708
		},
		"1497654807337": {
			"events": {
				"0x6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionStarted",
					"type": "event"
				},
				"0x793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "winner",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "prize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "numBids",
							"type": "uint256"
						}
					],
					"name": "AuctionCompleted",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x7255b78c64c5c57368aa63545124706505a5a0d2",
			"updated_at": 1497659500747
		},
		"1497667709496": {
			"events": {
				"0x6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionStarted",
					"type": "event"
				},
				"0x793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "winner",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "prize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "numBids",
							"type": "uint256"
						}
					],
					"name": "AuctionCompleted",
					"type": "event"
				}
			},
			"links": {},
			"address": "0xee7bb73ed26b123f2c9bcda202331017e8b50f52",
			"updated_at": 1497667719893
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497667719893
};

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = {
	"contract_name": "PennyAuctionFactory",
	"abi": [
		{
			"constant": true,
			"inputs": [],
			"name": "getPennyAuctionController",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getTreasury",
			"outputs": [
				{
					"name": "",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getRegistry",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getOwner",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [
				{
					"name": "_initialPrize",
					"type": "uint256"
				},
				{
					"name": "_bidPrice",
					"type": "uint256"
				},
				{
					"name": "_bidTimeS",
					"type": "uint256"
				},
				{
					"name": "_bidFeePct",
					"type": "uint256"
				},
				{
					"name": "_auctionTimeS",
					"type": "uint256"
				}
			],
			"name": "createAuction",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"inputs": [
				{
					"name": "_registry",
					"type": "address"
				}
			],
			"payable": false,
			"type": "constructor"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "addr",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "initialPrize",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidPrice",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidTimeS",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidFeePct",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "auctionTimeS",
					"type": "uint256"
				}
			],
			"name": "AuctionCreated",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b604051602080610f1a83398101604052515b805b815b815b600160a060020a038116151561003a5760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b505b610ead8061006d6000396000f300606060405263ffffffff60e060020a600035041663028078c2811461004d5780633b19e84a146100795780635ab1bd53146100a5578063893d20e8146100d15780638a157df3146100fd575bfe5b341561005557fe5b61005d610138565b60408051600160a060020a039092168252519081900360200190f35b341561008157fe5b61005d610167565b60408051600160a060020a039092168252519081900360200190f35b34156100ad57fe5b61005d610186565b60408051600160a060020a039092168252519081900360200190f35b34156100d957fe5b61005d610196565b60408051600160a060020a039092168252519081900360200190f35b341561010557fe5b61005d60043560243560443560643560843561020e565b60408051600160a060020a039092168252519081900360200190f35b6000610161604160020a772822a7272cafa0aaa1aa24a7a72fa1a7a72a2927a62622a902610317565b90505b90565b600061016160c060020a67545245415355525902610317565b90505b90565b600054600160a060020a03165b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156101f357fe5b6102c65a03f1151561020157fe5b5050604051519150505b90565b6000600061021a610138565b600160a060020a031633600160a060020a031614151561023a5760006000fd5b610242610138565b61024a610167565b8888888888610257610387565b600160a060020a0397881681529590961660208601526040808601949094526060850192909252608084015260a083015260c082019290925290519081900360e001906000f08015156102a657fe5b60408051600160a060020a0383168152602081018a9052808201899052606081018890526080810187905260a0810186905290519192507fabdd2430f9e10eb5db384c1218c42f980dd5fcda760a680a0d95ec506f0963cb919081900360c00190a18091505b5b5095945050505050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b151561036a57fe5b6102c65a03f1151561037857fe5b5050604051519150505b919050565b604051610aea806103988339019056006060604052341561000c57fe5b60405160e080610aea83398101604090815281516020830151918301516060840151608085015160a086015160c09096015193959293919290915b600085116100555760006000fd5b600084116100635760006000fd5b603c8310156100725760006000fd5b60648211156100815760006000fd5b6102588110156100915760006000fd5b60008054600160a060020a03808a16600160a060020a031992831617835560018054918a16919092161781556002879055600386905560058590556004849055600683905560088054909160ff1990911690835b02179055505b505050505050505b6109e8806101026000396000f3006060604052361561010c5763ffffffff60e060020a60003504166319afe47381146102055780631ebcd53f14610227578063267410031461024b5780632e1a0f321461026d5780633a047bb31461028f57806343713d35146102b157806343d726d6146102d357806346ac5e2b146102e55780637a00cf4614610307578063856631191461032b578063913e77ad1461034d5780639af1d35a14610379578063aabe2fe31461039b578063be040fb0146103c7578063c19d93fb146103e9578063c2b6b58c1461041d578063c326186e14610441578063ce9ec0a614610463578063dac6270d14610485578063e3ac5d26146104a7578063f851a440146104c9578063fcfff16f146104f5575b6102035b60006001805b60085460ff16600381111561012757fe5b146101325760006000fd5b600a5433600160a060020a039081169116141561014f5760006000fd5b600b54421061015e5760006000fd5b600354341461016d5760006000fd5b60045460649034025b600d80549290910491820190556009805434839003019055600a8054600160a060020a03191633600160a060020a0316908117909155600554600b80549091019055600c805460010190556040805191825242602083015280519294507f1e05deb7b042138fe08c48558c26d4914a565892058cea78fbf5dd38056d34d292918290030190a15b5b5b5050565b005b341561020d57fe5b6102156104ff565b60408051918252519081900360200190f35b341561022f57fe5b610237610505565b604080519115158252519081900360200190f35b341561025357fe5b610215610522565b60408051918252519081900360200190f35b341561027557fe5b610215610528565b60408051918252519081900360200190f35b341561029757fe5b61021561052e565b60408051918252519081900360200190f35b34156102b957fe5b6102156105c8565b60408051918252519081900360200190f35b34156102db57fe5b6102036105ce565b005b34156102ed57fe5b61021561066e565b60408051918252519081900360200190f35b341561030f57fe5b610237610674565b604080519115158252519081900360200190f35b341561033357fe5b61021561069f565b60408051918252519081900360200190f35b341561035557fe5b61035d6106a5565b60408051600160a060020a039092168252519081900360200190f35b341561038157fe5b6102156106b4565b60408051918252519081900360200190f35b34156103a357fe5b61035d6106ba565b60408051600160a060020a039092168252519081900360200190f35b34156103cf57fe5b6102156106c9565b60408051918252519081900360200190f35b34156103f157fe5b6103f961088a565b6040518082600381111561040957fe5b60ff16815260200191505060405180910390f35b341561042557fe5b610237610893565b604080519115158252519081900360200190f35b341561044957fe5b6102156108b0565b60408051918252519081900360200190f35b341561046b57fe5b6102156108b6565b60408051918252519081900360200190f35b341561048d57fe5b6102156108bc565b60408051918252519081900360200190f35b34156104af57fe5b6102156108db565b60408051918252519081900360200190f35b34156104d157fe5b61035d6108e1565b60408051600160a060020a039092168252519081900360200190f35b6102036108f0565b005b60035481565b600060015b60085460ff16600381111561051b57fe5b1190505b90565b60045481565b60075481565b600e5460009060ff16156105425760006000fd5b600e805460ff1916600117905560005433600160a060020a0390811691161461056b5760006000fd5b600d54151561057c575060006105b8565b50600d80546000918290556001546040519192600160a060020a0390911691839181818185876187965a03f19250505015156105b85760006000fd5b5b5b600e805460ff191690555b90565b600b5481565b6001805b60085460ff1660038111156105e357fe5b146105ee5760006000fd5b600b5442116105fd5760006000fd5b600880546002919060ff19166001835b0217905550600a54600954600c5460408051600160a060020a039094168452426020850152838101929092526060830152517f904e5f2a528d60cdd1b1bca4a2d088e253bc223d75ae567e66de3401ee20bd9d9181900360800190a15b5b50565b60055481565b600060015b60085460ff16600381111561068a57fe5b1480156106995750600b544210155b90505b90565b60025481565b600154600160a060020a031681565b600d5481565b600a54600160a060020a031681565b600e54600090819060ff16156106df5760006000fd5b600e805460ff191660011790556002805b60085460ff16600381111561070157fe5b1461070c5760006000fd5b60005433600160a060020a03908116911614806107375750600a5433600160a060020a039081169116145b15156107435760006000fd5b600880546003919060ff19166001835b02179055506000546001925033600160a060020a03908116911614156107a557600a54600954604051600160a060020a039092169181156108fc0291906000818181858888f1935050505091506107e4565b600a5433600160a060020a03908116911614156107e457600a54600954604051600160a060020a0390921691600081818185876187965a03f194505050505b5b81151561080657600880546002919060ff19166001835b0217905550600091505b600a5460095460408051600160a060020a0333811682529093166020840152428382015260608301919091528315156080830152517fb0061869ebea4a96e9396a8394c8a2d81caeef0431463f7c89d1d8e4d50bcd209181900360a00190a181610871576000610875565b6009545b92505b5b5b50600e805460ff191690555b5090565b60085460ff1681565b600060025b60085460ff1660038111156108a957fe5b1490505b90565b60065481565b600c5481565b600b5460009042106108d05750600061051f565b42600b540390505b90565b60095481565b600054600160a060020a031681565b6000805b60085460ff16600381111561090557fe5b146109105760006000fd5b60005433600160a060020a0390811691161461092c5760006000fd5b600254341461093b5760006000fd5b600880546001919060ff191682805b0217905550600254600955600154600a8054600160a060020a031916600160a060020a039092169190911790554260078190556006548101600b5560408051918252517e6e0c97de781a7389d44ba8fd35d1467cabb17ed04d038d166d34ab819213f39181900360200190a15b5b5b505600a165627a7a723058204627b63bc9fab1824d39cb68fcb6f6d9a7330ae5c8b7812d9f119c393e4ef0880029a165627a7a723058205163ccb0abe0d79a647e6dbf8a1ddf304d727c7cf64a09eeeab54177cd4cf0790029",
	"networks": {
		"1497216445243": {
			"links": {},
			"events": {
				"0x8a8cc462d00726e0f8c031dd2d6b9dcdf0794fb27a88579830dadee27d43ea7c": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						}
					],
					"name": "AuctionCreated",
					"type": "event"
				}
			},
			"updated_at": 1497250085094
		},
		"1497250094702": {
			"links": {},
			"events": {
				"0x8a8cc462d00726e0f8c031dd2d6b9dcdf0794fb27a88579830dadee27d43ea7c": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						}
					],
					"name": "AuctionCreated",
					"type": "event"
				}
			},
			"updated_at": 1497335739771,
			"address": "0x6a3f3f91f2bfa5df8b7069f911389204fc556880"
		},
		"1497564287593": {
			"events": {
				"0xabdd2430f9e10eb5db384c1218c42f980dd5fcda760a680a0d95ec506f0963cb": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionCreated",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x6dfd12e4cc995688a7ce9f0633c9212c902e030f",
			"updated_at": 1497652521705
		},
		"1497654807337": {
			"events": {
				"0xabdd2430f9e10eb5db384c1218c42f980dd5fcda760a680a0d95ec506f0963cb": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionCreated",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x2a8f511187c3ba81abe770fa54730c247de255fb",
			"updated_at": 1497659500746
		},
		"1497667709496": {
			"events": {
				"0xabdd2430f9e10eb5db384c1218c42f980dd5fcda760a680a0d95ec506f0963cb": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "initialPrize",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidPrice",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidTimeS",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "bidFeePct",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "auctionTimeS",
							"type": "uint256"
						}
					],
					"name": "AuctionCreated",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x9fca44fceae2f8b9b0ad733726dbf0667e3341d1",
			"updated_at": 1497667719892
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497667719892
};

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = {
	"contract_name": "Registry",
	"abi": [
		{
			"constant": true,
			"inputs": [
				{
					"name": "_name",
					"type": "bytes32"
				}
			],
			"name": "addressOf",
			"outputs": [
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"payable": false,
			"type": "function"
		},
		{
			"constant": false,
			"inputs": [
				{
					"name": "_name",
					"type": "bytes32"
				},
				{
					"name": "_addr",
					"type": "address"
				}
			],
			"name": "register",
			"outputs": [],
			"payable": false,
			"type": "function"
		},
		{
			"inputs": [],
			"payable": false,
			"type": "constructor"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b5b7f4f574e455200000000000000000000000000000000000000000000000000000060009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f8054600160a060020a03191633600160a060020a03161790555b5b61014f806100816000396000f300606060405263ffffffff60e060020a600035041663bb34534c811461002c578063d22057a91461005b575bfe5b341561003457fe5b61003f60043561007c565b60408051600160a060020a039092168252519081900360200190f35b341561006357fe5b61007a600435600160a060020a03602435166100a7565b005b600081815260208190526040902054600160a060020a03168015156100a15760006000fd5b5b919050565b60d960020a6427aba722a90260009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f5433600160a060020a039081169116146100f65760006000fd5b60008281526020819052604090208054600160a060020a031916600160a060020a0383161790555b5b50505600a165627a7a72305820496f2c524512065cbd7548729873f02235b24fa72e3b7034c24f054d17804c780029",
	"networks": {
		"1497216445243": {
			"events": {},
			"links": {},
			"address": "0xf2504cb1a56fb1368fd4d978079c831cdce173df",
			"updated_at": 1497250085093
		},
		"1497250094702": {
			"events": {},
			"links": {},
			"address": "0x3ec9f44d5a0973eea85b0f725702c2e5d7cc276c",
			"updated_at": 1497335739769
		},
		"1497564287593": {
			"events": {},
			"links": {},
			"address": "0x4952cb3d181b55b400af6b6b2f12eca9d8a490f4",
			"updated_at": 1497652521705
		},
		"1497654807337": {
			"events": {},
			"links": {},
			"address": "0xba93b9888c5c187edd9feb294e486fd02661b35c",
			"updated_at": 1497659500746
		},
		"1497667709496": {
			"events": {},
			"links": {},
			"address": "0x4d05c06b60a7307eb6f652874e668e93ee83c8fa",
			"updated_at": 1497667719886
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497667719886
};

/***/ }),
/* 5 */,
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

// copy over
window.Artifacts = {
	Registry: 					__webpack_require__(4),
	MainController: 			__webpack_require__(0),
	PennyAuctionController: 	__webpack_require__(2),
	PennyAuctionFactory: 		__webpack_require__(3),
	PennyAuction: 				__webpack_require__(1)
}

/***/ })
/******/ ]);