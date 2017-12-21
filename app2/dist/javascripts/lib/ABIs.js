(function(){
    window.ABIs = {
  "Comptroller": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "_treasury",
            "type": "address"
          }
        ],
        "name": "initTreasury",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "tokensPerWei",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isStarted",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "treasury",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_numTokens",
            "type": "uint256"
          }
        ],
        "name": "burnTokens",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "buyTokens",
        "outputs": [
          {
            "name": "_numTokens",
            "type": "uint256"
          }
        ],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "locker",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "initSale",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "numTokens",
            "type": "uint256"
          }
        ],
        "name": "TokensBought",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "numTokens",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "refund",
            "type": "uint256"
          }
        ],
        "name": "TokensBurnt",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405260018054600160a060020a03191633600160a060020a03161790556100276101e5565b604051809103906000f080151561003d57600080fd5b60028054600160a060020a031916600160a060020a039283161790819055600154908216911661006b6101f5565b600160a060020a0392831681529116602082015260409081019051809103906000f080151561009957600080fd5b60038054600160a060020a031916600160a060020a03928316179055600254670de0b6b3a7640000911663313ce5676000604051602001526040518163ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401602060405180830381600087803b151561011857600080fd5b6102c65a03f1151561012957600080fd5b5050506040518051905060ff16600a0a6103e80281151561014657fe5b04600455341561015557600080fd5b600254600354600160a060020a039182169163f0dda65c911660016040517c010000000000000000000000000000000000000000000000000000000063ffffffff8516028152600160a060020a0390921660048301526024820152604401600060405180830381600087803b15156101cc57600080fd5b6102c65a03f115156101dd57600080fd5b505050610205565b604051610c1180610a6883390190565b6040516102528061167983390190565b610854806102146000396000f30060606040526004361061008a5763ffffffff60e060020a6000350416630b5e528581146100a757806322d60d17146100c6578063544736e6146100eb57806361d027b3146101125780636d1b229d146101415780638da5cb5b14610157578063d0febe4c1461016a578063d7b96d4e14610172578063df176f3714610185578063fc0c546a14610198575b60005433600160a060020a039081169116146100a557600080fd5b005b34156100b257600080fd5b6100a5600160a060020a03600435166101ab565b34156100d157600080fd5b6100d961028b565b60405190815260200160405180910390f35b34156100f657600080fd5b6100fe610291565b604051901515815260200160405180910390f35b341561011d57600080fd5b61012561029a565b604051600160a060020a03909116815260200160405180910390f35b341561014c57600080fd5b6100a56004356102a9565b341561016257600080fd5b6101256105bf565b6100d96105ce565b341561017d57600080fd5b6101256107b9565b341561019057600080fd5b6100a56107c8565b34156101a357600080fd5b610125610819565b60015433600160a060020a039081169116146101c657600080fd5b600054600160a060020a0316156101dc57600080fd5b30600160a060020a031681600160a060020a0316635fe3b5676000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b151561022c57600080fd5b6102c65a03f1151561023d57600080fd5b50505060405180519050600160a060020a031614151561025c57600080fd5b6000805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0392909216919091179055565b60045481565b60055460ff1681565b600054600160a060020a031681565b60008054600160a060020a031615156102c157600080fd5b600254600160a060020a03166370a082313360006040516020015260405160e060020a63ffffffff8416028152600160a060020a039091166004820152602401602060405180830381600087803b151561031a57600080fd5b6102c65a03f1151561032b57600080fd5b505050604051805190508211156103b257600254600160a060020a03166370a082313360006040516020015260405160e060020a63ffffffff8416028152600160a060020a039091166004820152602401602060405180830381600087803b151561039557600080fd5b6102c65a03f115156103a657600080fd5b50505060405180519250505b600454600502826004028115156103c557fe5b6000549190049150600160a060020a031631819010156103fd575060005460048054600160a060020a03909216319182026005020491505b633b9aca0081101561040e57600080fd5b600254600160a060020a0316630d1118ce338460405160e060020a63ffffffff8516028152600160a060020a0390921660048301526024820152604401600060405180830381600087803b151561046457600080fd5b6102c65a03f1151561047557600080fd5b5050600254600354600160a060020a039182169250630d1118ce91166005850460405160e060020a63ffffffff8516028152600160a060020a0390921660048301526024820152604401600060405180830381600087803b15156104d857600080fd5b6102c65a03f115156104e957600080fd5b5050600054600160a060020a0316905063c906743a8260405160e060020a63ffffffff84160281526004810191909152602401600060405180830381600087803b151561053557600080fd5b6102c65a03f1151561054657600080fd5b50505033600160a060020a03168160405160006040518083038185876187965a03f192505050151561057757600080fd5b33600160a060020a03167f116de1b338a6328c917113d4e6687e578bcfca3a781eaa69285e8dee2799a5ff838360405191825260208201526040908101905180910390a25050565b600154600160a060020a031681565b6005546000908190819060ff1615156105e657600080fd5b633b9aca003410156105f757600080fd5b600154600534049250600160a060020a03168260405160006040518083038185876187965a03f192505050151561062d57600080fd5b506000543482900390600160a060020a031663e4d64f3f826040518263ffffffff1660e060020a0281526004016000604051808303818588803b151561067257600080fd5b6125ee5a03f1151561068357600080fd5b5050600454600254349091029550600160a060020a0316915063f0dda65c9050338560405160e060020a63ffffffff8516028152600160a060020a0390921660048301526024820152604401600060405180830381600087803b15156106e857600080fd5b6102c65a03f115156106f957600080fd5b5050600254600354600160a060020a03918216925063f0dda65c91166005860460405160e060020a63ffffffff8516028152600160a060020a0390921660048301526024820152604401600060405180830381600087803b151561075c57600080fd5b6102c65a03f1151561076d57600080fd5b50505033600160a060020a03167f8442948036198f1146d3a63c3db355d7e0295c2cc5676c755990445da4fdc1c9348560405191825260208201526040908101905180910390a2505090565b600354600160a060020a031681565b60015433600160a060020a039081169116146107e357600080fd5b60055460ff16156107f357600080fd5b600054600160a060020a0316151561080a57600080fd5b6005805460ff19166001179055565b600254600160a060020a0316815600a165627a7a72305820164a10aefda2c8b2490bf7f37fcfc91abd3c16f63977ec2ad8fb9668ee393da200296060604090815260008054600160a060020a03191633600160a060020a03161790558051908101604052600a81527f50656e6e79457468657200000000000000000000000000000000000000000000602082015260019080516100669291602001906100cc565b5060408051908101604052600381527f4249440000000000000000000000000000000000000000000000000000000000602082015260029080516100ae9291602001906100cc565b506003805460ff1916601217905534156100c757600080fd5b610167565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061010d57805160ff191683800117855561013a565b8280016001018555821561013a579182015b8281111561013a57825182559160200191906001019061011f565b5061014692915061014a565b5090565b61016491905b808211156101465760008155600101610150565b90565b610a9b806101766000396000f3006060604052600436106101065763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306c0989d811461017b57806306fdde03146101ac578063095ea7b3146102365780630d1118ce1461026c57806318160ddd146102905780631a2efffc146102a357806323b872dd146102b6578063313ce567146102de578063406d62b614610307578063458bdf20146103265780635fe3b5671461033957806370a082311461036857806395d89b4114610387578063997664d71461039a578063a9059cbb146103ad578063b53dfd4d146103cf578063dd62ed3e146103ee578063f0dda65c14610413578063fd2994f714610435575b6004546d04ee2d6d415b85acef8100000000340281151561012357fe5b60098054929091049091019055600780543490810190915533600160a060020a0316907f4f60ae2e9a8dbad8476b2113febc44f2345e01b01b4c644fac9bb84a22abaf9a9060405190815260200160405180910390a2005b341561018657600080fd5b61019a600160a060020a0360043516610448565b60405190815260200160405180910390f35b34156101b757600080fd5b6101bf61045a565b60405160208082528190810183818151815260200191508051906020019080838360005b838110156101fb5780820151838201526020016101e3565b50505050905090810190601f1680156102285780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561024157600080fd5b610258600160a060020a03600435166024356104f8565b604051901515815260200160405180910390f35b341561027757600080fd5b61028e600160a060020a0360043516602435610564565b005b341561029b57600080fd5b61019a610618565b34156102ae57600080fd5b61019a61061e565b34156102c157600080fd5b610258600160a060020a0360043581169060243516604435610624565b34156102e957600080fd5b6102f16106d4565b60405160ff909116815260200160405180910390f35b341561031257600080fd5b61019a600160a060020a03600435166106dd565b341561033157600080fd5b61028e610720565b341561034457600080fd5b61034c6107c5565b604051600160a060020a03909116815260200160405180910390f35b341561037357600080fd5b61019a600160a060020a03600435166107d4565b341561039257600080fd5b6101bf6107ef565b34156103a557600080fd5b61019a61085a565b34156103b857600080fd5b61028e600160a060020a0360043516602435610860565b34156103da57600080fd5b61019a600160a060020a036004351661086f565b34156103f957600080fd5b61019a600160a060020a0360043581169060243516610881565b341561041e57600080fd5b61028e600160a060020a03600435166024356108ac565b341561044057600080fd5b61019a610939565b600a6020526000908152604090205481565b60018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156104f05780601f106104c5576101008083540402835291602001916104f0565b820191906000526020600020905b8154815290600101906020018083116104d357829003601f168201915b505050505081565b600160a060020a03338116600081815260066020908152604080832094871680845294909152808220859055909291907f35b43951b46e772259ca8b566c89beccb8d46513d2e0388b81504e7d27784f299085905190815260200160405180910390a350600192915050565b60005433600160a060020a0390811691161461057f57600080fd5b600160a060020a038216600090815260056020526040902054819010156105a557600080fd5b6105ae8261093f565b600160a060020a038216600081815260056020526040908190208054849003905560048054849003908190557f116de1b338a6328c917113d4e6687e578bcfca3a781eaa69285e8dee2799a5ff918491905191825260208201526040908101905180910390a25050565b60045481565b60085481565b600160a060020a038084166000908152600660209081526040808320339094168352929052908120548290101561065a57600080fd5b600160a060020a038085166000818152600660209081526040808320339095168084529490915290819020805486900390557f2103cdfb2f74999b6ffea5fdf05d864485c49a84f1bed894d5592f6a842663219085905190815260200160405180910390a36106ca84848461097a565b5060019392505050565b60035460ff1681565b600160a060020a0381166000908152600a60205260408120546d04ee2d6d415b85acef81000000009061070f84610a42565b0181151561071957fe5b0492915050565b600061072b3361093f565b5033600160a060020a03166000818152600a602052604080822080549290556d04ee2d6d415b85acef810000000090910491907fa1ba76c3f88ba893fb9932ba345d20aa986021c89b2b4d1d937715642b54a54a9083905190815260200160405180910390a2600160a060020a03331681156108fc0282604051600060405180830381858888f1935050505015156107c257600080fd5b50565b600054600160a060020a031681565b600160a060020a031660009081526005602052604090205490565b60028054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156104f05780601f106104c5576101008083540402835291602001916104f0565b60075481565b61086b33838361097a565b5050565b600b6020526000908152604090205481565b600160a060020a03918216600090815260066020908152604080832093909416825291909152205490565b60005433600160a060020a039081169116146108c757600080fd5b6108d08261093f565b6004805482018155600160a060020a03831660008181526005602052604090819020805485019055915490917f2e8ac5177a616f2aec08c3048f5021e4e9743ece034e8d83ba5caf76688bb4759184915191825260208201526040908101905180910390a25050565b60095481565b61094881610a42565b600160a060020a039091166000908152600a602090815260408083208054909401909355600954600b90915291902055565b600160a060020a038216600090815260056020526040902054818101116109a057600080fd5b600160a060020a038316600090815260056020526040902054819010156109c657600080fd5b6109cf8261093f565b6109d88361093f565b600160a060020a038084166000818152600560205260408082208054869003905592851680825290839020805485019055917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9084905190815260200160405180910390a3505050565b600160a060020a03166000908152600b6020908152604080832054600954600590935292205491900302905600a165627a7a72305820921bd391243086604d6cb2d0fcb3a29dbea0699cdef69bc9f7066fabab89d2d800296060604052341561000f57600080fd5b604051604080610252833981016040528080519190602001805160018054600160a060020a03958616600160a060020a03199182161790915560008054929095169116178355506101eb9182915061006790396000f3006060604052600436106100565763ffffffff7c0100000000000000000000000000000000000000000000000000000000600035041663458bdf2081146100585780638da5cb5b1461006b578063fc0c546a146100a7575b005b341561006357600080fd5b6100566100ba565b341561007657600080fd5b61007e610187565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200160405180910390f35b34156100b257600080fd5b61007e6101a3565b60015473ffffffffffffffffffffffffffffffffffffffff1663458bdf206000604051602001526040518163ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401602060405180830381600087803b151561012857600080fd5b6102c65a03f1151561013957600080fd5b5050506040518051505060005473ffffffffffffffffffffffffffffffffffffffff9081169030163160405160006040518083038185876187965a03f192505050151561018557600080fd5b565b60005473ffffffffffffffffffffffffffffffffffffffff1681565b60015473ffffffffffffffffffffffffffffffffffffffff16815600a165627a7a723058201892ada936f2bf069e60e47837ba644c3326295dcf5cbd08b11619c2058d827e0029"
  },
  "DividendToken": {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "creditedPoints",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_spender",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_account",
            "type": "address"
          },
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "burnTokens",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "collectedDividends",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_from",
            "type": "address"
          },
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "transferFrom",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {
            "name": "",
            "type": "uint8"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_account",
            "type": "address"
          }
        ],
        "name": "getCollectableDividends",
        "outputs": [
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "collectDividends",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "comptroller",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_owner",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "name": "balance",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalDividends",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "transfer",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "lastPointsPerToken",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_owner",
            "type": "address"
          },
          {
            "name": "_spender",
            "type": "address"
          }
        ],
        "name": "allowance",
        "outputs": [
          {
            "name": "remaining",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_to",
            "type": "address"
          },
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "mintTokens",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalPointsPerToken",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "AllowanceSet",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "AllowanceUsed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "spender",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "TransferFrom",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "account",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "newTotalSupply",
            "type": "uint256"
          }
        ],
        "name": "TokensMinted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "account",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "newTotalSupply",
            "type": "uint256"
          }
        ],
        "name": "TokensBurnt",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "account",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "CollectedDividends",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "DividendReceived",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604090815260008054600160a060020a03191633600160a060020a03161790558051908101604052600a81527f50656e6e79457468657200000000000000000000000000000000000000000000602082015260019080516100669291602001906100cc565b5060408051908101604052600381527f4249440000000000000000000000000000000000000000000000000000000000602082015260029080516100ae9291602001906100cc565b506003805460ff1916601217905534156100c757600080fd5b610167565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061010d57805160ff191683800117855561013a565b8280016001018555821561013a579182015b8281111561013a57825182559160200191906001019061011f565b5061014692915061014a565b5090565b61016491905b808211156101465760008155600101610150565b90565b610a9b806101766000396000f3006060604052600436106101065763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166306c0989d811461017b57806306fdde03146101ac578063095ea7b3146102365780630d1118ce1461026c57806318160ddd146102905780631a2efffc146102a357806323b872dd146102b6578063313ce567146102de578063406d62b614610307578063458bdf20146103265780635fe3b5671461033957806370a082311461036857806395d89b4114610387578063997664d71461039a578063a9059cbb146103ad578063b53dfd4d146103cf578063dd62ed3e146103ee578063f0dda65c14610413578063fd2994f714610435575b6004546d04ee2d6d415b85acef8100000000340281151561012357fe5b60098054929091049091019055600780543490810190915533600160a060020a0316907f4f60ae2e9a8dbad8476b2113febc44f2345e01b01b4c644fac9bb84a22abaf9a9060405190815260200160405180910390a2005b341561018657600080fd5b61019a600160a060020a0360043516610448565b60405190815260200160405180910390f35b34156101b757600080fd5b6101bf61045a565b60405160208082528190810183818151815260200191508051906020019080838360005b838110156101fb5780820151838201526020016101e3565b50505050905090810190601f1680156102285780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561024157600080fd5b610258600160a060020a03600435166024356104f8565b604051901515815260200160405180910390f35b341561027757600080fd5b61028e600160a060020a0360043516602435610564565b005b341561029b57600080fd5b61019a610618565b34156102ae57600080fd5b61019a61061e565b34156102c157600080fd5b610258600160a060020a0360043581169060243516604435610624565b34156102e957600080fd5b6102f16106d4565b60405160ff909116815260200160405180910390f35b341561031257600080fd5b61019a600160a060020a03600435166106dd565b341561033157600080fd5b61028e610720565b341561034457600080fd5b61034c6107c5565b604051600160a060020a03909116815260200160405180910390f35b341561037357600080fd5b61019a600160a060020a03600435166107d4565b341561039257600080fd5b6101bf6107ef565b34156103a557600080fd5b61019a61085a565b34156103b857600080fd5b61028e600160a060020a0360043516602435610860565b34156103da57600080fd5b61019a600160a060020a036004351661086f565b34156103f957600080fd5b61019a600160a060020a0360043581169060243516610881565b341561041e57600080fd5b61028e600160a060020a03600435166024356108ac565b341561044057600080fd5b61019a610939565b600a6020526000908152604090205481565b60018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156104f05780601f106104c5576101008083540402835291602001916104f0565b820191906000526020600020905b8154815290600101906020018083116104d357829003601f168201915b505050505081565b600160a060020a03338116600081815260066020908152604080832094871680845294909152808220859055909291907f35b43951b46e772259ca8b566c89beccb8d46513d2e0388b81504e7d27784f299085905190815260200160405180910390a350600192915050565b60005433600160a060020a0390811691161461057f57600080fd5b600160a060020a038216600090815260056020526040902054819010156105a557600080fd5b6105ae8261093f565b600160a060020a038216600081815260056020526040908190208054849003905560048054849003908190557f116de1b338a6328c917113d4e6687e578bcfca3a781eaa69285e8dee2799a5ff918491905191825260208201526040908101905180910390a25050565b60045481565b60085481565b600160a060020a038084166000908152600660209081526040808320339094168352929052908120548290101561065a57600080fd5b600160a060020a038085166000818152600660209081526040808320339095168084529490915290819020805486900390557f2103cdfb2f74999b6ffea5fdf05d864485c49a84f1bed894d5592f6a842663219085905190815260200160405180910390a36106ca84848461097a565b5060019392505050565b60035460ff1681565b600160a060020a0381166000908152600a60205260408120546d04ee2d6d415b85acef81000000009061070f84610a42565b0181151561071957fe5b0492915050565b600061072b3361093f565b5033600160a060020a03166000818152600a602052604080822080549290556d04ee2d6d415b85acef810000000090910491907fa1ba76c3f88ba893fb9932ba345d20aa986021c89b2b4d1d937715642b54a54a9083905190815260200160405180910390a2600160a060020a03331681156108fc0282604051600060405180830381858888f1935050505015156107c257600080fd5b50565b600054600160a060020a031681565b600160a060020a031660009081526005602052604090205490565b60028054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156104f05780601f106104c5576101008083540402835291602001916104f0565b60075481565b61086b33838361097a565b5050565b600b6020526000908152604090205481565b600160a060020a03918216600090815260066020908152604080832093909416825291909152205490565b60005433600160a060020a039081169116146108c757600080fd5b6108d08261093f565b6004805482018155600160a060020a03831660008181526005602052604090819020805485019055915490917f2e8ac5177a616f2aec08c3048f5021e4e9743ece034e8d83ba5caf76688bb4759184915191825260208201526040908101905180910390a25050565b60095481565b61094881610a42565b600160a060020a039091166000908152600a602090815260408083208054909401909355600954600b90915291902055565b600160a060020a038216600090815260056020526040902054818101116109a057600080fd5b600160a060020a038316600090815260056020526040902054819010156109c657600080fd5b6109cf8261093f565b6109d88361093f565b600160a060020a038084166000818152600560205260408082208054869003905592851680825290839020805485019055917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9084905190815260200160405180910390a3505050565b600160a060020a03166000908152600b6020908152604080832054600954600590935292205491900302905600a165627a7a72305820921bd391243086604d6cb2d0fcb3a29dbea0699cdef69bc9f7066fabab89d2d80029"
  },
  "DividendTokenLocker": {
    "abi": [
      {
        "constant": false,
        "inputs": [],
        "name": "collectDividends",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_token",
            "type": "address"
          },
          {
            "name": "_owner",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
      }
    ],
    "unlinked_binary": "0x6060604052341561000f57600080fd5b604051604080610252833981016040528080519190602001805160018054600160a060020a03958616600160a060020a03199182161790915560008054929095169116178355506101eb9182915061006790396000f3006060604052600436106100565763ffffffff7c0100000000000000000000000000000000000000000000000000000000600035041663458bdf2081146100585780638da5cb5b1461006b578063fc0c546a146100a7575b005b341561006357600080fd5b6100566100ba565b341561007657600080fd5b61007e610187565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200160405180910390f35b34156100b257600080fd5b61007e6101a3565b60015473ffffffffffffffffffffffffffffffffffffffff1663458bdf206000604051602001526040518163ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401602060405180830381600087803b151561012857600080fd5b6102c65a03f1151561013957600080fd5b5050506040518051505060005473ffffffffffffffffffffffffffffffffffffffff9081169030163160405160006040518083038185876187965a03f192505050151561018557600080fd5b565b60005473ffffffffffffffffffffffffffffffffffffffff1681565b60015473ffffffffffffffffffffffffffffffffffffffff16815600a165627a7a723058201892ada936f2bf069e60e47837ba644c3326295dcf5cbd08b11619c2058d827e0029"
  },
  "MainController": {
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "paMinFeeCollect",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_paStartReward",
            "type": "uint256"
          },
          {
            "name": "_paEndReward",
            "type": "uint256"
          },
          {
            "name": "_paFeeCollectRewardDenom",
            "type": "uint256"
          }
        ],
        "name": "setPennyAuctionRewards",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "paStartReward",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getRefreshPennyAuctionsReward",
        "outputs": [
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "refreshPennyAuctions",
        "outputs": [
          {
            "name": "_numAuctionsEnded",
            "type": "uint256"
          },
          {
            "name": "_feesCollected",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "paEndReward",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "version",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getStartPennyAuctionReward",
        "outputs": [
          {
            "name": "_amount",
            "type": "uint256"
          },
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "startPennyAuction",
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
        "payable": false,
        "stateMutability": "nonpayable",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "paFeeCollectRewardDenom",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
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
        "name": "RewardGasPriceLimitChanged",
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
        "name": "PennyAuctionRewardsChanged",
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
            "name": "index",
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
            "name": "time",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "recipient",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "note",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "RewardPaid",
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
            "name": "recipient",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "note",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "RewardNotPaid",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052662386f26fc10000600455341561001a57600080fd5b60405160208061138b833981016040528080519150819050808080600160a060020a038116151561004a57600080fd5b60008054600160a060020a03909216600160a060020a03199092169190911790555050505061130d8061007e6000396000f3006060604052600436106100c15763ffffffff60e060020a600035041663028078c281146100c357806305d296df146100f2578063250b591b14610117578063331415c5146101335780633b19e84a1461014657806340ed85ea1461015957806344cfd9b61461016c57806345db68de1461019757806354fd4d50146101aa5780635ab1bd53146101bd5780636808cfa6146101d05780636e9960c3146101e357806370aa2fdf146101f6578063893d20e81461022f578063ded243c714610242575b005b34156100ce57600080fd5b6100d6610255565b604051600160a060020a03909116815260200160405180910390f35b34156100fd57600080fd5b610105610285565b60405190815260200160405180910390f35b341561012257600080fd5b6100c160043560243560443561028b565b341561013e57600080fd5b610105610307565b341561015157600080fd5b6100d661030d565b341561016457600080fd5b610105610338565b341561017757600080fd5b61017f6104ac565b60405191825260208201526040908101905180910390f35b34156101a257600080fd5b61010561090e565b34156101b557600080fd5b610105610914565b34156101c857600080fd5b6100d6610919565b34156101db57600080fd5b61017f610928565b34156101ee57600080fd5b6100d6610b26565b341561020157600080fd5b61020c600435610b51565b6040519115158252600160a060020a031660208201526040908101905180910390f35b341561023a57600080fd5b6100d66111bd565b341561024d57600080fd5b61010561124a565b60006102807f50454e4e595f41554354494f4e5f434f4e54524f4c4c45520000000000000000611250565b905090565b60045481565b610293610b26565b600160a060020a031633600160a060020a03161415156102b257600080fd5b60648110156102c057600080fd5b6001839055600282905560038190557f01e4d310c34f32fdc851cb18386e9c294b2f2786c51338b74179709b462a685d4260405190815260200160405180910390a1505050565b60015481565b60006102807f5452454153555259000000000000000000000000000000000000000000000000611250565b6000806000806000610348610255565b935083600160a060020a03166340806f7c6000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b151561039057600080fd5b6102c65a03f115156103a157600080fd5b5050506040518051935050600160a060020a03841663a334a48d6000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b15156103f257600080fd5b6102c65a03f1151561040357600080fd5b5050506040518051905091506003548381151561041c57fe5b04600254830201905061042d61030d565b600160a060020a03166366dddbbe8260006040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b151561047b57600080fd5b6102c65a03f1151561048c57600080fd5b505050604051805190506104a15760006104a3565b805b94505050505090565b6000806000806104ba610255565b600160a060020a031663ac87112c6000604051604001526040518163ffffffff1660e060020a0281526004016040805180830381600087803b15156104fe57600080fd5b6102c65a03f1151561050f57600080fd5b5050506040518051906020018051600354929650945084905081151561053157fe5b046002548502019150816000141561059f576000805160206112c2833981519152426040519081526040602082018190526015818301527f4e6f2072657761726420746f20626520706169642e000000000000000000000060608301526080909101905180910390a1610908565b6105a761030d565b905080600160a060020a0316636d98fcdf8360006040516020015260405160e060020a63ffffffff84160281526004810191909152604060248201819052601760448301527f2e7265667265736850656e6e7941756374696f6e73282900000000000000000060648301526084909101906020905180830381600087803b151561063057600080fd5b6102c65a03f1151561064157600080fd5b505050604051805190501515610700577f6dccef5cdae003409f694fa3f47d460a9f61d3b8dc7c0affea12fd5643222c39423384604051928352600160a060020a0390911660208301526060820152608060408083018290526034918301919091527f2e7265667265736850656e6e7941756374696f6e7328292077617320756e616260a08301527f6c6520746f20726563656976652066756e64732e00000000000000000000000060c083015260e0909101905180910390a1610908565b33600160a060020a03168260405160006040518083038185876187965a03f192505050156107b1577f5b205246240395bc559cc5d6fbe5d1123ea60a6e346bd25f5a5cb0dd1992eccf423384604051928352600160a060020a039091166020830152606082015260806040808301829052601e918301919091527f43616c6c6564202e7265667265736850656e6e7941756374696f6e732829000060a083015260c0909101905180910390a1610908565b80600160a060020a03166304e444198360405160e060020a63ffffffff841602815260206004820152603060248201527f436f756c64206e6f74207061792072657761726420666f72202e72656672657360448201527f6850656e6e7941756374696f6e7328290000000000000000000000000000000060648201526084016000604051808303818588803b151561084857600080fd5b6125ee5a03f1151561085957600080fd5b505050507f6dccef5cdae003409f694fa3f47d460a9f61d3b8dc7c0affea12fd5643222c39423384604051928352600160a060020a039091166020830152606082015260806040808301829052602c918301919091527f2e7265667265736850656e6e7941756374696f6e73282920636f756c646e742060a08301527f73656e64207265776172642e000000000000000000000000000000000000000060c083015260e0909101905180910390a15b50509091565b60025481565b600181565b600054600160a060020a031690565b600080600080610936610255565b915081600160a060020a03166396fd75d86000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b151561097e57600080fd5b6102c65a03f1151561098f57600080fd5b5050506040518051600094509150505b80831015610b1a5781600160a060020a031663a04bd02f8460006040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b15156109f657600080fd5b6102c65a03f11515610a0757600080fd5b505050604051805190501515610a1c57610b0f565b610a2461030d565b600160a060020a03166366dddbbe60015484600160a060020a0316637a3dbc168760006040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b1515610a8457600080fd5b6102c65a03f11515610a9557600080fd5b505050604051805190500160006040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b1515610adf57600080fd5b6102c65a03f11515610af057600080fd5b505050604051805190501515610b0557610b0f565b6001549350610908565b60019092019161099f565b50600093849350915050565b60006102807f41444d494e000000000000000000000000000000000000000000000000000000611250565b600080600080600080610b62610255565b935083600160a060020a031663a04bd02f8860006040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b1515610bb357600080fd5b6102c65a03f11515610bc457600080fd5b505050604051805190501515610c56576000805160206112c283398151915242604051908152604060208201819052602a818301527f446566696e656441756374696f6e206973206e6f742063757272656e746c792060608301527f737461727461626c652e00000000000000000000000000000000000000000000608083015260a0909101905180910390a16111b4565b610c5e61030d565b9250600154915083600160a060020a0316637a3dbc168860006040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b1515610cb457600080fd5b6102c65a03f11515610cc557600080fd5b5050506040518051915050600160a060020a038316636d98fcdf83830160006040516020015260405160e060020a63ffffffff84160281526004810191909152604060248201819052601460448301527f2e737461727450656e6e7941756374696f6e282900000000000000000000000060648301526084909101906020905180830381600087803b1515610d5957600080fd5b6102c65a03f11515610d6a57600080fd5b505050604051805190501515610dd6576000805160206112c2833981519152426040519081526040602082018190526018818301527f556e61626c6520746f20726563656976652066756e64732e000000000000000060608301526080909101905180910390a16111b4565b83600160a060020a0316636452c856828960006040516040015260405160e060020a63ffffffff8516028152600481019190915260240160408051808303818588803b1515610e2457600080fd5b6125ee5a03f11515610e3557600080fd5b50505050604051805190602001805191975090955050851515610f825782600160a060020a03166304e4441983830160405160e060020a63ffffffff841602815260206004820152603460248201527f50656e6e7941756374696f6e436f6e74726f6c6c65722e73746172744465666960448201527f6e656441756374696f6e2829206661696c65642e00000000000000000000000060648201526084016000604051808303818588803b1515610eeb57600080fd5b6125ee5a03f11515610efc57600080fd5b505050506000805160206112c2833981519152426040519081526040602082018190526034818301527f50656e6e7941756374696f6e436f6e74726f6c6c65722e73746172744465666960608301527f6e656441756374696f6e2829206661696c65642e000000000000000000000000608083015260a0909101905180910390a16111b4565b7f322544c0d30469fc1e441837c87a23622f029c3cc04b3cf6175c64002aa9a3af4288876040519283526020830191909152600160a060020a03166040808301919091526060909101905180910390a133600160a060020a03168260405160006040518083038185876187965a03f19250505015611083577f5b205246240395bc559cc5d6fbe5d1123ea60a6e346bd25f5a5cb0dd1992eccf423384604051928352600160a060020a039091166020830152606082015260806040808301829052601b918301919091527f43616c6c6564202e737461727450656e6e7941756374696f6e2829000000000060a083015260c0909101905180910390a16111b4565b82600160a060020a03166304e444198360405160e060020a63ffffffff841602815260206004820152602d60248201527f436f756c64206e6f74207061792072657761726420666f72202e73746172745060448201527f656e6e7941756374696f6e28290000000000000000000000000000000000000060648201526084016000604051808303818588803b151561111a57600080fd5b6125ee5a03f1151561112b57600080fd5b505050507f6dccef5cdae003409f694fa3f47d460a9f61d3b8dc7c0affea12fd5643222c39423384604051928352600160a060020a0390911660208301526060820152608060408083018290526016918301919091527f5374617274656420612050656e6e7941756374696f6e0000000000000000000060a083015260c0909101905180910390a15b50505050915091565b60008054600160a060020a031663bb34534c826040516020015260405160e060020a63ffffffff83160281527f4f574e45520000000000000000000000000000000000000000000000000000006004820152602401602060405180830381600087803b151561122b57600080fd5b6102c65a03f1151561123c57600080fd5b505050604051805191505090565b60035481565b60008054600160a060020a031663bb34534c83836040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b15156112a157600080fd5b6102c65a03f115156112b257600080fd5b505050604051805193925050505600c548eaddad03c946ad5228a88cfbd752439e312a7b29b7e8791a0b5fe143584ca165627a7a72305820ecf6e6d75ed66e1d43eadba3f6313af6685c9b85d778db7d2db9160297a072520029"
  },
  "PennyAuction": {
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isPaid",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "lastBidBlock",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getBlocksRemaining",
        "outputs": [
          {
            "name": "_timeRemaining",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "blockEnded",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "isEnded",
        "outputs": [
          {
            "name": "_bool",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_gasLimit",
            "type": "uint256"
          }
        ],
        "name": "payWinner",
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
        "stateMutability": "nonpayable",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "collectFees",
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
        "stateMutability": "nonpayable",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "bidAddBlocks",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
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
            "name": "_bidFeePct",
            "type": "uint256"
          },
          {
            "name": "_bidAddBlocks",
            "type": "uint256"
          },
          {
            "name": "_initialBlocks",
            "type": "uint256"
          }
        ],
        "payable": true,
        "stateMutability": "payable",
        "type": "constructor"
      },
      {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
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
            "name": "initialBlocks",
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
            "name": "msg",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "bidder",
            "type": "address"
          }
        ],
        "name": "BidRefundSuccess",
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
            "name": "msg",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "bidder",
            "type": "address"
          }
        ],
        "name": "BidRefundFailure",
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
          },
          {
            "indexed": false,
            "name": "gasLimit",
            "type": "uint256"
          }
        ],
        "name": "PaymentSuccess",
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
          },
          {
            "indexed": false,
            "name": "gasLimit",
            "type": "uint256"
          }
        ],
        "name": "PaymentFailure",
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
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "FeeCollectionSuccess",
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
        "name": "FeeCollectionFailure",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405260405160c080610cd38339810160405280805191906020018051919060200180519190602001805191906020018051919060200180519150506000851161004a57600080fd5b6000841161005757600080fd5b600182101561006557600080fd5b606483111561007357600080fd5b600181101561008157600080fd5b34851461008d57600080fd5b60008054600160a060020a03808916600160a060020a031992831617928390556001889055600287905560038690556004859055600588905560068054909216921691909117905543600781905581016008557f87ac41d581680567c1ef44614ddfa5522f853ea15b877693a35b1e4157cc309d428260405191825260208201526040908101905180910390a1505050505050610ba48061012f6000396000f3006060604052600436106100e55763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166319afe47381146104c7578063209ebc08146104ec578063267410031461051357806371974cbe146105265780637941a06214610539578063856631191461054c578063913e77ad1461055f578063962aab811461058e5780639af1d35a146105a1578063a4fd6f56146105b4578063a5c0449f146105c7578063aabe2fe3146105f7578063c87965721461060a578063ce9ec0a61461061d578063d42efe9014610630578063e3ac5d2614610643575b600b546000908190610100900460ff16156100ff57600080fd5b600b805461ff001916610100179055610116610656565b1561018557610180606060405190810160405280602981526020017f436f756c64206e6f74206269643a2041756374696f6e2068617320616c72656181526020017f647920656e6465642e0000000000000000000000000000000000000000000000815250610660565b6104b8565b60065433600160a060020a039081169116141561020157610180606060405190810160405280603281526020017f436f756c64206e6f74206269643a20596f752061726520616c7265616479207481526020017f68652063757272656e742077696e6e65722e0000000000000000000000000000815250610660565b600254341461026f57610180606060405190810160405280602e81526020017f436f756c64206e6f74206269643a2056616c75652073656e74206d757374206d81526020017f617463682062696450726963652e000000000000000000000000000000000000815250610660565b6003546002546064910204915081600254039050600754431415156102bc57600980546001019055600a805483019055600580548201905560045460088054909101905543600755610446565b600654600254600160a060020a039091169080156108fc0290604051600060405180830381858888f19350505050156103a3576006547f6197bde8e59c95c7ae867597d14fb83f8b8266b40d3c66ea1a4f2f37576dd0b7904290600160a060020a0316604051918252600160a060020a03166040808301919091526060602083018190526027908301527f416e6f7468657220626964206f63637572726564206f6e207468652073616d6560808301527f20626c6f636b2e0000000000000000000000000000000000000000000000000060a083015260c0909101905180910390a1610446565b6006547ffe6ace4787ab1c9879cedca1a3e4b122aee9dbbc1581e900cc7cb428996760d1904290600160a060020a0316604051918252600160a060020a0316604080830191909152606060208301819052600f908301527f2e73656e642829206661696c65642e0000000000000000000000000000000000608083015260a0909101905180910390a1600980546001019055600a80548301905560058054820190555b6006805473ffffffffffffffffffffffffffffffffffffffff191633600160a060020a038116919091179091557f9a190cbd63f01b429ad1ffc2d976a9975a83c13d6d79c9b270cf39a80b2a4800904290604051918252600160a060020a031660208201526040908101905180910390a15b5050600b805461ff0019169055005b34156104d257600080fd5b6104da610742565b60405190815260200160405180910390f35b34156104f757600080fd5b6104ff610748565b604051901515815260200160405180910390f35b341561051e57600080fd5b6104da610751565b341561053157600080fd5b6104da610757565b341561054457600080fd5b6104da61075d565b341561055757600080fd5b6104da61077e565b341561056a57600080fd5b610572610784565b604051600160a060020a03909116815260200160405180910390f35b341561059957600080fd5b6104da610793565b34156105ac57600080fd5b6104da610799565b34156105bf57600080fd5b6104ff610656565b34156105d257600080fd5b6105dd60043561079f565b604051911515825260208201526040908101905180910390f35b341561060257600080fd5b610572610a54565b341561061557600080fd5b6105dd610a63565b341561062857600080fd5b6104da610b66565b341561063b57600080fd5b6104da610b6c565b341561064e57600080fd5b6104da610b72565b6008544310155b90565b33600160a060020a03163460405160006040518083038185876187965a03f192505050151561068e57600080fd5b7f6197bde8e59c95c7ae867597d14fb83f8b8266b40d3c66ea1a4f2f37576dd0b7428233604051838152600160a060020a038216604082015260606020820181815290820184818151815260200191508051906020019080838360005b838110156107035780820151838201526020016106eb565b50505050905090810190601f1680156107305780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a150565b60025481565b600b5460ff1681565b60035481565b60075481565b6000610767610656565b156107745750600061065d565b4360085403905090565b60015481565b600054600160a060020a031681565b60085481565b600a5481565b600b5460009081908190610100900460ff16156107bb57600080fd5b600b805461ff0019166101001790556107d2610656565b151561084d577fc548eaddad03c946ad5228a88cfbd752439e312a7b29b7e8791a0b5fe143584c42604051908152604060208201819052601a818301527f5468652061756374696f6e20686173206e6f7420656e6465642e00000000000060608301526080909101905180910390a160009250829150610a41565b600b5460ff16156108cc577fc548eaddad03c946ad5228a88cfbd752439e312a7b29b7e8791a0b5fe143584c4260405190815260406020808301829052818301527f546865207072697a652068617320616c7265616479206265656e20706169642e60608301526080909101905180910390a160009250829150610a41565b50600083151561090757600654600554600160a060020a039091169060405160006040518083038185876187965a03f1925050509050610932565b600654600554600160a060020a03909116908590604051600060405180830381858888f19450505050505b80156109c657600b805460ff191660011790556006546005547ff77c471cb61e1a13e445ce01038ea7c8cb4198a93129667564aec9e5acc776849142913391600160a060020a03169088604051948552600160a060020a039384166020860152919092166040808501919091526060840192909252608083015260a0909101905180910390a1600160055492509250610a41565b6006546005547fcb7c530a134da612c5b802376da0b2fd1dc4b7ee04ae0bc093d01ac91fff207d9142913391600160a060020a03169088604051948552600160a060020a039384166020860152919092166040808501919091526060840192909252608083015260a0909101905180910390a1600092508291505b50600b805461ff00191690559092909150565b600654600160a060020a031681565b600b546000908190610100900460ff1615610a7d57600080fd5b600b805461ff001916610100179055600a541515610aa15750600190506000610b57565b600054600a54600160a060020a039091169060405160006040518083038185876187965a03f19250505015610b1d5750600a805460009091557f8f05c2c7ca4b48bbeb87eda627ed3cd5c3907d67b07e1da503e02672944c26c0428260405191825260208201526040908101905180910390a160019150610b57565b7f8a52651e05ab81d1d9625fe5c8811e4f6c4cf4c279976f50d000e4162b9593b84260405190815260200160405180910390a15060009050805b600b805461ff00191690559091565b60095481565b60045481565b600554815600a165627a7a7230582085d1edba1f40a60f9ccf9e5e7f38fd482a13e45f107d7b5c4a9ff67410f6126b0029"
  },
  "PennyAuctionController": {
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
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "disableDefinedAuction",
        "outputs": [
          {
            "name": "_success",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "enableDefinedAuction",
        "outputs": [
          {
            "name": "_success",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "getIsEnabled",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "name": "endedAuctions",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "version",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "startDefinedAuction",
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
        "stateMutability": "payable",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          },
          {
            "name": "_summary",
            "type": "string"
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
            "name": "_bidFeePct",
            "type": "uint256"
          },
          {
            "name": "_bidAddBlocks",
            "type": "uint256"
          },
          {
            "name": "_initialBlocks",
            "type": "uint256"
          }
        ],
        "name": "editDefinedAuction",
        "outputs": [
          {
            "name": "_success",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "numEndedAuctions",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "getAuction",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "getInitialPrize",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "numDefinedAuctions",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_index",
            "type": "uint256"
          }
        ],
        "name": "getIsStartable",
        "outputs": [
          {
            "name": "_isStartable",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getNumEndedAuctions",
        "outputs": [
          {
            "name": "_numEndedAuctions",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "refreshAuctions",
        "outputs": [
          {
            "name": "_numAuctionsEnded",
            "type": "uint256"
          },
          {
            "name": "_feesRedeemed",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
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
        "stateMutability": "view",
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
        "name": "definedAuctions",
        "outputs": [
          {
            "name": "auction",
            "type": "address"
          },
          {
            "name": "isEnabled",
            "type": "bool"
          },
          {
            "name": "summary",
            "type": "string"
          },
          {
            "name": "initialPrize",
            "type": "uint256"
          },
          {
            "name": "bidPrice",
            "type": "uint256"
          },
          {
            "name": "bidFeePct",
            "type": "uint256"
          },
          {
            "name": "bidAddBlocks",
            "type": "uint256"
          },
          {
            "name": "initialBlocks",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "nonpayable",
        "type": "constructor"
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
            "name": "index",
            "type": "uint256"
          }
        ],
        "name": "DefinedAuctionEdited",
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
            "name": "index",
            "type": "uint256"
          }
        ],
        "name": "DefinedAuctionInvalid",
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
            "name": "index",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "addr",
            "type": "address"
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
            "name": "time",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "index",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "addr",
            "type": "address"
          }
        ],
        "name": "AuctionEnded",
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
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "FeeCollectionSuccess",
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
        "name": "FeeCollectionFailure",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052341561000f57600080fd5b6040516020806115df8339810160405280805191508190508080600160a060020a038116151561003e57600080fd5b60008054600160a060020a03909216600160a060020a031990921691909117905550505061156e806100716000396000f3006060604052600436106101195763ffffffff60e060020a60003504166313114a9d811461011e57806325e6c3041461014357806326b8b0f2146101565780632afa05a614610180578063331670c51461019657806337df273b146101ac57806340806f7c146101de57806354fd4d50146101f15780635ab1bd53146102045780636452c856146102175780636e9960c314610245578063737aed3614610258578063786da2af146102c657806378bd7935146102d95780637a3dbc16146102ef578063893d20e8146103055780638b0341361461031857806396fd75d81461032b578063a04bd02f1461033e578063a334a48d14610354578063ac87112c14610367578063c717315614610392578063f36bec21146103a5575b600080fd5b341561012957600080fd5b610131610484565b60405190815260200160405180910390f35b341561014e57600080fd5b61013161048a565b341561016157600080fd5b61016c600435610490565b604051901515815260200160405180910390f35b341561018b57600080fd5b61016c60043561057c565b34156101a157600080fd5b61016c60043561066d565b34156101b757600080fd5b6101c2600435610689565b604051600160a060020a03909116815260200160405180910390f35b34156101e957600080fd5b6101316106b1565b34156101fc57600080fd5b610131610761565b341561020f57600080fd5b6101c2610766565b610222600435610776565b6040519115158252600160a060020a031660208201526040908101905180910390f35b341561025057600080fd5b6101c2610b32565b341561026357600080fd5b61016c600480359060446024803590810190830135806020601f8201819004810201604051908101604052818152929190602084018383808284375094965050843594602081013594506040810135935060608101359250608001359050610b62565b34156102d157600080fd5b610131610c92565b34156102e457600080fd5b6101c2600435610c98565b34156102fa57600080fd5b610131600435610cb3565b341561031057600080fd5b6101c2610cc8565b341561032357600080fd5b610131610d55565b341561033657600080fd5b610131610d5b565b341561034957600080fd5b61016c600435610d61565b341561035f57600080fd5b610131610db4565b341561037257600080fd5b61037a610e65565b60405191825260208201526040908101905180910390f35b341561039d57600080fd5b6101c261129b565b34156103b057600080fd5b6103bb6004356112c6565b604051600160a060020a03891681528715156020820152606081018690526080810185905260a0810184905260c0810183905260e081018290526101006040820181815288546002600019600183161585020190911604918301829052906101208301908990801561046e5780601f106104435761010080835404028352916020019161046e565b820191906000526020600020905b81548152906001019060200180831161045157829003601f168201915b5050995050505050505050505060405180910390f35b60015481565b60025481565b600061049a610b32565b600160a060020a031633600160a060020a03161415156104b957600080fd5b600654821061050c576000805160206115038339815191524260405190815260406020820181905260148183015260008051602061152383398151915260608301526080909101905180910390a1610577565b60008281526007602052604090819020805474ff0000000000000000000000000000000000000000191690557f2b58011d269b9446bbd9036cf544955b87162bae5ef139c005a26fe3f17f17b590429084905191825260208201526040908101905180910390a15060015b919050565b6000610586610b32565b600160a060020a031633600160a060020a03161415156105a557600080fd5b60065482106105f8576000805160206115038339815191524260405190815260406020820181905260148183015260008051602061152383398151915260608301526080909101905180910390a1610577565b60008281526007602052604090819020805474ff0000000000000000000000000000000000000000191660a060020a1790557f2b58011d269b9446bbd9036cf544955b87162bae5ef139c005a26fe3f17f17b590429084905191825260208201526040908101905180910390a1506001919050565b60009081526007602052604090205460a060020a900460ff1690565b600580548290811061069757fe5b600091825260209091200154600160a060020a0316905081565b6000805b60065481101561075d57600081815260076020526040902054600160a060020a031615156106e257610755565b60008181526007602052604080822054600160a060020a031691639af1d35a9151602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b151561073557600080fd5b6102c65a03f1151561074657600080fd5b50505060405180519050820191505b6001016106b5565b5090565b600181565b600054600160a060020a03165b90565b6000818152600760205260408120600654829190829085106107c1576107bc60408051908101604052601481526000805160206115238339815191526020820152611311565b610b2b565b815460a060020a900460ff16151561080f576107bc60408051908101604052601e81527f446566696e656441756374696f6e206973206e6f7420656e61626c65642e00006020820152611311565b8154600160a060020a03161561085b576107bc60408051908101604052601b81527f41756374696f6e20697320616c726561647920737461727465642e00000000006020820152611311565b600282015434146108cb576107bc606060405190810160405280602781526020017f56616c75652073656e7420646f6573206e6f74206d6174636820696e6974696181526020017f6c5072697a652e00000000000000000000000000000000000000000000000000815250611311565b6108d361129b565b905080600160a060020a0316346040517f63726561746541756374696f6e2875696e743235362c75696e743235362c756981527f6e743235362c75696e743235362c75696e7432353629000000000000000000006020820152603601604051809103902060e060020a9004908460020154856003015486600401548760050154886006015460405160e060020a63ffffffff89160281526004810195909552602485019390935260448401919091526064830152608482015260a40160006040518083038185886187965a03f193505050509350831515610a4d577fd6f25ffaf7d6f17dc611977e0b8219adcc9a1fb8430bfa7769c7f4560a42f13f428660405191825260208201526040908101905180910390a16107bc606060405190810160405280603e81526020017f50656e6e7941756374696f6e466163746f727920636f756c64206e6f7420637281526020017f656174652061756374696f6e2028696e76616c696420706172616d733f290000815250611311565b80600160a060020a03166330258cf86000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b1515610a9357600080fd5b6102c65a03f11515610aa457600080fd5b5050506040518051835473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a03821617845593507ff5a69f2016f2b9cef331aeb0e635848fbef6397842c2fd4021c6a56c993f4c6190504286856040519283526020830191909152600160a060020a03166040808301919091526060909101905180910390a1600193505b5050915091565b6000610b5d7f41444d494e0000000000000000000000000000000000000000000000000000006113d4565b905090565b6000610b6c610b32565b600160a060020a031633600160a060020a0316141515610b8b57600080fd5b600654881115610bdf576000805160206115038339815191524260405190815260406020820181905260148183015260008051602061152383398151915260608301526080909101905180910390a1610c87565b600654881415610bf3576006805460010190555b6000888152600760205260409020600101878051610c15929160200190611445565b5060008881526007602052604090819020600281018890556003810187905560048101869055600581018590556006018390557f2b58011d269b9446bbd9036cf544955b87162bae5ef139c005a26fe3f17f17b59042908a905191825260208201526040908101905180910390a15060015b979650505050505050565b60045481565b600090815260076020526040902054600160a060020a031690565b60009081526007602052604090206002015490565b60008054600160a060020a031663bb34534c826040516020015260405160e060020a63ffffffff83160281527f4f574e45520000000000000000000000000000000000000000000000000000006004820152602401602060405180830381600087803b1515610d3657600080fd5b6102c65a03f11515610d4757600080fd5b505050604051805191505090565b60035481565b60065481565b60008181526007602052604081206006548310610d7d57610dae565b805460a060020a900460ff161515610d9457610dae565b8054600160a060020a031615610da957610dae565b600191505b50919050565b600080805b600654821015610e605750600081815260076020526040902054600160a060020a0316801515610de857610e55565b80600160a060020a031663a4fd6f566000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b1515610e2e57600080fd5b6102c65a03f11515610e3f57600080fd5b5050506040518051905015610e55576001909201915b600190910190610db9565b505090565b600080808080805b60065484101561124f57600084815260076020526040902054600160a060020a03169250821515610e9d57611244565b82600160a060020a031663c87965726000604051604001526040518163ffffffff1660e060020a0281526004016040805180830381600087803b1515610ee257600080fd5b6102c65a03f11515610ef357600080fd5b5050506040518051906020018051919350909150508115610f1f57600180548201905593840193610f63565b7f7e24f6ee060660c61b6f9c9dc2db16b3273ac85a0cea9590e779d774cd8755e94284604051918252600160a060020a031660208201526040908101905180910390a15b82600160a060020a031663a4fd6f566000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b1515610fa957600080fd5b6102c65a03f11515610fba57600080fd5b50505060405180519050156112445782600160a060020a031663209ebc086000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b151561100f57600080fd5b6102c65a03f1151561102057600080fd5b5050506040518051905015156110a35782600160a060020a031663a5c0449f6108fc60006040516040015260405160e060020a63ffffffff841602815260048101919091526024016040805180830381600087803b151561108057600080fd5b6102c65a03f1151561109157600080fd5b50505060405180519060200180515050505b82600160a060020a031663e3ac5d266000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b15156110e957600080fd5b6102c65a03f115156110fa57600080fd5b505050604051805160028054909101905550600160a060020a03831663ce9ec0a66000604051602001526040518163ffffffff1660e060020a028152600401602060405180830381600087803b151561115257600080fd5b6102c65a03f1151561116357600080fd5b5050506040518051600380549091019055506000848152600760205260409020805473ffffffffffffffffffffffffffffffffffffffff1916905560058054600181016111b083826114bf565b506000918252602090912001805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a03851617905560048054600190810190915595909501947fbafc4bda865d4d1f8d5b16f883e996fde0fe71112fac81503876d353756944004285856040519283526020830191909152600160a060020a03166040808301919091526060909101905180910390a15b600190930192610e6d565b6000851115611293577f8f05c2c7ca4b48bbeb87eda627ed3cd5c3907d67b07e1da503e02672944c26c0428660405191825260208201526040908101905180910390a15b505050509091565b6000610b5d7f50454e4e595f41554354494f4e5f464143544f525900000000000000000000006113d4565b6007602052600090815260409020805460028201546003830154600484015460058501546006860154600160a060020a0386169660a060020a90960460ff1695600101949392919088565b600080516020611503833981519152428260405182815260406020820181815290820183818151815260200191508051906020019080838360005b8381101561136457808201518382015260200161134c565b50505050905090810190601f1680156113915780820380516001836020036101000a031916815260200191505b50935050505060405180910390a1600160a060020a0333163480156108fc0290604051600060405180830381858888f1935050505015156113d157600080fd5b50565b60008054600160a060020a031663bb34534c83836040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b151561142557600080fd5b6102c65a03f1151561143657600080fd5b50505060405180519392505050565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f1061148657805160ff19168380011785556114b3565b828001600101855582156114b3579182015b828111156114b3578251825591602001919060010190611498565b5061075d9291506114e8565b8154818355818115116114e3576000838152602090206114e39181019083016114e8565b505050565b61077391905b8082111561075d57600081556001016114ee5600c548eaddad03c946ad5228a88cfbd752439e312a7b29b7e8791a0b5fe143584c496e646578206f7574206f6620626f756e64732e000000000000000000000000a165627a7a7230582091ead05b51865cf7f60031be3db3abe6aea54655515dab531e903920e0786b130029"
  },
  "PennyAuctionFactory": {
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "lastCreatedAuction",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "version",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
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
        "stateMutability": "view",
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
            "name": "_bidFeePct",
            "type": "uint256"
          },
          {
            "name": "_bidAddBlocks",
            "type": "uint256"
          },
          {
            "name": "_initialBlocks",
            "type": "uint256"
          }
        ],
        "name": "createAuction",
        "outputs": [
          {
            "name": "_auction",
            "type": "address"
          }
        ],
        "payable": true,
        "stateMutability": "payable",
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
        "stateMutability": "nonpayable",
        "type": "constructor"
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
          },
          {
            "indexed": false,
            "name": "collector",
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
            "name": "bidFeePct",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "bidAddBlocks",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "initialBlocks",
            "type": "uint256"
          }
        ],
        "name": "AuctionCreated",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052341561000f57600080fd5b6040516020806111758339810160405280805191508190508080600160a060020a038116151561003e57600080fd5b60008054600160a060020a03909216600160a060020a0319909216919091179055505050611104806100716000396000f3006060604052600436106100695763ffffffff60e060020a600035041663028078c2811461006e57806330258cf81461009d5780633b19e84a146100b057806354fd4d50146100c35780635ab1bd53146100e8578063893d20e8146100fb5780638a157df31461010e575b600080fd5b341561007957600080fd5b610081610125565b604051600160a060020a03909116815260200160405180910390f35b34156100a857600080fd5b610081610155565b34156100bb57600080fd5b610081610164565b34156100ce57600080fd5b6100d661018f565b60405190815260200160405180910390f35b34156100f357600080fd5b610081610194565b341561010657600080fd5b6100816101a3565b610081600435602435604435606435608435610230565b60006101507f50454e4e595f41554354494f4e5f434f4e54524f4c4c45520000000000000000610384565b905090565b600154600160a060020a031681565b60006101507f5452454153555259000000000000000000000000000000000000000000000000610384565b600181565b600054600160a060020a031690565b60008054600160a060020a031663bb34534c826040516020015260405160e060020a63ffffffff83160281527f4f574e45520000000000000000000000000000000000000000000000000000006004820152602401602060405180830381600087803b151561021157600080fd5b6102c65a03f1151561022257600080fd5b505050604051805191505090565b60008061023b610125565b600160a060020a031633600160a060020a031614151561025a57600080fd5b34871461026657600080fd5b61026e610164565b90508681888888888861027f6103f5565b8087600160a060020a0316600160a060020a0316815260200186815260200185815260200184815260200183815260200182815260200196505050505050506040518091039082f08015156102d357600080fd5b6001805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a03831617905592507fc415f0b2a44d885a1c207acb0b60c0179e4ac49da88f0e8917fb80302a9d782a90504283838a8a8a8a8a604051978852600160a060020a039687166020890152949095166040808801919091526060870193909352608086019190915260a085015260c084019290925260e0830152610100909101905180910390a15095945050505050565b60008054600160a060020a031663bb34534c83836040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b15156103d557600080fd5b6102c65a03f115156103e657600080fd5b50505060405180519392505050565b604051610cd380610406833901905600606060405260405160c080610cd38339810160405280805191906020018051919060200180519190602001805191906020018051919060200180519150506000851161004a57600080fd5b6000841161005757600080fd5b600182101561006557600080fd5b606483111561007357600080fd5b600181101561008157600080fd5b34851461008d57600080fd5b60008054600160a060020a03808916600160a060020a031992831617928390556001889055600287905560038690556004859055600588905560068054909216921691909117905543600781905581016008557f87ac41d581680567c1ef44614ddfa5522f853ea15b877693a35b1e4157cc309d428260405191825260208201526040908101905180910390a1505050505050610ba48061012f6000396000f3006060604052600436106100e55763ffffffff7c010000000000000000000000000000000000000000000000000000000060003504166319afe47381146104c7578063209ebc08146104ec578063267410031461051357806371974cbe146105265780637941a06214610539578063856631191461054c578063913e77ad1461055f578063962aab811461058e5780639af1d35a146105a1578063a4fd6f56146105b4578063a5c0449f146105c7578063aabe2fe3146105f7578063c87965721461060a578063ce9ec0a61461061d578063d42efe9014610630578063e3ac5d2614610643575b600b546000908190610100900460ff16156100ff57600080fd5b600b805461ff001916610100179055610116610656565b1561018557610180606060405190810160405280602981526020017f436f756c64206e6f74206269643a2041756374696f6e2068617320616c72656181526020017f647920656e6465642e0000000000000000000000000000000000000000000000815250610660565b6104b8565b60065433600160a060020a039081169116141561020157610180606060405190810160405280603281526020017f436f756c64206e6f74206269643a20596f752061726520616c7265616479207481526020017f68652063757272656e742077696e6e65722e0000000000000000000000000000815250610660565b600254341461026f57610180606060405190810160405280602e81526020017f436f756c64206e6f74206269643a2056616c75652073656e74206d757374206d81526020017f617463682062696450726963652e000000000000000000000000000000000000815250610660565b6003546002546064910204915081600254039050600754431415156102bc57600980546001019055600a805483019055600580548201905560045460088054909101905543600755610446565b600654600254600160a060020a039091169080156108fc0290604051600060405180830381858888f19350505050156103a3576006547f6197bde8e59c95c7ae867597d14fb83f8b8266b40d3c66ea1a4f2f37576dd0b7904290600160a060020a0316604051918252600160a060020a03166040808301919091526060602083018190526027908301527f416e6f7468657220626964206f63637572726564206f6e207468652073616d6560808301527f20626c6f636b2e0000000000000000000000000000000000000000000000000060a083015260c0909101905180910390a1610446565b6006547ffe6ace4787ab1c9879cedca1a3e4b122aee9dbbc1581e900cc7cb428996760d1904290600160a060020a0316604051918252600160a060020a0316604080830191909152606060208301819052600f908301527f2e73656e642829206661696c65642e0000000000000000000000000000000000608083015260a0909101905180910390a1600980546001019055600a80548301905560058054820190555b6006805473ffffffffffffffffffffffffffffffffffffffff191633600160a060020a038116919091179091557f9a190cbd63f01b429ad1ffc2d976a9975a83c13d6d79c9b270cf39a80b2a4800904290604051918252600160a060020a031660208201526040908101905180910390a15b5050600b805461ff0019169055005b34156104d257600080fd5b6104da610742565b60405190815260200160405180910390f35b34156104f757600080fd5b6104ff610748565b604051901515815260200160405180910390f35b341561051e57600080fd5b6104da610751565b341561053157600080fd5b6104da610757565b341561054457600080fd5b6104da61075d565b341561055757600080fd5b6104da61077e565b341561056a57600080fd5b610572610784565b604051600160a060020a03909116815260200160405180910390f35b341561059957600080fd5b6104da610793565b34156105ac57600080fd5b6104da610799565b34156105bf57600080fd5b6104ff610656565b34156105d257600080fd5b6105dd60043561079f565b604051911515825260208201526040908101905180910390f35b341561060257600080fd5b610572610a54565b341561061557600080fd5b6105dd610a63565b341561062857600080fd5b6104da610b66565b341561063b57600080fd5b6104da610b6c565b341561064e57600080fd5b6104da610b72565b6008544310155b90565b33600160a060020a03163460405160006040518083038185876187965a03f192505050151561068e57600080fd5b7f6197bde8e59c95c7ae867597d14fb83f8b8266b40d3c66ea1a4f2f37576dd0b7428233604051838152600160a060020a038216604082015260606020820181815290820184818151815260200191508051906020019080838360005b838110156107035780820151838201526020016106eb565b50505050905090810190601f1680156107305780820380516001836020036101000a031916815260200191505b5094505050505060405180910390a150565b60025481565b600b5460ff1681565b60035481565b60075481565b6000610767610656565b156107745750600061065d565b4360085403905090565b60015481565b600054600160a060020a031681565b60085481565b600a5481565b600b5460009081908190610100900460ff16156107bb57600080fd5b600b805461ff0019166101001790556107d2610656565b151561084d577fc548eaddad03c946ad5228a88cfbd752439e312a7b29b7e8791a0b5fe143584c42604051908152604060208201819052601a818301527f5468652061756374696f6e20686173206e6f7420656e6465642e00000000000060608301526080909101905180910390a160009250829150610a41565b600b5460ff16156108cc577fc548eaddad03c946ad5228a88cfbd752439e312a7b29b7e8791a0b5fe143584c4260405190815260406020808301829052818301527f546865207072697a652068617320616c7265616479206265656e20706169642e60608301526080909101905180910390a160009250829150610a41565b50600083151561090757600654600554600160a060020a039091169060405160006040518083038185876187965a03f1925050509050610932565b600654600554600160a060020a03909116908590604051600060405180830381858888f19450505050505b80156109c657600b805460ff191660011790556006546005547ff77c471cb61e1a13e445ce01038ea7c8cb4198a93129667564aec9e5acc776849142913391600160a060020a03169088604051948552600160a060020a039384166020860152919092166040808501919091526060840192909252608083015260a0909101905180910390a1600160055492509250610a41565b6006546005547fcb7c530a134da612c5b802376da0b2fd1dc4b7ee04ae0bc093d01ac91fff207d9142913391600160a060020a03169088604051948552600160a060020a039384166020860152919092166040808501919091526060840192909252608083015260a0909101905180910390a1600092508291505b50600b805461ff00191690559092909150565b600654600160a060020a031681565b600b546000908190610100900460ff1615610a7d57600080fd5b600b805461ff001916610100179055600a541515610aa15750600190506000610b57565b600054600a54600160a060020a039091169060405160006040518083038185876187965a03f19250505015610b1d5750600a805460009091557f8f05c2c7ca4b48bbeb87eda627ed3cd5c3907d67b07e1da503e02672944c26c0428260405191825260208201526040908101905180910390a160019150610b57565b7f8a52651e05ab81d1d9625fe5c8811e4f6c4cf4c279976f50d000e4162b9593b84260405190815260200160405180910390a15060009050805b600b805461ff00191690559091565b60095481565b60045481565b600554815600a165627a7a7230582085d1edba1f40a60f9ccf9e5e7f38fd482a13e45f107d7b5c4a9ff67410f6126b0029a165627a7a72305820eba227ba0218d75e1d61f60870ad64063c5ea0f426482244b2982c2b10f4205f0029"
  },
  "Registry": {
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
        "stateMutability": "view",
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
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "name",
            "type": "bytes32"
          },
          {
            "indexed": false,
            "name": "addr",
            "type": "address"
          }
        ],
        "name": "NameRegistered",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x6060604052341561000f57600080fd5b7f4f574e455200000000000000000000000000000000000000000000000000000060009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f8054600160a060020a033316600160a060020a03199091161790556101dc806100836000396000f30060606040526004361061004b5763ffffffff7c0100000000000000000000000000000000000000000000000000000000600035041663bb34534c8114610050578063d22057a914610082575b600080fd5b341561005b57600080fd5b6100666004356100a6565b604051600160a060020a03909116815260200160405180910390f35b341561008d57600080fd5b6100a4600435600160a060020a03602435166100cf565b005b600081815260208190526040902054600160a060020a03168015156100ca57600080fd5b919050565b7f4f574e455200000000000000000000000000000000000000000000000000000060009081526020527f936c48e82d51e2c3095d5ee7c520190336411695eb369c14511299e9b812b60f5433600160a060020a0390811691161461013257600080fd5b60008281526020819052604090819020805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0384161790557f25631d78c8c9e9757c5c8419905e25845aa864284d1df44be777e5fafd2e09f7908390839051918252600160a060020a031660208201526040908101905180910390a150505600a165627a7a7230582002edf4bdc71ce93eca2daa6309717ba12eef9dfadd0451d037c1b48c1791fdf00029"
  },
  "Treasury": {
    "abi": [
      {
        "constant": false,
        "inputs": [
          {
            "name": "_note",
            "type": "string"
          }
        ],
        "name": "acceptRefund",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getDistributeReward",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "dailyFundLimit",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "bankroll",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getMinBalanceToDistribute",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_newValue",
            "type": "uint256"
          }
        ],
        "name": "setDailyFundLimit",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getAmountToDistribute",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_comptroller",
            "type": "address"
          }
        ],
        "name": "initComptroller",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "distributeRewardDenom",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "comptroller",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "canFund",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_amount",
            "type": "uint256"
          },
          {
            "name": "_note",
            "type": "string"
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
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "dayDailyFundLimitChanged",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "distributeToToken",
        "outputs": [
          {
            "name": "_success",
            "type": "bool"
          },
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
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
        "name": "distributionDates",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_newValue",
            "type": "uint256"
          }
        ],
        "name": "setDistributeReward",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
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
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "amtFundedToday",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalFunded",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalRewarded",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalRevenue",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "removeFromBankroll",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_startDate",
            "type": "uint256"
          },
          {
            "name": "_endDate",
            "type": "uint256"
          }
        ],
        "name": "getDistributionStats",
        "outputs": [
          {
            "name": "_count",
            "type": "uint256"
          },
          {
            "name": "_total",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "view",
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
        "name": "distributionAmounts",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_token",
            "type": "address"
          }
        ],
        "name": "initToken",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "addToBankroll",
        "outputs": [],
        "payable": true,
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalDistributed",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "dayLastFunded",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
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
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
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
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "token",
            "type": "address"
          }
        ],
        "name": "TokenSet",
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
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "comptroller",
            "type": "address"
          }
        ],
        "name": "ComptrollerSet",
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
            "name": "oldValue",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "newValue",
            "type": "uint256"
          }
        ],
        "name": "BankrollChanged",
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
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "oldValue",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "newValue",
            "type": "uint256"
          }
        ],
        "name": "DailyFundLimitChanged",
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
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "oldValue",
            "type": "uint256"
          },
          {
            "indexed": false,
            "name": "newValue",
            "type": "uint256"
          }
        ],
        "name": "DistributeRewardChanged",
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
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "RevenueReceived",
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
            "name": "msg",
            "type": "string"
          }
        ],
        "name": "DistributeError",
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
            "name": "token",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "DistributeSuccess",
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
            "name": "token",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "DistributeFailure",
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
            "name": "recipient",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "note",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "amount",
            "type": "uint256"
          }
        ],
        "name": "RewardPaid",
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
            "name": "recipient",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "note",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "FundSuccess",
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
            "name": "reason",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "recipient",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "note",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "FundFailure",
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
            "name": "note",
            "type": "string"
          },
          {
            "indexed": false,
            "name": "sender",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "RefundReceived",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x60606040526103e8600855341561001557600080fd5b60405160208061162a8339810160405280805191508190508080600160a060020a038116151561004457600080fd5b60008054600160a060020a03909216600160a060020a03199092169190911790555050506115b3806100776000396000f30060606040526004361061017c5763ffffffff60e060020a60003504166304e4441981146101da578063050a087e14610222578063083910f0146102475780630c657eb01461025a5780632824dc091461026d578063451c9c75146102805780634e7f00a514610296578063537054e7146102a9578063571948a5146102c85780635ab1bd53146102db5780635fe3b5671461030a57806366dddbbe1461031d5780636d98fcdf146103475780636dee09e01461039d5780636e9960c3146103b0578063760273b7146103c35780637b739b60146103f057806386b4239614610406578063893d20e81461041c578063a76af2091461042f578063ad044f4914610442578063aed29d0714610455578063bf2d9e0b14610468578063c906743a1461047b578063cb16b27914610491578063cd769b37146104c2578063da34e9a8146104d5578063df4d17dc146104eb578063e4d64f3f1461050a578063efca2eed14610512578063f9728f2914610525578063fc0c546a14610538575b60098054349081019091557fee30d021ee5ae6cc24485b86f22ef00a0952ff2965d68083836f2add3149aa559042903390604051928352600160a060020a0390911660208301526040808301919091526060909101905180910390a1005b61022060046024813581810190830135806020601f8201819004810201604051908101604052818152929190602084018383808284375094965061054b95505050505050565b005b341561022d57600080fd5b61023561065d565b60405190815260200160405180910390f35b341561025257600080fd5b61023561067a565b341561026557600080fd5b610235610680565b341561027857600080fd5b610235610686565b341561028b57600080fd5b610220600435610695565b34156102a157600080fd5b61023561077f565b34156102b457600080fd5b610220600160a060020a03600435166107d8565b34156102d357600080fd5b610235610890565b34156102e657600080fd5b6102ee610896565b604051600160a060020a03909116815260200160405180910390f35b341561031557600080fd5b6102ee6108a5565b341561032857600080fd5b6103336004356108b4565b604051901515815260200160405180910390f35b341561035257600080fd5b610333600480359060446024803590810190830135806020601f8201819004810201604051908101604052818152929190602084018383808284375094965061091095505050505050565b34156103a857600080fd5b610235610c4b565b34156103bb57600080fd5b6102ee610c51565b34156103ce57600080fd5b6103d6610c81565b604051911515825260208201526040908101905180910390f35b34156103fb57600080fd5b610235600435610f9f565b341561041157600080fd5b610220600435610fbe565b341561042757600080fd5b6102ee61105a565b341561043a57600080fd5b6102356110e7565b341561044d57600080fd5b6102356110ed565b341561046057600080fd5b6102356110f3565b341561047357600080fd5b6102356110f9565b341561048657600080fd5b6102206004356110ff565b341561049c57600080fd5b6104aa6004356024356111cd565b60405191825260208201526040908101905180910390f35b34156104cd57600080fd5b6102ee6112b2565b34156104e057600080fd5b6102356004356112dd565b34156104f657600080fd5b610220600160a060020a03600435166112eb565b6102206113a3565b341561051d57600080fd5b61023561141a565b341561053057600080fd5b610235611420565b341561054357600080fd5b6102ee611426565b6105536112b2565b600160a060020a031633600160a060020a031614151561057257600080fd5b600754341115610586576000600755610590565b6007805434900390555b34600a600082825403925050819055507fc81e4ab3b83ca3b8707947d051d234f386a799c366185456ced33ead4aa5bbde42823334604051848152600160a060020a03831660408201526060810182905260806020820181815290820185818151815260200191508051906020019080838360005b8381101561061d578082015183820152602001610605565b50505050905090810190601f16801561064a5780820380516001836020036101000a031916815260200191505b509550505050505060405180910390a150565b600060085461066a61077f565b81151561067357fe5b0490505b90565b60045481565b60035481565b60045460035460079091020190565b60008060006106a2610c51565b600160a060020a031633600160a060020a03161415156106c157600080fd5b6005546106cc611435565b116106d657600080fd5b60045492506000831115610711576064606984020491506064605f84020490508084101580156107065750818411155b151561071157600080fd5b600484905561071e611435565b6005557fb5096e6754e25a6716399c111cab9318c157ad17caee2fbff09092551f016cb642338587604051938452600160a060020a03909216602084015260408084019190915260608301919091526080909101905180910390a150505050565b6001546000908190600160a060020a0316151561079f57600091506107d4565b6107a7610686565b9050600160a060020a033016318190116107c457600091506107d4565b8030600160a060020a0316310391505b5090565b6107e061105a565b600160a060020a031633600160a060020a03161415156107ff57600080fd5b600254600160a060020a03161561081557600080fd5b6002805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0383161790557f31e97df019b6383d58580d7740ecf15c0e96214b956752270e845bcc6d8a5419423383604051928352600160a060020a039182166020840152166040808301919091526060909101905180910390a150565b60085481565b600054600160a060020a031690565b600254600160a060020a031681565b600030600160a060020a0316318211806108cf575060045482115b156108dc5750600061090b565b6108e4611435565b600654101580156108fa57506004548260075401115b156109075750600061090b565b5060015b919050565b60008061091b6112b2565b600160a060020a031633600160a060020a031614151561093a57600080fd5b600f5460ff161561094a57600080fd5b600f805460ff1916600117905561095f6112b2565b905061096a846108b4565b1515610a6c577faffb15aa0eba5f10b879e892f64f01648e48db79f6fad309ba8f8c753705e58e42828587604051848152600160a060020a03841660408201526080810182905260a060208201818152600c918301919091527f43616e6e6f742066756e642e000000000000000000000000000000000000000060c083015260e06060830181815290830185818151815260200191508051906020019080838360005b83811015610a25578082015183820152602001610a0d565b50505050905090810190601f168015610a525780820380516001836020036101000a031916815260200191505b50965050505050505060405180910390a160009150610c3a565b80600160a060020a03168460405160006040518083038185876187965a03f1925050501515610b49577faffb15aa0eba5f10b879e892f64f01648e48db79f6fad309ba8f8c753705e58e42828587604051848152600160a060020a03841660408201526080810182905260a060208201818152601e918301919091527f4d61696e436f6e74726f6c6c65722072656a65637465642066756e64732e000060c083015260e060608301818152908301858181518152602001915080519060200190808383600083811015610a25578082015183820152602001610a0d565b600654610b54611435565b1115610b605760006007555b600a8054850190556007805485019055610b78611435565b6006557f852ea80d60369a57e739e4f894905f6544e22ba35d7b647afb9e745340ff622e42828587604051848152600160a060020a03841660208201526060810182905260806040820181815290820184818151815260200191508051906020019080838360005b83811015610bf8578082015183820152602001610be0565b50505050905090810190601f168015610c255780820380516001836020036101000a031916815260200191505b509550505050505060405180910390a1600191505b50600f805460ff1916905592915050565b60055481565b6000610c7c7f41444d494e000000000000000000000000000000000000000000000000000000611441565b905090565b600154600090819081908190600160a060020a03161515610d0a577fd120bf44073f187787d17eb64c30948e6d94070a43988897b3ffef6c5bd44af742604051908152604060208201819052601c818301527f4e6f206164647265737320746f206469737472696275746520746f2e0000000060608301526080909101905180910390a1610f99565b610d1261077f565b915060008211610d8a577fd120bf44073f187787d17eb64c30948e6d94070a43988897b3ffef6c5bd44af7426040519081526040602082018190526018818301527f4e6f2070726f66697420746f20646973747269627574652e000000000000000060608301526080909101905180910390a1610f99565b60085482811515610d9757fe5b60015491900480840394509150600160a060020a03168360405160006040518083038185876187965a03f1925050501515610e34576001547f753b07cb00706d6006c6afd754fd3cec2eab2992835453e284dd4c9f5004f0e2904290600160a060020a031685604051928352600160a060020a0390911660208301526040808301919091526060909101905180910390a160009350839250610f99565b600c805484019055600d805460018101610e4e8382611544565b506000918252602090912042910155600e805460018101610e6f8382611544565b5060009182526020909120018390556001547fb59b1fe64460a3606b7455ccd5c2671dd261a975f4b1b05d1def466070249b0e904290600160a060020a031685604051928352600160a060020a0390911660208301526040808301919091526060909101905180910390a1600b805482019055600160a060020a0333168160405160006040518083038185876187965a03f1925050501515610f1057600080fd5b7f5b205246240395bc559cc5d6fbe5d1123ea60a6e346bd25f5a5cb0dd1992eccf423383604051928352600160a060020a039091166020830152606082015260806040808301829052601b918301919091527f43616c6c6564202e64697374727562757465546f546f6b656e2829000000000060a083015260c0909101905180910390a1600193505b50509091565b600d805482908110610fad57fe5b600091825260209091200154905081565b6000610fc8610c51565b600160a060020a031633600160a060020a0316141515610fe757600080fd5b6064821015610ff557600080fd5b5060088054908290557f3dd91cbc6ffc237d82e801ce84fd64c5e40a64393b0bb7e570a2b6a17b82e5f642338385604051938452600160a060020a03909216602084015260408084019190915260608301919091526080909101905180910390a15050565b60008054600160a060020a031663bb34534c826040516020015260405160e060020a63ffffffff83160281527f4f574e45520000000000000000000000000000000000000000000000000000006004820152602401602060405180830381600087803b15156110c857600080fd5b6102c65a03f115156110d957600080fd5b505050604051805191505090565b60075481565b600a5481565b600b5481565b60095481565b60025460009033600160a060020a0390811691161461111d57600080fd5b6003548290101561112d57600080fd5b600160a060020a033016318290101561114557600080fd5b5060038054828103909155600254600160a060020a03168260405160006040518083038185876187965a03f192505050151561118057600080fd5b7f59edf67780786653112d0cbe0eac7fdeeac3d1d016dc07b3ea4cc286e2433ef7428260035460405180848152602001838152602001828152602001935050505060405180910390a15050565b6000806000806000600d80549050600014156111e8576112a8565b8515156111f3574295505b6111fe8760016114b2565b925061120b8660006114b2565b600d5490925060011901821415611223576001820191505b50815b8181116112a85786600d8281548110151561123d57fe5b9060005260206000209001541015611254576112a0565b85600d8281548110151561126457fe5b906000526020600020900154111561127b576112a0565b600e80546001909601958290811061128f57fe5b906000526020600020900154840193505b600101611226565b5050509250929050565b6000610c7c7f4d41494e5f434f4e54524f4c4c45520000000000000000000000000000000000611441565b600e805482908110610fad57fe5b6112f361105a565b600160a060020a031633600160a060020a031614151561131257600080fd5b600154600160a060020a03161561132857600080fd5b6001805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0383161790557f6780611d49e455473197d430fffc02da2a6f33a0100468ac69f5066983a6b4f6423383604051928352600160a060020a039182166020840152166040808301919091526060909101905180910390a150565b60025460009033600160a060020a039081169116146113c157600080fd5b506003805434810191829055907f59edf67780786653112d0cbe0eac7fdeeac3d1d016dc07b3ea4cc286e2433ef7904290839060405180848152602001838152602001828152602001935050505060405180910390a150565b600c5481565b60065481565b600154600160a060020a031681565b60006201518042610673565b60008054600160a060020a031663bb34534c83836040516020015260405160e060020a63ffffffff84160281526004810191909152602401602060405180830381600087803b151561149257600080fd5b6102c65a03f115156114a357600080fd5b50505060405180519392505050565b600d54600090819060001901600281045b8480156114e9575085600d828154811015156114db57fe5b906000526020600020900154105b80611517575084158015611517575085600d8281548110151561150857fe5b90600052602060002090015411155b1561152457809250611528565b8091505b5060028282010480831461153b576114c3565b95945050505050565b8154818355818115116115685760008381526020902061156891810190830161156d565b505050565b61067791905b808211156107d457600081556001016115735600a165627a7a723058209fe7c9eeaceab2a327971275d293668218dbca2222336aacf08b1fb41744ab110029"
  }
}
}());