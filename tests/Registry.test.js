const Registry = artifacts.require("Registry");

const createDefaultTxTester = require("../js/tx-tester/tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert, it);
const testUtil = createDefaultTxTester().plugins.testUtil;
const BigNumber = web3.toBigNumber(0).constructor;

describe('Registry', function(){
    const accounts = web3.eth.accounts;
    const owner = accounts[0];
    const anon = accounts[1];
    const addrOne = accounts[2];
    const addrTwo = accounts[3];
    const addrThree = accounts[4];
    const addrFour = accounts[5];
    const addrFive = accounts[6];
    const NO_ADDRESS = "0x0000000000000000000000000000000000000000";
    var registry;

    before("Set up Registry", async function(){
        const addresses = {
            owner: owner,
            addrOne: addrOne, 
            addrTwo: addrTwo,
            addrThree: addrThree,
            addrFour: addrFour,
            addrFive: addrFive,
            NO_ADDRESS: NO_ADDRESS
        };
        await createDefaultTxTester().nameAddresses(addresses).start();

        this.logInfo("Create Registry");
        await createDefaultTxTester()
            .doNewTx(Registry, [owner], {from: anon}).assertSuccess()
            .withTxResult((txRes, plugins)=>{
                registry = txRes.contract;
                plugins.addAddresses({registry: registry});
            }).start();
    });

    describe("Registering and Unregistering", function(){
        it("Register ONE => addrOne", function(){
            return assertRegisters("ONE", addrOne);
        });
        it("Register TWO => addrTwo", function(){
            return assertRegisters("TWO", addrTwo);
        });
        it("Unregister ONE", function(){
            return assertUnregisters("ONE");
        });
        it("Register THREE => addrThree", function(){
            return assertRegisters("THREE", addrThree);
        });
        it("Register ONE => addrOne", function(){
            return assertRegisters("ONE", addrOne);
        });
        it("Reregistering ONE to addrFour.", function(){
            return assertRegisters("ONE", addrFour);
        });
        it("Register FOUR => addrFour", function(){
            return assertRegisters("FOUR", addrFour);
        });
        it("Reregister ONE => addrOne", function(){
            return assertRegisters("ONE", addrOne);
        });
        it("Fail registering ONE => 0", function(){
            return createDefaultTxTester()
                .doTx([registry, "register", "ONE", 0])
                .assertInvalidOpCode()
                .start();
        });
        it("Fail registering THREE => 0", function(){
           return createDefaultTxTester()
                .doTx([registry, "register", "THREE", 0])
                .assertInvalidOpCode()
                .start(); 
        });
        it("Unregister FOUR", function(){
            return assertUnregisters("FOUR");
        });
        it("Unregister TWO", function(){
            return assertUnregisters("FOUR");
        });
        it("Unregister THREE", function(){
            return assertUnregisters("THREE");
        });
        it("Unregister unused FIVE (no change)", function(){
            return assertUnregisters("FIVE");
        })
    });

    // an array of [name, addr] mappings, both JS strings
    const EXP_MAPPINGS = [];

    function toBytes32(str) {
        str = web3.fromUtf8(str).slice(0, 66);
        const padLen = Math.max(66 - str.length, 0);
        const padding = (new Array(padLen+1)).join("0");
        return `${str}${padding}`;
    }

    function getExpMappings() {
        const names = EXP_MAPPINGS.map(m => toBytes32(m[0]));
        const addresses = EXP_MAPPINGS.map(m => m[1]);
        return [names, addresses];
    }

    function getExpName(address) {
        const entry = EXP_MAPPINGS.find(m => m[1]==address);
        return toBytes32(entry ? entry[0] : "");
    }

    function assertRegisters(name, address) {
        const entry = EXP_MAPPINGS.find((e) => e[0]==name);
        
        // update address or add mapping
        if (entry) {
            console.log("This should update the address in entries.")
            entry[1] = address;
        } else {
            console.log("This should create a new entry.");
            EXP_MAPPINGS.unshift([name, address]);
        }
            
        return createDefaultTxTester()
            .doTx([registry, "register", name, address, {from: owner}])
            .assertSuccess()
            .assertCallReturns([registry, "addressOf", name], address)
            .assertCallReturns([registry, "nameOf", address], getExpName(address))
            .assertCallReturns([registry, "size"], EXP_MAPPINGS.length)
            .assertCallReturns([registry, "mappings"], getExpMappings())
            .start();
    }

    function assertUnregisters(name) {
        const entry = EXP_MAPPINGS.find((e) => e[0]==name);
        // remove entry if exists
        if (entry) {
            console.log("This should remove the entry.");
            const index = EXP_MAPPINGS.indexOf(entry);
            EXP_MAPPINGS.splice(index, 1);
        } else {
            console.log("No entry to remove.");
        }
        
        return createDefaultTxTester()
            .doTx([registry, "unregister", name, {from: owner}])
            .assertSuccess()
            .assertCallThrows([registry, "addressOf", name])
            .assertCallReturns([registry, "size"], EXP_MAPPINGS.length)
            .assertCallReturns([registry, "mappings"], getExpMappings())
            .start();
    }

    function toAddress(n) {
        const str = (new BigNumber(n)).toString(16);
        const padLen = Math.max(40 - str.length, 0);
        const padding = (new Array(padLen+1)).join("0");
        return `0x${padding}${str}`;
    }

});