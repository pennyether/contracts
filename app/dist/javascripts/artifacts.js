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
					"name": "_success",
					"type": "bool"
				},
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
					"name": "msg",
					"type": "string"
				}
			],
			"name": "Error",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "addr",
					"type": "address"
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
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160208061081383398101604052515b805b815b825b825b600160a060020a038116151561003c5760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b505b505b6107a2806100716000396000f300606060405236156100725763ffffffff60e060020a600035041663028078c2811461007b57806316a85370146100a75780633b19e84a146100b95780635ab1bd53146100e55780636e9960c314610111578063893d20e81461013d578063b6533f9e14610169578063df15196d14610190575b6100795b5b565b005b341561008357fe5b61008b6101d2565b60408051600160a060020a039092168252519081900360200190f35b34156100af57fe5b610079610201565b005b34156100c157fe5b61008b61022d565b60408051600160a060020a039092168252519081900360200190f35b34156100ed57fe5b61008b61024c565b60408051600160a060020a039092168252519081900360200190f35b341561011957fe5b61008b61025c565b60408051600160a060020a039092168252519081900360200190f35b341561014557fe5b61008b610278565b60408051600160a060020a039092168252519081900360200190f35b341561017157fe5b61017c6004356102f0565b604080519115158252519081900360200190f35b341561019857fe5b6101af600435602435604435606435608435610470565b604080519215158352600160a060020a0390911660208301528051918290030190f35b60006101fb604160020a772822a7272cafa0aaa1aa24a7a72fa1a7a72a2927a62622a9026106e6565b90505b90565b610209610278565b600160a060020a031633600160a060020a03161415156100765760006000fd5b5b5b565b60006101fb60c060020a675452454153555259026106e6565b90505b90565b600054600160a060020a03165b90565b60006101fb60d960020a6420a226a4a7026106e6565b90505b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156102d557fe5b6102c65a03f115156102e357fe5b5050604051519150505b90565b600060006000600061030061025c565b600160a060020a031633600160a060020a03161415156103205760006000fd5b6103286101d2565b925082600160a060020a03166384621ac66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561037057fe5b6102c65a03f1151561037e57fe5b50505060405180519050915082600160a060020a03166340806f7c6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156103d057fe5b6102c65a03f115156103de57fe5b50506040515191505060008211806103f557508481115b15610462576104026101d2565b600160a060020a03166385464ad36000604051604001526040518163ffffffff1660e060020a028152600401809050604060405180830381600087803b151561044757fe5b6102c65a03f1151561045557fe5b5060019550610467915050565b600093505b5b505050919050565b6000600060006000600061048261025c565b600160a060020a031633600160a060020a03161415156104a25760006000fd5b6104aa61022d565b600160a060020a031663c12eab908b6000604051602001526040518263ffffffff1660e060020a02815260040180828152602001915050602060405180830381600087803b15156104f757fe5b6102c65a03f1151561050557fe5b50506040515193505082151561056557604080516020808252601790820152604860020a76556e61626c6520746f20726563656976652066756e6473028183015290516000805160206107578339815191529181900360600190a16106d8565b61056d6101d2565b600160a060020a0316638d3054378b8c8c8c8c8c6000604051604001526040518763ffffffff1660e060020a02815260040180868152602001858152602001848152602001838152602001828152602001955050505050506040604051808303818588803b15156105da57fe5b6125ee5a03f115156105e857fe5b505060405180516020909101519094509250505081151561068d57604080516020808252601d908201527f556e61626c6520746f2073746172742061206e65772061756374696f6e0000008183015290516000805160206107578339815191529181900360600190a161065961022d565b604051600160a060020a0391909116908b156108fc02908c906000818181858888f19350505050151561068857fe5b6106d8565b60408051428152600160a060020a038316602082015281517fab8ea2e81885c7371218ced71c5590638d262161b80681fcd3b14a14a0dfd408929181900390910190a1600181945094505b5b5050509550959350505050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b151561073957fe5b6102c65a03f1151561074757fe5b5050604051519150505b919050560008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aaa165627a7a723058208c67eaba5ca91b2f5385434de2b5e7e6d6e24aaa7c8a7ca8130f8f2b62254df10029",
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
			"address": "0x9ea21fb09d67f68dcd90e921905f1f7556bc2f58",
			"updated_at": 1497686308120
		},
		"1497735007470": {
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
			"address": "0x6a59730021bc17005a565374b47eea9e0d7bbea8",
			"updated_at": 1497735038935
		},
		"1498282938751": {
			"events": {
				"0x08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "Error",
					"type": "event"
				},
				"0xab8ea2e81885c7371218ced71c5590638d262161b80681fcd3b14a14a0dfd408": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
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
			"address": "0x98490b331909ce3a1eb6231cb79b097f85e66959",
			"updated_at": 1498285429148
		},
		"1498368763054": {
			"events": {
				"0x08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "Error",
					"type": "event"
				},
				"0xab8ea2e81885c7371218ced71c5590638d262161b80681fcd3b14a14a0dfd408": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "time",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "addr",
							"type": "address"
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
			"address": "0x84c1a5ebec1fe548ddc799c5bcce8392237f2077",
			"updated_at": 1498368981227
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1498368981227
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
					"name": "_success",
					"type": "bool"
				},
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
			"outputs": [
				{
					"name": "_success",
					"type": "bool"
				}
			],
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
					"name": "_success",
					"type": "bool"
				},
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
					"name": "msg",
					"type": "string"
				}
			],
			"name": "Error",
			"type": "event"
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
					"name": "time",
					"type": "uint256"
				},
				{
					"indexed": false,
					"name": "bidder",
					"type": "address"
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
			"name": "Closed",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
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
					"name": "amount",
					"type": "uint256"
				}
			],
			"name": "Redeemed",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "time",
					"type": "uint256"
				},
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
					"name": "amount",
					"type": "uint256"
				}
			],
			"name": "RedeemFailed",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160e080610f7783398101604090815281516020830151918301516060840151608085015160a086015160c09096015193959293919290915b600085116100555760006000fd5b600084116100635760006000fd5b603c8310156100725760006000fd5b60648211156100815760006000fd5b6102588110156100915760006000fd5b60008054600160a060020a03808a16600160a060020a031992831617835560018054918a16919092161781556002879055600386905560058590556004849055600683905560088054909160ff1990911690835b02179055505b505050505050505b610e75806101026000396000f3006060604052361561010c5763ffffffff60e060020a60003504166319afe47381146103165780631ebcd53f14610338578063267410031461035c5780632e1a0f321461037e5780633a047bb3146103a057806343713d35146103cb57806343d726d6146103ed57806346ac5e2b146104115780637a00cf46146104335780638566311914610457578063913e77ad146104795780639af1d35a146104a5578063aabe2fe3146104c7578063be040fb0146104f3578063c19d93fb1461051e578063c2b6b58c14610552578063c326186e14610576578063ce9ec0a614610598578063dac6270d146105ba578063e3ac5d26146105dc578063f851a440146105fe578063fcfff16f1461062a575b6103145b6000805b60085460ff16600381111561012557fe5b141561017d57610178606060405190810160405280602281526020017f43616e6e6f7420626964207768656e2061756374696f6e2069732070656e6469815260200160f060020a616e6702815250610634565b610311565b600b5442106101ca57610178604060405190810160405280601b81526020017f43616e6e6f74206269642061667465722074696d65436c6f7365640000000000815250610634565b610311565b600a5433600160a060020a039081169116141561023357610178606060405190810160405280602281526020017f596f752061726520616c7265616479207468652063757272656e742077696e6e815260200160f160020a6132b902815250610634565b610311565b600354341461027f5761017860406040519081016040528060198152602001603860020a7856616c7565206d757374206d6174636820626964507269636502815250610634565b610311565b60045460649034025b600d80549290910491820190556009805434839003019055600c80546001019055600a8054600160a060020a03191633600160a060020a0316908117909155600554600b8054909101905560408051428152602081019290925280519293507f9a190cbd63f01b429ad1ffc2d976a9975a83c13d6d79c9b270cf39a80b2a480092918290030190a15b50565b005b341561031e57fe5b6103266106f9565b60408051918252519081900360200190f35b341561034057fe5b6103486106ff565b604080519115158252519081900360200190f35b341561036457fe5b61032661071c565b60408051918252519081900360200190f35b341561038657fe5b610326610722565b60408051918252519081900360200190f35b34156103a857fe5b6103b0610728565b60408051921515835260208301919091528051918290030190f35b34156103d357fe5b6103266108b1565b60408051918252519081900360200190f35b34156103f557fe5b6103486108b7565b604080519115158252519081900360200190f35b341561041957fe5b6103266109e7565b60408051918252519081900360200190f35b341561043b57fe5b6103486109ed565b604080519115158252519081900360200190f35b341561045f57fe5b610326610a18565b60408051918252519081900360200190f35b341561048157fe5b610489610a1e565b60408051600160a060020a039092168252519081900360200190f35b34156104ad57fe5b610326610a2d565b60408051918252519081900360200190f35b34156104cf57fe5b610489610a33565b60408051600160a060020a039092168252519081900360200190f35b34156104fb57fe5b6103b0610a42565b60408051921515835260208301919091528051918290030190f35b341561052657fe5b61052e610cdb565b6040518082600381111561053e57fe5b60ff16815260200191505060405180910390f35b341561055a57fe5b610348610ce4565b604080519115158252519081900360200190f35b341561057e57fe5b610326610d01565b60408051918252519081900360200190f35b34156105a057fe5b610326610d07565b60408051918252519081900360200190f35b34156105c257fe5b610326610d0d565b60408051918252519081900360200190f35b34156105e457fe5b610326610d2c565b60408051918252519081900360200190f35b341561060657fe5b610489610d32565b60408051600160a060020a039092168252519081900360200190f35b610314610d41565b005b600080516020610e0a83398151915281604051808060200182810382528381815181526020019150805190602001908083836000831461068f575b80518252602083111561068f57601f19909201916020918201910161066f565b505050905090810190601f1680156106bb5780820380516001836020036101000a031916815260200191505b509250505060405180910390a1604051600160a060020a033316903490600081818185876187965a03f19250505015156103115760006000fd5b5b50565b60035481565b600060015b60085460ff16600381111561071557fe5b1190505b90565b60045481565b60075481565b600e54600090819060ff161561073e5760006000fd5b600e805460ff1916600117905560005433600160a060020a039081169116141561085657600d5415156107bb57604080516020808252601190820152607860020a704e6f206665657320746f2072656465656d02818301529051600080516020610e0a8339815191529181900360600190a1506000905080610850565b50600d80546000918290556001546040519192600160a060020a0390911691839181818185876187965a03f192505050151561084b57604080516020808252601b908201527f4661696c656420746f2073656e6420746f20636f6c6c6563746f720000000000818301529051600080516020610e0a8339815191529181900360600190a1600d5550600080610850565b600191505b5b6108a1565b604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9030b236b4b702818301529051600080516020610e0a8339815191529181900360600190a15b5b600e805460ff191690555b9091565b600b5481565b60006001805b60085460ff1660038111156108ce57fe5b14156109a557600b5442101561092f57604080516020808252601490820152606260020a73151a5b59481b9bdd081e595d08195e1c1a5c995902818301529051600080516020610e0a8339815191529181900360600190a1600091506109a0565b600880546002919060ff19166001835b0217905550600a54600954600c5460408051428152600160a060020a039094166020850152838101929092526060830152517f6fb6a8d590ccdf226481f20a995a894898b73dd6b057d2fa73fabd0f6c24227e9181900360800190a1600191505b6109e2565b604080516020808252601d90820152600080516020610e2a833981519152818301529051600080516020610e0a8339815191529181900360600190a15b5b5090565b60055481565b600060015b60085460ff166003811115610a0357fe5b148015610a125750600b544210155b90505b90565b60025481565b600154600160a060020a031681565b600d5481565b600a54600160a060020a031681565b600e546000908190819060ff1615610a5a5760006000fd5b600e805460ff191660011790556002805b60085460ff166003811115610a7c57fe5b1415610c8c5760005433600160a060020a0390811691161480610aad5750600a5433600160a060020a039081169116145b15610c3957600880546003919060ff19166001835b02179055506000805490925033600160a060020a0390811691161415610b1457600a54600954604051600160a060020a039092169181156108fc0291906000818181858888f193505050509150610b53565b600a5433600160a060020a0390811691161415610b5357600a54600954604051600160a060020a0390921691600081818185876187965a03f194505050505b5b811515610bd357600a5460095460408051428152600160a060020a033381166020830152909316838201526060830191909152517f53e10e5c1b2fec3b613c6b8c88e69cfc5672696d0092541411737693ff9e48769181900360800190a1600880546002919060ff19166001835b021790555060009350839250610c34565b600a5460095460408051428152600160a060020a033381166020830152909316838201526060830191909152517f18737e07ba2aac9c230bdd7119bde1c2d51cef17a2910224f55819e4b0651ea19181900360800190a16001600954935093505b610c86565b604080516020808252808201527f4f6e6c792063616c6c61626c652062792061646d696e206f722077696e6e6572818301529051600080516020610e0a8339815191529181900360600190a15b5b610cc9565b604080516020808252601d90820152600080516020610e2a833981519152818301529051600080516020610e0a8339815191529181900360600190a15b5b50600e805460ff191690555b509091565b60085460ff1681565b600060025b60085460ff166003811115610cfa57fe5b1490505b90565b60065481565b600c5481565b600b546000904210610d2157506000610719565b42600b540390505b90565b60095481565b600054600160a060020a031681565b60005b60085460ff166003811115610d5557fe5b14610d605760006000fd5b60005433600160a060020a03908116911614610d7c5760006000fd5b6002543414610d8b5760006000fd5b600880546001919060ff191682805b0217905550600254600955600154600a8054600160a060020a031916600160a060020a039092169190911790554260078190556006548101600b5560408051918252517e6e0c97de781a7389d44ba8fd35d1467cabb17ed04d038d166d34ab819213f39181900360200190a15b560008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa4e6f742063616c6c61626c6520696e2063757272656e74207374617465000000a165627a7a72305820626900882ae9f68c9cfb65a4c4eaaa4c5413db9a24877af09dfb83e538a681a70029",
	"networks": {},
	"schema_version": "0.0.5",
	"updated_at": 1498285428102
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
					"name": "_success",
					"type": "bool"
				},
				{
					"name": "_auction",
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
					"name": "msg",
					"type": "string"
				}
			],
			"name": "Error",
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
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "auctionAddress",
					"type": "address"
				}
			],
			"name": "WTF",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b6040516060806113248339810160409081528151602083015191909201515b825b835b815b600160a060020a03811615156100475760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b50600482905560058190555b5050505b61129e806100866000396000f300606060405236156100e05763ffffffff60e060020a60003504166313114a9d81146100e257806325e6c3041461010457806337a28979146101265780633b13b0951461013e57806340806f7c146101605780635ab1bd53146101825780635bc1fda5146101ae578063618976c2146101d057806384621ac6146101f257806385464ad314610214578063893d20e81461023d5780638b034136146102695780638b5cef6f1461028b5780638d305437146102ad578063a9d46e8a146102e7578063c717315614610316578063cd769b3714610342578063cefd99fc1461036e575bfe5b34156100ea57fe5b6100f261039d565b60408051918252519081900360200190f35b341561010c57fe5b6100f26103a3565b60408051918252519081900360200190f35b341561012e57fe5b61013c6004356024356103a9565b005b341561014657fe5b6100f26103e1565b60408051918252519081900360200190f35b341561016857fe5b6100f26103e7565b60408051918252519081900360200190f35b341561018a57fe5b6101926104bd565b60408051600160a060020a039092168252519081900360200190f35b34156101b657fe5b6100f26104cd565b60408051918252519081900360200190f35b34156101d857fe5b6100f26104d4565b60408051918252519081900360200190f35b34156101fa57fe5b6100f26104da565b60408051918252519081900360200190f35b341561021c57fe5b610224610648565b6040805192835260208301919091528051918290030190f35b341561024557fe5b610192610c5a565b60408051600160a060020a039092168252519081900360200190f35b341561027157fe5b6100f2610cd2565b60408051918252519081900360200190f35b341561029357fe5b6100f2610cd8565b60408051918252519081900360200190f35b6102c4600435602435604435606435608435610cdf565b604080519215158352600160a060020a0390911660208301528051918290030190f35b34156102ef57fe5b6101926004356110b7565b60408051600160a060020a039092168252519081900360200190f35b341561031e57fe5b6101926110e9565b60408051600160a060020a039092168252519081900360200190f35b341561034a57fe5b610192611115565b60408051600160a060020a039092168252519081900360200190f35b341561037657fe5b61019260043561113b565b60408051600160a060020a039092168252519081900360200190f35b60015481565b60025481565b6103b1611115565b600160a060020a031633600160a060020a03161415156103d15760006000fd5b600482905560058190555b5b5050565b60045481565b600060006103f3611115565b600160a060020a031633600160a060020a03161415156104135760006000fd5b5060005b6006548110156104b757600680548290811061042f57fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316639af1d35a6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561049457fe5b6102c65a03f115156104a257fe5b5050604051519290920191505b600101610417565b5b5b5090565b600054600160a060020a03165b90565b6007545b90565b60055481565b600060006104e6611115565b600160a060020a031633600160a060020a03161415156105065760006000fd5b5060005b6006548110156104b757600680548290811061052257fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316637a00cf466000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561058757fe5b6102c65a03f1151561059557fe5b50506040515190508061062d575060068054829081106105b157fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316631ebcd53f6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561061657fe5b6102c65a03f1151561062457fe5b50506040515190505b15610639576001820191505b5b60010161050a565b5b5b5090565b600060006000600060006000600061065e611115565b600160a060020a031633600160a060020a031614151561067e5760006000fd5b600093505b600654841015610c4257600680548590811061069b57fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316925082600160a060020a0316637a00cf466000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561070357fe5b6102c65a03f1151561071157fe5b5050604051511590506107765782600160a060020a03166343d726d66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561076457fe5b6102c65a03f1151561077257fe5b5050505b82600160a060020a031663c2b6b58c6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156107bc57fe5b6102c65a03f115156107ca57fe5b50506040515115905061082f5782600160a060020a031663be040fb06000604051604001526040518163ffffffff1660e060020a028152600401809050604060405180830381600087803b151561081d57fe5b6102c65a03f1151561082b57fe5b5050505b82600160a060020a0316633a047bb36000604051604001526040518163ffffffff1660e060020a028152600401809050604060405180830381600087803b151561087557fe5b6102c65a03f1151561088357fe5b5050604051805160209091015190935091505081156108ad576001805482019055948501946108f8565b604080516020808252601690820152605160020a752ab730b13632903a37903932b232b2b6903332b2b997028183015290516000805160206112538339815191529181900360600190a15b82600160a060020a0316631ebcd53f6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561093e57fe5b6102c65a03f1151561094c57fe5b505060405151159050610be75782600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561099f57fe5b6102c65a03f115156109ad57fe5b505060408051805160028054909101905560006020918201819052825160e160020a63674f60530281529251600160a060020a038816945063ce9ec0a69360048082019493918390030190829087803b1515610a0557fe5b6102c65a03f11515610a1357fe5b505060405151600380549091019055506007805460018101610a3583826111dd565b916000526020600020900160005b85909190916101000a815481600160a060020a030219169083600160a060020a03160217905550506001870196507f793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a834285600160a060020a031663aabe2fe36000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610ada57fe5b6102c65a03f11515610ae857fe5b5050506040518051905086600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610b3857fe5b6102c65a03f11515610b4657fe5b5050506040518051905087600160a060020a031663ce9ec0a66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610b9657fe5b6102c65a03f11515610ba457fe5b5050604080518051600160a060020a03978816825260208201969096529390951683860152506060820152608081019190915290519081900360a00190a1610c36565b848414610c2f5782600686815481101515610bfe57fe5b906000526020600020900160005b6101000a815481600160a060020a030219169083600160a060020a031602179055505b6001909401935b5b600190930192610683565b84610c4e6006826111dd565b505b5b50505050509091565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b1515610cb757fe5b6102c65a03f11515610cc557fe5b5050604051519150505b90565b60035481565b6006545b90565b60006000610ceb611115565b600160a060020a031633600160a060020a0316141515610d0b5760006000fd5b348714610d9157604080516020808252601d908201527f56616c7565206d75737420657175616c20696e697469616c5072697a650000008183015290516000805160206112538339815191529181900360600190a1604051600160a060020a033316903480156108fc02916000818181858888f193505050501515610d8c57fe5b6110ac565b600554871115610e1657604080516020808252601690820152605060020a75696e697469616c5072697a6520746f6f206c61726765028183015290516000805160206112538339815191529181900360600190a1604051600160a060020a033316903480156108fc02916000818181858888f193505050501515610d8c57fe5b6110ac565b60045460065410610e9c57604080516020808252601690820152605160020a752a37b79036b0b73c9030bab1ba34b7b7399037b832b7028183015290516000805160206112538339815191529181900360600190a1604051600160a060020a033316903480156108fc02916000818181858888f193505050501515610d8c57fe5b6110ac565b610ea46110e9565b600160a060020a0316638a157df388888888886000604051602001526040518663ffffffff1660e060020a0281526004018086815260200185815260200184815260200183815260200182815260200195505050505050602060405180830381600087803b1515610f1157fe5b6102c65a03f11515610f1f57fe5b50505060405180519050905080600160a060020a031663fcfff16f886000604051602001526040518263ffffffff1660e060020a0281526004018090506020604051808303818588803b1515610f7157fe5b6125ee5a03f11515610f7f57fe5b5050604051511515915061100a905057604080516020808252601690820152605160020a752ab730b13632903a379037b832b71030bab1ba34b7b7028183015290516000805160206112538339815191529181900360600190a1604051600160a060020a033316903480156108fc02916000818181858888f193505050501515610d8c57fe5b6110ac565b600680546001810161101c83826111dd565b916000526020600020900160005b8154600160a060020a038086166101009390930a83810291021990911617909155604080519182524260208301528181018a9052606082018990526080820188905260a0820187905260c08201869052517f6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b92509081900360e00190a1600191505b5b9550959350505050565b60068054829081106110c557fe5b906000526020600020900160005b915054906101000a9004600160a060020a031681565b600061110f605860020a7450454e4e595f41554354494f4e5f464143544f52590261116d565b90505b90565b600061110f608960020a6e26a0a4a72fa1a7a72a2927a62622a90261116d565b90505b90565b60078054829081106110c557fe5b906000526020600020900160005b915054906101000a9004600160a060020a031681565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156111c057fe5b6102c65a03f115156111ce57fe5b5050604051519150505b919050565b81548183558181151161120157600083815260209020611201918101908301611231565b5b505050565b81548183558181151161120157600083815260209020611201918101908301611231565b5b505050565b6104ca91905b808211156104b75760008155600101611237565b5090565b90560008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aaa165627a7a7230582007d5cdb8e0bdd8e59f4e133bfba85bf319751e6fcc59893c01ebed091ce3c5c20029",
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
			"address": "0x849f7fdc158f64e63ab00cfcb92fb89811931c13",
			"updated_at": 1497686308123
		},
		"1497735007470": {
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
			"address": "0x682ff11d80fb3e3b7b5d574e19dc261aef226ae7",
			"updated_at": 1497735038939
		},
		"1498282938751": {
			"events": {
				"0x08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "Error",
					"type": "event"
				},
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
				},
				"0x70eb68047a0eaacfaf7be4b07ab8eb1e854f4c0812caeeb2b3f0594453675c89": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "auctionAddress",
							"type": "address"
						}
					],
					"name": "WTF",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x5bc9ed242d4b7220a9bf8833186b281a3dc3ac5d",
			"updated_at": 1498285429152
		},
		"1498368763054": {
			"events": {
				"0x08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "Error",
					"type": "event"
				},
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
				},
				"0x70eb68047a0eaacfaf7be4b07ab8eb1e854f4c0812caeeb2b3f0594453675c89": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "auctionAddress",
							"type": "address"
						}
					],
					"name": "WTF",
					"type": "event"
				}
			},
			"links": {},
			"address": "0xf82f7fc2579287d9532b561d0f3e83aa0ed5ae85",
			"updated_at": 1498368981228
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1498368981228
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
	"unlinked_binary": "0x6060604052341561000c57fe5b6040516020806113a783398101604052515b805b815b815b600160a060020a038116151561003a5760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b505b61133a8061006d6000396000f300606060405263ffffffff60e060020a600035041663028078c2811461004d5780633b19e84a146100795780635ab1bd53146100a5578063893d20e8146100d15780638a157df3146100fd575bfe5b341561005557fe5b61005d610138565b60408051600160a060020a039092168252519081900360200190f35b341561008157fe5b61005d610167565b60408051600160a060020a039092168252519081900360200190f35b34156100ad57fe5b61005d610186565b60408051600160a060020a039092168252519081900360200190f35b34156100d957fe5b61005d610196565b60408051600160a060020a039092168252519081900360200190f35b341561010557fe5b61005d60043560243560443560643560843561020e565b60408051600160a060020a039092168252519081900360200190f35b6000610161604160020a772822a7272cafa0aaa1aa24a7a72fa1a7a72a2927a62622a902610317565b90505b90565b600061016160c060020a67545245415355525902610317565b90505b90565b600054600160a060020a03165b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156101f357fe5b6102c65a03f1151561020157fe5b5050604051519150505b90565b6000600061021a610138565b600160a060020a031633600160a060020a031614151561023a5760006000fd5b610242610138565b61024a610167565b8888888888610257610387565b600160a060020a0397881681529590961660208601526040808601949094526060850192909252608084015260a083015260c082019290925290519081900360e001906000f08015156102a657fe5b60408051600160a060020a0383168152602081018a9052808201899052606081018890526080810187905260a0810186905290519192507fabdd2430f9e10eb5db384c1218c42f980dd5fcda760a680a0d95ec506f0963cb919081900360c00190a18091505b5b5095945050505050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b151561036a57fe5b6102c65a03f1151561037857fe5b5050604051519150505b919050565b604051610f77806103988339019056006060604052341561000c57fe5b60405160e080610f7783398101604090815281516020830151918301516060840151608085015160a086015160c09096015193959293919290915b600085116100555760006000fd5b600084116100635760006000fd5b603c8310156100725760006000fd5b60648211156100815760006000fd5b6102588110156100915760006000fd5b60008054600160a060020a03808a16600160a060020a031992831617835560018054918a16919092161781556002879055600386905560058590556004849055600683905560088054909160ff1990911690835b02179055505b505050505050505b610e75806101026000396000f3006060604052361561010c5763ffffffff60e060020a60003504166319afe47381146103165780631ebcd53f14610338578063267410031461035c5780632e1a0f321461037e5780633a047bb3146103a057806343713d35146103cb57806343d726d6146103ed57806346ac5e2b146104115780637a00cf46146104335780638566311914610457578063913e77ad146104795780639af1d35a146104a5578063aabe2fe3146104c7578063be040fb0146104f3578063c19d93fb1461051e578063c2b6b58c14610552578063c326186e14610576578063ce9ec0a614610598578063dac6270d146105ba578063e3ac5d26146105dc578063f851a440146105fe578063fcfff16f1461062a575b6103145b6000805b60085460ff16600381111561012557fe5b141561017d57610178606060405190810160405280602281526020017f43616e6e6f7420626964207768656e2061756374696f6e2069732070656e6469815260200160f060020a616e6702815250610634565b610311565b600b5442106101ca57610178604060405190810160405280601b81526020017f43616e6e6f74206269642061667465722074696d65436c6f7365640000000000815250610634565b610311565b600a5433600160a060020a039081169116141561023357610178606060405190810160405280602281526020017f596f752061726520616c7265616479207468652063757272656e742077696e6e815260200160f160020a6132b902815250610634565b610311565b600354341461027f5761017860406040519081016040528060198152602001603860020a7856616c7565206d757374206d6174636820626964507269636502815250610634565b610311565b60045460649034025b600d80549290910491820190556009805434839003019055600c80546001019055600a8054600160a060020a03191633600160a060020a0316908117909155600554600b8054909101905560408051428152602081019290925280519293507f9a190cbd63f01b429ad1ffc2d976a9975a83c13d6d79c9b270cf39a80b2a480092918290030190a15b50565b005b341561031e57fe5b6103266106f9565b60408051918252519081900360200190f35b341561034057fe5b6103486106ff565b604080519115158252519081900360200190f35b341561036457fe5b61032661071c565b60408051918252519081900360200190f35b341561038657fe5b610326610722565b60408051918252519081900360200190f35b34156103a857fe5b6103b0610728565b60408051921515835260208301919091528051918290030190f35b34156103d357fe5b6103266108b1565b60408051918252519081900360200190f35b34156103f557fe5b6103486108b7565b604080519115158252519081900360200190f35b341561041957fe5b6103266109e7565b60408051918252519081900360200190f35b341561043b57fe5b6103486109ed565b604080519115158252519081900360200190f35b341561045f57fe5b610326610a18565b60408051918252519081900360200190f35b341561048157fe5b610489610a1e565b60408051600160a060020a039092168252519081900360200190f35b34156104ad57fe5b610326610a2d565b60408051918252519081900360200190f35b34156104cf57fe5b610489610a33565b60408051600160a060020a039092168252519081900360200190f35b34156104fb57fe5b6103b0610a42565b60408051921515835260208301919091528051918290030190f35b341561052657fe5b61052e610cdb565b6040518082600381111561053e57fe5b60ff16815260200191505060405180910390f35b341561055a57fe5b610348610ce4565b604080519115158252519081900360200190f35b341561057e57fe5b610326610d01565b60408051918252519081900360200190f35b34156105a057fe5b610326610d07565b60408051918252519081900360200190f35b34156105c257fe5b610326610d0d565b60408051918252519081900360200190f35b34156105e457fe5b610326610d2c565b60408051918252519081900360200190f35b341561060657fe5b610489610d32565b60408051600160a060020a039092168252519081900360200190f35b610314610d41565b005b600080516020610e0a83398151915281604051808060200182810382528381815181526020019150805190602001908083836000831461068f575b80518252602083111561068f57601f19909201916020918201910161066f565b505050905090810190601f1680156106bb5780820380516001836020036101000a031916815260200191505b509250505060405180910390a1604051600160a060020a033316903490600081818185876187965a03f19250505015156103115760006000fd5b5b50565b60035481565b600060015b60085460ff16600381111561071557fe5b1190505b90565b60045481565b60075481565b600e54600090819060ff161561073e5760006000fd5b600e805460ff1916600117905560005433600160a060020a039081169116141561085657600d5415156107bb57604080516020808252601190820152607860020a704e6f206665657320746f2072656465656d02818301529051600080516020610e0a8339815191529181900360600190a1506000905080610850565b50600d80546000918290556001546040519192600160a060020a0390911691839181818185876187965a03f192505050151561084b57604080516020808252601b908201527f4661696c656420746f2073656e6420746f20636f6c6c6563746f720000000000818301529051600080516020610e0a8339815191529181900360600190a1600d5550600080610850565b600191505b5b6108a1565b604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9030b236b4b702818301529051600080516020610e0a8339815191529181900360600190a15b5b600e805460ff191690555b9091565b600b5481565b60006001805b60085460ff1660038111156108ce57fe5b14156109a557600b5442101561092f57604080516020808252601490820152606260020a73151a5b59481b9bdd081e595d08195e1c1a5c995902818301529051600080516020610e0a8339815191529181900360600190a1600091506109a0565b600880546002919060ff19166001835b0217905550600a54600954600c5460408051428152600160a060020a039094166020850152838101929092526060830152517f6fb6a8d590ccdf226481f20a995a894898b73dd6b057d2fa73fabd0f6c24227e9181900360800190a1600191505b6109e2565b604080516020808252601d90820152600080516020610e2a833981519152818301529051600080516020610e0a8339815191529181900360600190a15b5b5090565b60055481565b600060015b60085460ff166003811115610a0357fe5b148015610a125750600b544210155b90505b90565b60025481565b600154600160a060020a031681565b600d5481565b600a54600160a060020a031681565b600e546000908190819060ff1615610a5a5760006000fd5b600e805460ff191660011790556002805b60085460ff166003811115610a7c57fe5b1415610c8c5760005433600160a060020a0390811691161480610aad5750600a5433600160a060020a039081169116145b15610c3957600880546003919060ff19166001835b02179055506000805490925033600160a060020a0390811691161415610b1457600a54600954604051600160a060020a039092169181156108fc0291906000818181858888f193505050509150610b53565b600a5433600160a060020a0390811691161415610b5357600a54600954604051600160a060020a0390921691600081818185876187965a03f194505050505b5b811515610bd357600a5460095460408051428152600160a060020a033381166020830152909316838201526060830191909152517f53e10e5c1b2fec3b613c6b8c88e69cfc5672696d0092541411737693ff9e48769181900360800190a1600880546002919060ff19166001835b021790555060009350839250610c34565b600a5460095460408051428152600160a060020a033381166020830152909316838201526060830191909152517f18737e07ba2aac9c230bdd7119bde1c2d51cef17a2910224f55819e4b0651ea19181900360800190a16001600954935093505b610c86565b604080516020808252808201527f4f6e6c792063616c6c61626c652062792061646d696e206f722077696e6e6572818301529051600080516020610e0a8339815191529181900360600190a15b5b610cc9565b604080516020808252601d90820152600080516020610e2a833981519152818301529051600080516020610e0a8339815191529181900360600190a15b5b50600e805460ff191690555b509091565b60085460ff1681565b600060025b60085460ff166003811115610cfa57fe5b1490505b90565b60065481565b600c5481565b600b546000904210610d2157506000610719565b42600b540390505b90565b60095481565b600054600160a060020a031681565b60005b60085460ff166003811115610d5557fe5b14610d605760006000fd5b60005433600160a060020a03908116911614610d7c5760006000fd5b6002543414610d8b5760006000fd5b600880546001919060ff191682805b0217905550600254600955600154600a8054600160a060020a031916600160a060020a039092169190911790554260078190556006548101600b5560408051918252517e6e0c97de781a7389d44ba8fd35d1467cabb17ed04d038d166d34ab819213f39181900360200190a15b560008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa4e6f742063616c6c61626c6520696e2063757272656e74207374617465000000a165627a7a72305820626900882ae9f68c9cfb65a4c4eaaa4c5413db9a24877af09dfb83e538a681a70029a165627a7a723058209ecad941b362a7979949ed3f02a3ec5ba48c790e037a101499fe8758fb20f12d0029",
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
			"address": "0x5a10d5b0d6a317323ac8c4f8d3fc3b23073475d1",
			"updated_at": 1497686308123
		},
		"1497735007470": {
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
			"address": "0xc1697d3ae9e4bdf70f7b045a75a732d81f6a1280",
			"updated_at": 1497735038933
		},
		"1498282938751": {
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
			"address": "0x997ad147c196318cb5ea2cda6114b3af65422be9",
			"updated_at": 1498285429151
		},
		"1498368763054": {
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
			"address": "0xaccd87e39370e6263cc7329fde70f14e140f0948",
			"updated_at": 1498368981227
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1498368981227
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
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "msg",
					"type": "string"
				}
			],
			"name": "RegistryError",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b5b7f4f574e455200000000000000000000000000000000000000000000000000000060009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f8054600160a060020a03191633600160a060020a03161790555b5b6101af806100816000396000f300606060405263ffffffff60e060020a600035041663bb34534c811461002c578063d22057a91461005b575bfe5b341561003457fe5b61003f60043561007c565b60408051600160a060020a039092168252519081900360200190f35b341561006357fe5b61007a600435600160a060020a03602435166100a7565b005b600081815260208190526040902054600160a060020a03168015156100a15760006000fd5b5b919050565b60d960020a6427aba722a90260009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f5433600160a060020a039081169116141561011e5760008281526020819052604090208054600160a060020a031916600160a060020a0383161790555b61017e565b604080516020808252601990820152603860020a784f6e6c792063616c6c61626c65206279205472656173757279028183015290517fb05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d69181900360600190a15b5b50505600a165627a7a7230582060fd53d580f75d34150e84193c5ba978bfb0e26c1f4f0b50c322154dc81e9a960029",
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
			"address": "0x3675a36b53f567d7760d5970d5c50b0f94e27ef1",
			"updated_at": 1497686308118
		},
		"1497735007470": {
			"events": {},
			"links": {},
			"address": "0xff411a22c8f40f45dbb314f34de3912a3e45257a",
			"updated_at": 1497735038933
		},
		"1498282938751": {
			"events": {
				"0xb05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d6": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "RegistryError",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x32f53aa38ee1d9885e86acff5b003bb10b752c9c",
			"updated_at": 1498285429146
		},
		"1498368763054": {
			"events": {
				"0xb05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d6": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "RegistryError",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x943169423b1b5e4403d7c5ed58a77e6698a2c658",
			"updated_at": 1498368981221
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1498368981221
};

/***/ }),
/* 5 */,
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

// copy over
window.Artifacts = {
	Registry: 					__webpack_require__(4),
	Treasury: 					__webpack_require__(7),
	MainController: 			__webpack_require__(0),
	PennyAuctionController: 	__webpack_require__(2),
	PennyAuctionFactory: 		__webpack_require__(3),
	PennyAuction: 				__webpack_require__(1)
}

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = {
	"contract_name": "Treasury",
	"abi": [
		{
			"constant": false,
			"inputs": [
				{
					"name": "_value",
					"type": "uint256"
				}
			],
			"name": "withdraw",
			"outputs": [],
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
					"name": "_value",
					"type": "uint256"
				}
			],
			"name": "fundMainController",
			"outputs": [
				{
					"name": "_success",
					"type": "bool"
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
					"name": "recipient",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "value",
					"type": "uint256"
				}
			],
			"name": "NotEnoughFunds",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "recipient",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "value",
					"type": "uint256"
				}
			],
			"name": "TransferSuccess",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"name": "recipient",
					"type": "address"
				},
				{
					"indexed": false,
					"name": "value",
					"type": "uint256"
				}
			],
			"name": "TransferError",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160208061045f83398101604052515b805b805b600160a060020a03811615156100385760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b6103f6806100696000396000f300606060405236156100515763ffffffff60e060020a6000350416632e1a7d4d811461005a5780635ab1bd531461006f578063893d20e81461009b578063c12eab90146100c7578063cd769b37146100ee575b6100585b5b565b005b341561006257fe5b61005860043561011a565b005b341561007757fe5b61007f610147565b60408051600160a060020a039092168252519081900360200190f35b34156100a357fe5b61007f610157565b60408051600160a060020a039092168252519081900360200190f35b34156100cf57fe5b6100da6004356101cf565b604080519115158252519081900360200190f35b34156100f657fe5b61007f610213565b60408051600160a060020a039092168252519081900360200190f35b610122610157565b600160a060020a031633600160a060020a03161415156101425760006000fd5b5b5b50565b600054600160a060020a03165b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156101b457fe5b6102c65a03f115156101c257fe5b5050604051519150505b90565b60006101d9610213565b600160a060020a031633600160a060020a03161415156101f95760006000fd5b61020a610204610213565b83610239565b90505b5b919050565b6000610233608960020a6e26a0a4a72fa1a7a72a2927a62622a90261035a565b90505b90565b600030600160a060020a0316318211156102995760408051600160a060020a03851681526020810184905281517f13308fecf027645219266c1c34e891ab49b0dae1f45f719f35a4485cd00be4ad929181900390910190a1506000610353565b604051600160a060020a038416908390600081818185876187965a03f1925050501561030b5760408051600160a060020a03851681526020810184905281517f2e1ece5fb4a04cb9407bb825ceb4c6d6d402c18ba1cbe2054241fb1a86fd58da929181900390910190a1506001610353565b60408051600160a060020a03851681526020810184905281517f55b12570518c9cbe020a73b7f15c4f882caf03d1318b65e7e28d95a328b03867929181900390910190a15060005b5b92915050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156103ad57fe5b6102c65a03f115156103bb57fe5b5050604051519150505b9190505600a165627a7a723058202c38156a41e643c4d31aced68c538a506cc29bc8580fa549b48a1989f3fb33f10029",
	"networks": {
		"1497250094702": {
			"links": {},
			"events": {
				"0xdf8b2ad6fa89b986609f18f3e889d139dd700284a4dbc2af78dc7bd32cf85a18": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "requestor",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				}
			},
			"updated_at": 1497335739769,
			"address": "0x2969c31be2cea019d73e3c7e6b9b3f17e5414434"
		},
		"1497564287593": {
			"events": {
				"0xdf8b2ad6fa89b986609f18f3e889d139dd700284a4dbc2af78dc7bd32cf85a18": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "requestor",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x76fbfd168792f43dd52e38e1d5b4110b742d3892",
			"updated_at": 1497652521703
		},
		"1497654807337": {
			"events": {
				"0xdf8b2ad6fa89b986609f18f3e889d139dd700284a4dbc2af78dc7bd32cf85a18": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "requestor",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x8bd9ec8f089e77be74289df123a5e4a7bcca2961",
			"updated_at": 1497659500741
		},
		"1497667709496": {
			"events": {
				"0xdf8b2ad6fa89b986609f18f3e889d139dd700284a4dbc2af78dc7bd32cf85a18": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "requestor",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				}
			},
			"links": {},
			"address": "0xa6cf80fe6d1402061dd2cb696aca90f04f92d68e",
			"updated_at": 1497686308118
		},
		"1497735007470": {
			"events": {
				"0xdf8b2ad6fa89b986609f18f3e889d139dd700284a4dbc2af78dc7bd32cf85a18": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "requestor",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						},
						{
							"indexed": false,
							"name": "msg",
							"type": "string"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x7b034ebc184b084554b53c67002ad5daac45e004",
			"updated_at": 1497735038935
		},
		"1498282938751": {
			"events": {
				"0x13308fecf027645219266c1c34e891ab49b0dae1f45f719f35a4485cd00be4ad": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "recipient",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				},
				"0x2e1ece5fb4a04cb9407bb825ceb4c6d6d402c18ba1cbe2054241fb1a86fd58da": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "recipient",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						}
					],
					"name": "TransferSuccess",
					"type": "event"
				},
				"0x55b12570518c9cbe020a73b7f15c4f882caf03d1318b65e7e28d95a328b03867": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "recipient",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						}
					],
					"name": "TransferError",
					"type": "event"
				}
			},
			"links": {},
			"address": "0xd4a049d31d36edc3207a8699b768dd6edce9ab13",
			"updated_at": 1498285429152
		},
		"1498368763054": {
			"events": {
				"0x13308fecf027645219266c1c34e891ab49b0dae1f45f719f35a4485cd00be4ad": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "recipient",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						}
					],
					"name": "NotEnoughFunds",
					"type": "event"
				},
				"0x2e1ece5fb4a04cb9407bb825ceb4c6d6d402c18ba1cbe2054241fb1a86fd58da": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "recipient",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						}
					],
					"name": "TransferSuccess",
					"type": "event"
				},
				"0x55b12570518c9cbe020a73b7f15c4f882caf03d1318b65e7e28d95a328b03867": {
					"anonymous": false,
					"inputs": [
						{
							"indexed": false,
							"name": "recipient",
							"type": "address"
						},
						{
							"indexed": false,
							"name": "value",
							"type": "uint256"
						}
					],
					"name": "TransferError",
					"type": "event"
				}
			},
			"links": {},
			"address": "0x96ba1782e01bb5b4abc734183c5c19133c23ac6a",
			"updated_at": 1498368981224
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1498368981224
};

/***/ })
/******/ ]);