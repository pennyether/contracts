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
					"name": "_success",
					"type": "bool"
				},
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
					"name": "msg",
					"type": "string"
				}
			],
			"name": "RegistryError",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160208061084d83398101604052515b805b815b825b825b600160a060020a038116151561003c5760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b505b505b6107dc806100716000396000f300606060405236156100725763ffffffff60e060020a600035041663028078c2811461007b57806316a85370146100a75780633b19e84a146100cb5780635ab1bd53146100f75780636e9960c314610123578063893d20e81461014f578063b6533f9e1461017b578063df15196d146101a9575b6100795b5b565b005b341561008357fe5b61008b6101eb565b60408051600160a060020a039092168252519081900360200190f35b34156100af57fe5b6100b761021a565b604080519115158252519081900360200190f35b34156100d357fe5b61008b610292565b60408051600160a060020a039092168252519081900360200190f35b34156100ff57fe5b61008b6102b1565b60408051600160a060020a039092168252519081900360200190f35b341561012b57fe5b61008b6102c1565b60408051600160a060020a039092168252519081900360200190f35b341561015757fe5b61008b6102dd565b60408051600160a060020a039092168252519081900360200190f35b341561018357fe5b61018e600435610355565b60408051921515835290151560208301528051918290030190f35b34156101b157fe5b6101c8600435602435604435606435608435610527565b604080519215158352600160a060020a0390911660208301528051918290030190f35b6000610214604160020a772822a7272cafa0aaa1aa24a7a72fa1a7a72a2927a62622a902610720565b90505b90565b60006102246102dd565b600160a060020a031633600160a060020a03161415610243575b610217565b604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9027bbb732b9028183015290516000805160206107918339815191529181900360600190a15b5b90565b600061021460c060020a67545245415355525902610720565b90505b90565b600054600160a060020a03165b90565b600061021460d960020a6420a226a4a702610720565b90505b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b151561033a57fe5b6102c65a03f1151561034857fe5b5050604051519150505b90565b600060006000600060006103676102c1565b600160a060020a031633600160a060020a031614156104d3576103886101eb565b925082600160a060020a03166384621ac66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156103d057fe5b6102c65a03f115156103de57fe5b50505060405180519050915082600160a060020a03166340806f7c6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561043057fe5b6102c65a03f1151561043e57fe5b505060405151915050600082118061045557508581115b156104c5576104626101eb565b600160a060020a03166385464ad36000604051606001526040518163ffffffff1660e060020a028152600401809050606060405180830381600087803b15156104a757fe5b6102c65a03f115156104b557fe5b50600196508695506104ce915050565b60016000945094505b61051e565b604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9020b236b4b7028183015290516000805160206107918339815191529181900360600190a15b5b505050915091565b60006000600060006105376102c1565b600160a060020a031633600160a060020a031614156106c857610558610292565b600160a060020a031663c12eab908a6000604051602001526040518263ffffffff1660e060020a02815260040180828152602001915050602060405180830381600087803b15156105a557fe5b6102c65a03f115156105b357fe5b506105c091506101eb9050565b600160a060020a0316638d3054378a8b8b8b8b8b6000604051604001526040518763ffffffff1660e060020a02815260040180868152602001858152602001848152602001838152602001828152602001955050505050506040604051808303818588803b151561062d57fe5b6125ee5a03f1151561063b57fe5b50506040518051602090910151909450925050508115156106bb57604080516020808252601d908201527f556e61626c6520746f2073746172742061206e65772061756374696f6e0000008183015290517f08c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa9181900360600190a16106c3565b600181935093505b610713565b604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9020b236b4b7028183015290516000805160206107918339815191529181900360600190a15b5b50509550959350505050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b151561077357fe5b6102c65a03f1151561078157fe5b5050604051519150505b9190505600b05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d6a165627a7a723058200cbaaa80f9ca0bdc7659bc6568b132a784f1aeb32f3fe0e122884762b63e3e080029",
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
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497741895513
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
			"outputs": [
				{
					"name": "_success",
					"type": "bool"
				}
			],
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
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160e080610fbb83398101604090815281516020830151918301516060840151608085015160a086015160c09096015193959293919290915b600085116100555760006000fd5b600084116100635760006000fd5b603c8310156100725760006000fd5b60648211156100815760006000fd5b6102588110156100915760006000fd5b60008054600160a060020a03808a16600160a060020a031992831617835560018054918a16919092161781556002879055600386905560058590556004849055600683905560088054909160ff1990911690835b02179055505b505050505050505b610eb9806101026000396000f3006060604052361561010c5763ffffffff60e060020a60003504166319afe47381146102d15780631ebcd53f146102f357806326741003146103175780632e1a0f32146103395780633a047bb31461035b57806343713d351461038657806343d726d6146103a857806346ac5e2b146103cc5780637a00cf46146103ee5780638566311914610412578063913e77ad146104345780639af1d35a14610460578063aabe2fe314610482578063be040fb0146104ae578063c19d93fb146104d9578063c2b6b58c1461050d578063c326186e14610531578063ce9ec0a614610553578063dac6270d14610575578063e3ac5d2614610597578063f851a440146105b9578063fcfff16f146105e5575b6102cf5b600e805460ff19166001908117909155600090805b60085460ff16600381111561013657fe5b141561026c57600a5433600160a060020a0390811691161461020557600b5442106101615760006000fd5b60035434146101705760006000fd5b60045460649034025b600d80549290910491820190556009805434839003019055600a8054600160a060020a03191633600160a060020a0316908117909155600554600b80549091019055600c805460010190556040805191825242602083015280519294507f1e05deb7b042138fe08c48558c26d4914a565892058cea78fbf5dd38056d34d292918290030190a15b610264565b600e5460ff1661025e57604080516020808252601690820152605160020a752737ba1031b0b63630b1363290313c903bb4b73732b902818301529051600080516020610e4e8339815191529181900360600190a1610264565b60006000fd5b5b5b5b6102bd565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a16102bd565b60006000fd5b5b5b5b50600e805460ff191690555b50565b005b34156102d957fe5b6102e1610601565b60408051918252519081900360200190f35b34156102fb57fe5b610303610607565b604080519115158252519081900360200190f35b341561031f57fe5b6102e1610624565b60408051918252519081900360200190f35b341561034157fe5b6102e161062a565b60408051918252519081900360200190f35b341561036357fe5b61036b610630565b60408051921515835260208301919091528051918290030190f35b341561038e57fe5b6102e16107d5565b60408051918252519081900360200190f35b34156103b057fe5b6103036107db565b604080519115158252519081900360200190f35b34156103d457fe5b6102e1610922565b60408051918252519081900360200190f35b34156103f657fe5b610303610928565b604080519115158252519081900360200190f35b341561041a57fe5b6102e1610953565b60408051918252519081900360200190f35b341561043c57fe5b610444610959565b60408051600160a060020a039092168252519081900360200190f35b341561046857fe5b6102e1610968565b60408051918252519081900360200190f35b341561048a57fe5b61044461096e565b60408051600160a060020a039092168252519081900360200190f35b34156104b657fe5b61036b61097d565b60408051921515835260208301919091528051918290030190f35b34156104e157fe5b6104e9610c02565b604051808260038111156104f957fe5b60ff16815260200191505060405180910390f35b341561051557fe5b610303610c0b565b604080519115158252519081900360200190f35b341561053957fe5b6102e1610c28565b60408051918252519081900360200190f35b341561055b57fe5b6102e1610c2e565b60408051918252519081900360200190f35b341561057d57fe5b6102e1610c34565b60408051918252519081900360200190f35b341561059f57fe5b6102e1610c53565b60408051918252519081900360200190f35b34156105c157fe5b610444610c59565b60408051600160a060020a039092168252519081900360200190f35b610303610c68565b604080519115158252519081900360200190f35b60035481565b600060015b60085460ff16600381111561061d57fe5b1190505b90565b60045481565b60075481565b600e546000908190610100900460ff161561064b5760006000fd5b600e805461ff00191661010017905560005433600160a060020a039081169116141561076357600d5415156106ca57604080516020808252601190820152607860020a704e6f206665657320746f2072656465656d02818301529051600080516020610e4e8339815191529181900360600190a150600090508061075d565b50600d80546000918290556001546040519192600160a060020a0390911691839181818185876187965a03f192505050151561075857604080516020808252601890820152604160020a772330b4b632b21031b0b636103a379031b7b63632b1ba37b902818301529051600080516020610e4e8339815191529181900360600190a1600d555060008061075d565b600191505b5b6107c2565b600e5460ff1661025e57604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9030b236b4b702818301529051600080516020610e4e8339815191529181900360600190a16107c2565b60006000fd5b5b5b5b600e805461ff00191690555b9091565b600b5481565b60006001805b60085460ff1660038111156107f257fe5b14156108ca57600b5442101561085457604080516020808252601590820152605960020a742a34b6b2903737ba103cb2ba1032bc3834b932b21702818301529051600080516020610e4e8339815191529181900360600190a1600091506108c5565b600880546002919060ff19166001835b0217905550600a54600954600c5460408051600160a060020a039094168452426020850152838101929092526060830152517f904e5f2a528d60cdd1b1bca4a2d088e253bc223d75ae567e66de3401ee20bd9d9181900360800190a1600191505b61091b565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a161091b565b60006000fd5b5b5b5b5090565b60055481565b600060015b60085460ff16600381111561093e57fe5b14801561094d5750600b544210155b90505b90565b60025481565b600154600160a060020a031681565b600d5481565b600a54600160a060020a031681565b600e5460009081908190610100900460ff161561099a5760006000fd5b600e805461ff0019166101001790556002805b60085460ff1660038111156109be57fe5b1415610b9c5760005433600160a060020a03908116911614806109ef5750600a5433600160a060020a039081169116145b15610b3357600880546003919060ff19166001835b02179055506000546001925033600160a060020a0390811691161415610a5657600a54600954604051600160a060020a039092169181156108fc0291906000818181858888f193505050509150610a95565b600a5433600160a060020a0390811691161415610a9557600a54600954604051600160a060020a0390921691600081818185876187965a03f194505050505b5b811515610ab757600880546002919060ff19166001835b0217905550600091505b600a5460095460408051600160a060020a0333811682529093166020840152428382015260608301919091528315156080830152517fb0061869ebea4a96e9396a8394c8a2d81caeef0431463f7c89d1d8e4d50bcd209181900360a00190a181610b2357600080610b29565b60016009545b935093505b610b94565b600e5460ff1661025e57604080516020808252808201527f4f6e6c792063616c6c61626c652062792061646d696e206f722077696e6e6572818301529051600080516020610e4e8339815191529181900360600190a1610b94565b60006000fd5b5b5b5b610bed565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a1610bed565b60006000fd5b5b5b5b50600e805461ff00191690555b509091565b60085460ff1681565b600060025b60085460ff166003811115610c2157fe5b1490505b90565b60065481565b600c5481565b600b546000904210610c4857506000610621565b42600b540390505b90565b60095481565b600054600160a060020a031681565b600080805b60085460ff166003811115610c7e57fe5b14156108ca5760005433600160a060020a0390811691161415610d8e576002543414610d09576040805160208082526022908201527f56616c75652073656e74206d75737420657175616c20696e697469616c5072698183015260f060020a617a650260608201529051600080516020610e4e8339815191529181900360800190a160009150610d89565b600880546001919060ff191682805b0217905550600254600955600154600a8054600160a060020a031916600160a060020a039092169190911790554260078190556006548101600b5560408051918252517e6e0c97de781a7389d44ba8fd35d1467cabb17ed04d038d166d34ab819213f39181900360200190a1600191505b6108c5565b600e5460ff1661025e57604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9030b236b4b702818301529051600080516020610e4e8339815191529181900360600190a16108c5565b60006000fd5b5b5b5b61091b565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a161091b565b60006000fd5b5b5b5b5090560008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa4e6f742063616c6c61626c6520696e2063757272656e74207374617465000000a165627a7a72305820ab855fb47ce888874ded960042d8c7742be8a099baaa1aa9e05f5ef4c1e5e3790029",
	"networks": {},
	"schema_version": "0.0.5",
	"updated_at": 1497741895514
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
					"name": "_success",
					"type": "bool"
				},
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
					"name": "_success",
					"type": "bool"
				},
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
					"name": "_success",
					"type": "bool"
				},
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
					"name": "msg",
					"type": "string"
				}
			],
			"name": "RegistryError",
			"type": "event"
		}
	],
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160608061148e8339810160409081528151602083015191909201515b825b835b815b600160a060020a03811615156100475760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b50600482905560058190555b5050505b611408806100866000396000f300606060405236156100e05763ffffffff60e060020a60003504166313114a9d81146100e257806325e6c3041461010457806337a28979146101265780633b13b0951461015057806340806f7c146101725780635ab1bd531461019d5780635bc1fda5146101c9578063618976c2146101eb57806384621ac61461020d57806385464ad314610238578063893d20e8146102685780638b034136146102945780638b5cef6f146102b65780638d305437146102d8578063a9d46e8a14610312578063c717315614610341578063cd769b371461036d578063cefd99fc14610399575bfe5b34156100ea57fe5b6100f26103c8565b60408051918252519081900360200190f35b341561010c57fe5b6100f26103ce565b60408051918252519081900360200190f35b341561012e57fe5b61013c6004356024356103d4565b604080519115158252519081900360200190f35b341561015857fe5b6100f261044e565b60408051918252519081900360200190f35b341561017a57fe5b610182610454565b60408051921515835260208301919091528051918290030190f35b34156101a557fe5b6101ad61056c565b60408051600160a060020a039092168252519081900360200190f35b34156101d157fe5b6100f261057c565b60408051918252519081900360200190f35b34156101f357fe5b6100f2610583565b60408051918252519081900360200190f35b341561021557fe5b610182610589565b60408051921515835260208301919091528051918290030190f35b341561024057fe5b610248610739565b604080519315158452602084019290925282820152519081900360600190f35b341561027057fe5b6101ad610d89565b60408051600160a060020a039092168252519081900360200190f35b341561029c57fe5b6100f2610e01565b60408051918252519081900360200190f35b34156102be57fe5b6100f2610e07565b60408051918252519081900360200190f35b6102ef600435602435604435606435608435610e0e565b604080519215158352600160a060020a0390911660208301528051918290030190f35b341561031a57fe5b6101ad6004356111e1565b60408051600160a060020a039092168252519081900360200190f35b341561034957fe5b6101ad611213565b60408051600160a060020a039092168252519081900360200190f35b341561037557fe5b6101ad61123f565b60408051600160a060020a039092168252519081900360200190f35b34156103a157fe5b6101ad600435611265565b60408051600160a060020a039092168252519081900360200190f35b60015481565b60025481565b60006103de61123f565b600160a060020a031633600160a060020a0316141561040a57506004829055600581905560015b610447565b604080516020808252601f9082015260008051602061137d8339815191528183015290516000805160206113bd8339815191529181900360600190a15b5b92915050565b60045481565b60006000600061046261123f565b600160a060020a031633600160a060020a03161415610529575060005b60065481101561051f57600680548290811061049757fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316639af1d35a6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156104fc57fe5b6102c65a03f1151561050a57fe5b5050604051519290920191505b60010161047f565b600192505b610566565b604080516020808252601f9082015260008051602061137d8339815191528183015290516000805160206113bd8339815191529181900360600190a15b5b509091565b600054600160a060020a03165b90565b6007545b90565b60055481565b60006000600061059761123f565b600160a060020a031633600160a060020a03161415610529575060005b60065481101561051f5760068054829081106105cc57fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316637a00cf466000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561063157fe5b6102c65a03f1151561063f57fe5b5050604051519050806106d75750600680548290811061065b57fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316600160a060020a0316631ebcd53f6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156106c057fe5b6102c65a03f115156106ce57fe5b50506040515190505b156106e3576001820191505b5b6001016105b4565b600192505b610566565b604080516020808252601f9082015260008051602061137d8339815191528183015290516000805160206113bd8339815191529181900360600190a15b5b509091565b6000600060006000600060006000600061075161123f565b600160a060020a031633600160a060020a03161415610d4157600093505b600654841015610d2a57600680548590811061078757fe5b906000526020600020900160005b9054906101000a9004600160a060020a0316925082600160a060020a0316637a00cf466000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156107ef57fe5b6102c65a03f115156107fd57fe5b5050604051511590506108625782600160a060020a03166343d726d66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b151561085057fe5b6102c65a03f1151561085e57fe5b5050505b82600160a060020a031663c2b6b58c6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b15156108a857fe5b6102c65a03f115156108b657fe5b50506040515115905061091b5782600160a060020a031663be040fb06000604051604001526040518163ffffffff1660e060020a028152600401809050604060405180830381600087803b151561090957fe5b6102c65a03f1151561091757fe5b5050505b82600160a060020a0316633a047bb36000604051604001526040518163ffffffff1660e060020a028152600401809050604060405180830381600087803b151561096157fe5b6102c65a03f1151561096f57fe5b505060405180516020909101519093509150508115156109e057604080516020808252601690820152605160020a752ab730b13632903a37903932b232b2b6903332b2b9970281830152905160008051602061139d8339815191529181900360600190a16001805482019055948501945b82600160a060020a0316631ebcd53f6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610a2657fe5b6102c65a03f11515610a3457fe5b505060405151159050610ccf5782600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610a8757fe5b6102c65a03f11515610a9557fe5b505060408051805160028054909101905560006020918201819052825160e160020a63674f60530281529251600160a060020a038816945063ce9ec0a69360048082019493918390030190829087803b1515610aed57fe5b6102c65a03f11515610afb57fe5b505060405151600380549091019055506007805460018101610b1d8382611307565b916000526020600020900160005b85909190916101000a815481600160a060020a030219169083600160a060020a03160217905550506001870196507f793259435822ae2d20e1178d7db3b88fc55f54398268b0607a40dbfcb9f2981a834285600160a060020a031663aabe2fe36000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610bc257fe5b6102c65a03f11515610bd057fe5b5050506040518051905086600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610c2057fe5b6102c65a03f11515610c2e57fe5b5050506040518051905087600160a060020a031663ce9ec0a66000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b1515610c7e57fe5b6102c65a03f11515610c8c57fe5b5050604080518051600160a060020a03978816825260208201969096529390951683860152506060820152608081019190915290519081900360a00190a1610d1e565b848414610d175782600686815481101515610ce657fe5b906000526020600020900160005b6101000a815481600160a060020a030219169083600160a060020a031602179055505b6001909401935b5b60019093019261076f565b84610d36600682611307565b50600197505b610d7e565b604080516020808252601f9082015260008051602061137d8339815191528183015290516000805160206113bd8339815191529181900360600190a15b5b5050505050909192565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b1515610de657fe5b6102c65a03f11515610df457fe5b5050604051519150505b90565b60035481565b6006545b90565b60006000600060006000610e2061123f565b600160a060020a031633600160a060020a0316141561119657348a14610e9357604080516020808252601e908201527f56616c7565206d75737420657175616c20696e697469616c207072697a65000081830152905160008051602061139d8339815191529181900360600190a1611191565b6005548a1115610eec57604080516020808252601690820152605060020a75696e697469616c5072697a6520746f6f206c617267650281830152905160008051602061139d8339815191529181900360600190a1611191565b60045460065410610f4657604080516020808252601690820152605160020a752a37b79036b0b73c9030bab1ba34b7b7399037b832b70281830152905160008051602061139d8339815191529181900360600190a1611191565b610f4e611213565b600160a060020a0316638a157df38b8b8b8b8b6000604051604001526040518663ffffffff1660e060020a0281526004018086815260200185815260200184815260200183815260200182815260200195505050505050604060405180830381600087803b1515610fbb57fe5b6102c65a03f11515610fc957fe5b5050604051805160209091015190945092505082151561103557604080516020808252601990820152603960020a782ab730b13632903a379031b932b0ba329030bab1ba34b7b7170281830152905160008051602061139d8339815191529181900360600190a1611191565b81905080600160a060020a031663fcfff16f8b6000604051602001526040518263ffffffff1660e060020a0281526004018090506020604051808303818588803b151561107e57fe5b6125ee5a03f1151561108c57fe5b505060405151151591506110ec905057604080516020808252601790820152604960020a762ab730b13632903a379037b832b71030bab1ba34b7b7170281830152905160008051602061139d8339815191529181900360600190a1611191565b60068054600181016110fe8382611307565b916000526020600020900160005b8154600160a060020a038086166101009390930a83810291021990911617909155604080519182524260208301528181018d9052606082018c9052608082018b905260a082018a905260c08201899052517f6f5a579d15d667c25328d4d96fd687ef6db71fe369cdde0b5e193e5df1df708b92509081900360e00190a1600181945094505b6111d3565b604080516020808252601f9082015260008051602061137d8339815191528183015290516000805160206113bd8339815191529181900360600190a15b5b5050509550959350505050565b60068054829081106111ef57fe5b906000526020600020900160005b915054906101000a9004600160a060020a031681565b6000611239605860020a7450454e4e595f41554354494f4e5f464143544f525902611297565b90505b90565b6000611239608960020a6e26a0a4a72fa1a7a72a2927a62622a902611297565b90505b90565b60078054829081106111ef57fe5b906000526020600020900160005b915054906101000a9004600160a060020a031681565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156112ea57fe5b6102c65a03f115156112f857fe5b5050604051519150505b919050565b81548183558181151161132b5760008381526020902061132b91810190830161135b565b5b505050565b81548183558181151161132b5760008381526020902061132b91810190830161135b565b5b505050565b61057991905b808211156113755760008155600101611361565b5090565b9056004f6e6c792063616c6c61626c65206279204d61696e436f6e74726f6c6c65720008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aab05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d6a165627a7a723058204baff6562e9cb0b43c46bb1efe1bd3a0c3bd02c43d2b6cc25f1689075c6497280029",
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
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497741895514
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
					"name": "_success",
					"type": "bool"
				},
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
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160208061146b83398101604052515b805b815b815b600160a060020a038116151561003a5760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b505b6113fe8061006d6000396000f300606060405263ffffffff60e060020a600035041663028078c2811461004d5780633b19e84a146100795780635ab1bd53146100a5578063893d20e8146100d15780638a157df3146100fd575bfe5b341561005557fe5b61005d61013f565b60408051600160a060020a039092168252519081900360200190f35b341561008157fe5b61005d61016e565b60408051600160a060020a039092168252519081900360200190f35b34156100ad57fe5b61005d61018d565b60408051600160a060020a039092168252519081900360200190f35b34156100d957fe5b61005d61019d565b60408051600160a060020a039092168252519081900360200190f35b341561010557fe5b61011c600435602435604435606435608435610215565b604080519215158352600160a060020a0390911660208301528051918290030190f35b6000610168604160020a772822a7272cafa0aaa1aa24a7a72fa1a7a72a2927a62622a902610397565b90505b90565b600061016860c060020a67545245415355525902610397565b90505b90565b600054600160a060020a03165b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156101fa57fe5b6102c65a03f1151561020857fe5b5050604051519150505b90565b60006000600061022361013f565b600160a060020a031633600160a060020a031614156103175761024461013f565b61024c61016e565b8989898989610259610407565b600160a060020a0397881681529590961660208601526040808601949094526060850192909252608084015260a083015260c082019290925290519081900360e001906000f08015156102a857fe5b60408051600160a060020a0383168152602081018b90528082018a9052606081018990526080810188905260a0810187905290519192507fabdd2430f9e10eb5db384c1218c42f980dd5fcda760a680a0d95ec506f0963cb919081900360c00190a1600181925092505b61038b565b6040805160208082526027908201527f4f6e6c792063616c6c61626c652062792050656e6e7941756374696f6e436f6e8183015260c960020a663a3937b63632b902606082015290517fb05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d69181900360800190a15b5b509550959350505050565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156103ea57fe5b6102c65a03f115156103f857fe5b5050604051519150505b919050565b604051610fbb806104188339019056006060604052341561000c57fe5b60405160e080610fbb83398101604090815281516020830151918301516060840151608085015160a086015160c09096015193959293919290915b600085116100555760006000fd5b600084116100635760006000fd5b603c8310156100725760006000fd5b60648211156100815760006000fd5b6102588110156100915760006000fd5b60008054600160a060020a03808a16600160a060020a031992831617835560018054918a16919092161781556002879055600386905560058590556004849055600683905560088054909160ff1990911690835b02179055505b505050505050505b610eb9806101026000396000f3006060604052361561010c5763ffffffff60e060020a60003504166319afe47381146102d15780631ebcd53f146102f357806326741003146103175780632e1a0f32146103395780633a047bb31461035b57806343713d351461038657806343d726d6146103a857806346ac5e2b146103cc5780637a00cf46146103ee5780638566311914610412578063913e77ad146104345780639af1d35a14610460578063aabe2fe314610482578063be040fb0146104ae578063c19d93fb146104d9578063c2b6b58c1461050d578063c326186e14610531578063ce9ec0a614610553578063dac6270d14610575578063e3ac5d2614610597578063f851a440146105b9578063fcfff16f146105e5575b6102cf5b600e805460ff19166001908117909155600090805b60085460ff16600381111561013657fe5b141561026c57600a5433600160a060020a0390811691161461020557600b5442106101615760006000fd5b60035434146101705760006000fd5b60045460649034025b600d80549290910491820190556009805434839003019055600a8054600160a060020a03191633600160a060020a0316908117909155600554600b80549091019055600c805460010190556040805191825242602083015280519294507f1e05deb7b042138fe08c48558c26d4914a565892058cea78fbf5dd38056d34d292918290030190a15b610264565b600e5460ff1661025e57604080516020808252601690820152605160020a752737ba1031b0b63630b1363290313c903bb4b73732b902818301529051600080516020610e4e8339815191529181900360600190a1610264565b60006000fd5b5b5b5b6102bd565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a16102bd565b60006000fd5b5b5b5b50600e805460ff191690555b50565b005b34156102d957fe5b6102e1610601565b60408051918252519081900360200190f35b34156102fb57fe5b610303610607565b604080519115158252519081900360200190f35b341561031f57fe5b6102e1610624565b60408051918252519081900360200190f35b341561034157fe5b6102e161062a565b60408051918252519081900360200190f35b341561036357fe5b61036b610630565b60408051921515835260208301919091528051918290030190f35b341561038e57fe5b6102e16107d5565b60408051918252519081900360200190f35b34156103b057fe5b6103036107db565b604080519115158252519081900360200190f35b34156103d457fe5b6102e1610922565b60408051918252519081900360200190f35b34156103f657fe5b610303610928565b604080519115158252519081900360200190f35b341561041a57fe5b6102e1610953565b60408051918252519081900360200190f35b341561043c57fe5b610444610959565b60408051600160a060020a039092168252519081900360200190f35b341561046857fe5b6102e1610968565b60408051918252519081900360200190f35b341561048a57fe5b61044461096e565b60408051600160a060020a039092168252519081900360200190f35b34156104b657fe5b61036b61097d565b60408051921515835260208301919091528051918290030190f35b34156104e157fe5b6104e9610c02565b604051808260038111156104f957fe5b60ff16815260200191505060405180910390f35b341561051557fe5b610303610c0b565b604080519115158252519081900360200190f35b341561053957fe5b6102e1610c28565b60408051918252519081900360200190f35b341561055b57fe5b6102e1610c2e565b60408051918252519081900360200190f35b341561057d57fe5b6102e1610c34565b60408051918252519081900360200190f35b341561059f57fe5b6102e1610c53565b60408051918252519081900360200190f35b34156105c157fe5b610444610c59565b60408051600160a060020a039092168252519081900360200190f35b610303610c68565b604080519115158252519081900360200190f35b60035481565b600060015b60085460ff16600381111561061d57fe5b1190505b90565b60045481565b60075481565b600e546000908190610100900460ff161561064b5760006000fd5b600e805461ff00191661010017905560005433600160a060020a039081169116141561076357600d5415156106ca57604080516020808252601190820152607860020a704e6f206665657320746f2072656465656d02818301529051600080516020610e4e8339815191529181900360600190a150600090508061075d565b50600d80546000918290556001546040519192600160a060020a0390911691839181818185876187965a03f192505050151561075857604080516020808252601890820152604160020a772330b4b632b21031b0b636103a379031b7b63632b1ba37b902818301529051600080516020610e4e8339815191529181900360600190a1600d555060008061075d565b600191505b5b6107c2565b600e5460ff1661025e57604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9030b236b4b702818301529051600080516020610e4e8339815191529181900360600190a16107c2565b60006000fd5b5b5b5b600e805461ff00191690555b9091565b600b5481565b60006001805b60085460ff1660038111156107f257fe5b14156108ca57600b5442101561085457604080516020808252601590820152605960020a742a34b6b2903737ba103cb2ba1032bc3834b932b21702818301529051600080516020610e4e8339815191529181900360600190a1600091506108c5565b600880546002919060ff19166001835b0217905550600a54600954600c5460408051600160a060020a039094168452426020850152838101929092526060830152517f904e5f2a528d60cdd1b1bca4a2d088e253bc223d75ae567e66de3401ee20bd9d9181900360800190a1600191505b61091b565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a161091b565b60006000fd5b5b5b5b5090565b60055481565b600060015b60085460ff16600381111561093e57fe5b14801561094d5750600b544210155b90505b90565b60025481565b600154600160a060020a031681565b600d5481565b600a54600160a060020a031681565b600e5460009081908190610100900460ff161561099a5760006000fd5b600e805461ff0019166101001790556002805b60085460ff1660038111156109be57fe5b1415610b9c5760005433600160a060020a03908116911614806109ef5750600a5433600160a060020a039081169116145b15610b3357600880546003919060ff19166001835b02179055506000546001925033600160a060020a0390811691161415610a5657600a54600954604051600160a060020a039092169181156108fc0291906000818181858888f193505050509150610a95565b600a5433600160a060020a0390811691161415610a9557600a54600954604051600160a060020a0390921691600081818185876187965a03f194505050505b5b811515610ab757600880546002919060ff19166001835b0217905550600091505b600a5460095460408051600160a060020a0333811682529093166020840152428382015260608301919091528315156080830152517fb0061869ebea4a96e9396a8394c8a2d81caeef0431463f7c89d1d8e4d50bcd209181900360a00190a181610b2357600080610b29565b60016009545b935093505b610b94565b600e5460ff1661025e57604080516020808252808201527f4f6e6c792063616c6c61626c652062792061646d696e206f722077696e6e6572818301529051600080516020610e4e8339815191529181900360600190a1610b94565b60006000fd5b5b5b5b610bed565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a1610bed565b60006000fd5b5b5b5b50600e805461ff00191690555b509091565b60085460ff1681565b600060025b60085460ff166003811115610c2157fe5b1490505b90565b60065481565b600c5481565b600b546000904210610c4857506000610621565b42600b540390505b90565b60095481565b600054600160a060020a031681565b600080805b60085460ff166003811115610c7e57fe5b14156108ca5760005433600160a060020a0390811691161415610d8e576002543414610d09576040805160208082526022908201527f56616c75652073656e74206d75737420657175616c20696e697469616c5072698183015260f060020a617a650260608201529051600080516020610e4e8339815191529181900360800190a160009150610d89565b600880546001919060ff191682805b0217905550600254600955600154600a8054600160a060020a031916600160a060020a039092169190911790554260078190556006548101600b5560408051918252517e6e0c97de781a7389d44ba8fd35d1467cabb17ed04d038d166d34ab819213f39181900360200190a1600191505b6108c5565b600e5460ff1661025e57604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9030b236b4b702818301529051600080516020610e4e8339815191529181900360600190a16108c5565b60006000fd5b5b5b5b61091b565b600e5460ff1661025e57604080516020808252601d90820152600080516020610e6e833981519152818301529051600080516020610e4e8339815191529181900360600190a161091b565b60006000fd5b5b5b5b5090560008c379a0afcc32b1a39302f7cb8073359698411ab5fd6e3edb2c02c0b5fba8aa4e6f742063616c6c61626c6520696e2063757272656e74207374617465000000a165627a7a72305820ab855fb47ce888874ded960042d8c7742be8a099baaa1aa9e05f5ef4c1e5e3790029a165627a7a723058207abb63be5885b9c5ffcd8c96dc005ec416af4d9b958eec8dd76e304eb5a74a890029",
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
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497741895514
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
	"unlinked_binary": "0x6060604052341561000c57fe5b5b7f4f574e455200000000000000000000000000000000000000000000000000000060009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f8054600160a060020a03191633600160a060020a03161790555b5b61014f806100816000396000f300606060405263ffffffff60e060020a600035041663bb34534c811461002c578063d22057a91461005b575bfe5b341561003457fe5b61003f60043561007c565b60408051600160a060020a039092168252519081900360200190f35b341561006357fe5b61007a600435600160a060020a03602435166100a7565b005b600081815260208190526040902054600160a060020a03168015156100a15760006000fd5b5b919050565b60d960020a6427aba722a90260009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f5433600160a060020a039081169116146100f65760006000fd5b60008281526020819052604090208054600160a060020a031916600160a060020a0383161790555b5b50505600a165627a7a72305820d95cdbcb5f89e131fa1811604ddb7b09066ed23d4b195859646c4cb349e8d0c60029",
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
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497741895513
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
	"unlinked_binary": "0x6060604052341561000c57fe5b60405160208061040d83398101604052515b805b805b600160a060020a03811615156100385760006000fd5b60008054600160a060020a031916600160a060020a0383161790555b505b505b505b6103a4806100696000396000f300606060405236156100515763ffffffff60e060020a6000350416632e1a7d4d811461005a5780635ab1bd531461006f578063893d20e81461009b578063c12eab90146100c7578063cd769b37146100ee575b6100585b5b565b005b341561006257fe5b61005860043561011a565b005b341561007757fe5b61007f610190565b60408051600160a060020a039092168252519081900360200190f35b34156100a357fe5b61007f6101a0565b60408051600160a060020a039092168252519081900360200190f35b34156100cf57fe5b6100da600435610218565b604080519115158252519081900360200190f35b34156100f657fe5b61007f6102c2565b60408051600160a060020a039092168252519081900360200190f35b6101226101a0565b600160a060020a031633600160a060020a03161415610141575b61018c565b604080516020808252601690820152605160020a7527b7363c9031b0b63630b1363290313c9027bbb732b9028183015290516000805160206103598339815191529181900360600190a15b5b50565b600054600160a060020a03165b90565b60008054604080516020908101849052815160e260020a632ecd14d302815260d960020a6427aba722a90260048201529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b15156101fd57fe5b6102c65a03f1151561020b57fe5b5050604051519150505b90565b60006102226102c2565b600160a060020a031633600160a060020a0316141561026d576102436102c2565b604051600160a060020a0391909116908390600081818185876187965a03f193505050505b6102bc565b604080516020808252601f908201527f4f6e6c792063616c6c61626c65206279204d61696e436f6e74726f6c6c6572008183015290516000805160206103598339815191529181900360600190a15b5b919050565b60006102e2608960020a6e26a0a4a72fa1a7a72a2927a62622a9026102e8565b90505b90565b60008054604080516020908101849052815160e260020a632ecd14d3028152600481018690529151600160a060020a039093169263bb34534c92602480820193929182900301818787803b151561033b57fe5b6102c65a03f1151561034957fe5b5050604051519150505b9190505600b05bfda6dbd6d545813bcb28364d94bf22bf96e946f39eca93c17eaa224d93d6a165627a7a7230582005955d51fad98eba177340da5fc2980ff7cb0a085f095bc352ffef5382365e870029",
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
		}
	},
	"schema_version": "0.0.5",
	"updated_at": 1497741895514
};

/***/ })
/******/ ]);