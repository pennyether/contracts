# Penny Ether Contracts

This repo contains open-sourced PennyEther contracts, a description of how they work, and lots of tests.

This repo also contains some pretty useful open sourced testing tools for testing Ethereum contracts. In the future, they will be moved to a separate package.

## Test Results

We've run exhaustive tests and saved them to `/tests/results/index.html`. If you'd like to run the tests yourself, follow the instructions below.

## To Run Tests

_Note: Node 8 or higher required._

- Install `node` and `npm`
- `git clone` this repo, and `cd` into it
- Install dependencies: `npm install`.
- Run: `./scripts/compile.js` - this compiles all contracts and creates artifacts (abis, etc) in the `/build/contracts` folder.
- Fire up `Gananche`. If you don't have it: `npm install -g ganache-cli` then `ganache-cli`
- To run a test: `./scripts/test.js tests/Comptroller.js`
- To run all tests: `./scripts/test.js all` (this will run _a lot_ of tests!)

<div style='border: 1px solid gray; padding: 10px; background: #FFFFFA; border-radius: 5px;'>
If you receive an error that Web3 couldn't connect, make sure you have `testrpc` or `ganache` running on `localhost:8545`.  If you do not have Ganache, do: `npm install -g ganache-cli` then `ganache-cli`.
</div>

## Contract Architecture

### Contracts

Here's a rundown of our contracts, and how they interact with one another. For more details about what all of this means, please see our whitepaper.


- **Comptroller.sol**: Runs CrowdSale, controls tokens, and talks to `Treasury`.

	- **Creates `DividendToken`**:
		- A standard `ERC20` token
		- Any `ETH` sent to it will be distributed across all token holders relative to `balanceOfTokenHolder / totalSupply`.
		- `.getOwedDividends(<address>)` returns the amount of Ether owed to `<address>`
		- `.collectOwedDividends()` will send owed dividends to the caller's address.
		- When tokens are transferred, minted, or burned, `owedDividends` is updated for both the sender and receiver. Therefore, *dividends of tokens are not transferred, only the tokens themselves.*
		- Tokens can be frozen (this will only happen during the CrowdSale).

	- **Creates `TokenLocker`**:
		- This contract will hold `10%` of the `totalSupply` of tokens after the CrowdSale ends.
		- PennyEther can claim the `owedDividends`, but nothing else. We cannot burn or transfer these tokens.

	- **Can initiate the CrowdSale, during which**:
		- Tokens are frozen (cannot be transferred).
		- `1 ETH` gets `1 Token` (minimum allowed is `0.000000001 ETH`)
			- The first `20,000 ETH` will receive a `50%` bonus, on a linear scale.
			- Eg: The `1st ETH` will receive `~1.5 tokens`, the `10,000th ETH` will receive `~1.25 tokens`, the `20,000 ETH` will receive `~1 Token`.
		- If `SoftCap` is not reached, all participants can collect a full refund by calling `.refund()`
		- If `HardCap` is reached, the crowdsale ends.

	- After the crowdsale:
		- `TokenLocker` and `CustodialWallet` tokens are minted, such that they each end with `10%` of `totalSupply`.
		- Participants end with `80%` of all tokens minted.
		- No tokens can ever be minted again.
		- Proceeds are distributed:
			- `.5 * totalSupply * .9` wei is sent to `Treasury` as bankroll. This ensures all tokens can be burned for a full refund (`TokenLocker's` 10% of tokens are excluded.)
			- 14 days of daily funding, `~30ETH`, are added to `Treasury`, ensuring a 2 week buffer period is in place.
			- The remaining proceeds are sent to `CustodialWallet` as capital.
		- Tokens can be burned. Burning `1 Token` will remove `.5 ETH` from `Treasury`'s bankroll, and refund the user that `.5 ETH`. It will also burn `.125 Tokens` from `TokenLocker`, to ensure `TokenLocker` always has 10% of `totalSupply`.
			- Note: In the unlikely case that `Treasury` does not have sufficient funds to pay for burning all of a user's tokens, it will burn as many tokens as possible. The rest can be burned if/when `Treasury` gains a balance.

- **Treasury.sol**: Holds the bankroll, pays dividends on demand.
	- Is able to fund `MainController` a limited amount per day.
	- Allows `Comptroller` to tell `Treasury` to remove bankroll and send it to a user.
	- Allows anyone to trigger a dividend event by calling `.distributeToToken()`, provided `(Treasury balance) > (daily limit * 14)`.
- **Registry.sol**: This is how we upgrade all proceeding contracts.
	- Contains a `string => address` mapping of names to addresses.
	- When a contract is upgraded, the mapping is changed. All depedendant contracts (`Treasury`, and anything below) will use the new addresses on subsequent calls.
	- Since contracts interact with registered contracts quite frequently, we created inheritible classes for each, called **`roles`**.
		- An example of this is `Treasury` which inherits `roles/UsingMainController`.
		- Whenever `Treasury` needs to get the address of the current `MainController`, it uses the inherited `getMainController()` method. 
		- Whenever it needs to ensure a call is from `MainController`, it uses the inherited `fromMainController` function modifier.
		- `getMainController` will return an `IMainController` object, which is an interface that defines what methods are availabled.
	- `/contracts/roles` contains all roles.
	- `/contracts/interfaces` contains the interfaces returned by the roles.
- **MainController.sol**: This contract keeps PennyEther running autonomously by overseeing all `GameControllers`.
	- It rewards users for calling functions that help the system, called `Tasks`:
		- Starting a Penny Auction: Creates a new `Penny Auction` contract that will send all fees earned to `Treasury`
		- Refreshing Penny Auctions:
			- Causes all running Penny Auctions to send their accrued fees to `Treasury`
			- For any auctions that are complete, pays the winner and moves the auction to *endedAuctions* so that another can be started in its place.
	- When new types of games are added, this will be upgraded to provide additional rewards to ensure PennyEther remains autonomous.
- **PennyAuctionController.sol**: The `Game Controller` for Penny Auctions.  It manages all running and ended PennyAuctions. To prevent copycats, this contract will be made open source after the ICO. Tests and the ABI are available in this repo.
- **InstaDice.sol**: The `Game Controller` for InstaDice.
	- Allows anyone to add bankroll (realistically, only PennyEther will do this)
	- Allows users to send ETH in return for a chance at winning more.
- **PennyAuctionFactory.sol**: A contact that can create `PennyAuction.sol` contract instances. This exists on its own for etherscan verification purposes, as well as to simplify to codebase.
- **PennyAuction.sol**: A new instance of this contract is created for each Penny Auction.
- **CustodialWallet.sol**: This contract essentially owns PennyEther, and uses a 2-tier cold wallet ownership structure.
	- The `custodian` can make calls on behalf of this wallet.
	- The `supervisor` (cold wallet) can:
		- Obtain the balance of the contract
		- Change the `custodian` (and must provide a new `supervisor` wallet)
	- The `owner` (very cold wallet) can:
		- Change the `supervisor` (and must provide a new `owner` wallet)

## Testing

### Tests

We've tested every feature listed above, and if you're so inclined, you can read and run the tests yourself. Or, you can view the test results in `/tests/results/index.html`.

### Helper Contracts

In all cases where a contract _could_ interact, we made a test where it _did_ interact. This allows us to test cases where malicious contracts try to consume too much gas. These contracts are found in the `/contracts/test-helpers` folder.


### TxTester ##

We've created a pretty awesome testing framework. Have a look at `/js/tx-tester/`, which will soon become its own NPM package. It allows you to quickly test nearly _all_ side effects of any transaction:

Here's a quick and dirty overview:

```
const web3 = /*...*/;
const assert = require("chai").assert;
const createDefaultTxTester = require("tx-tester.js")
    .createDefaultTxTester.bind(null, web3, assert);

createDefaultTxTester()
	// ledger starts watching on these addresses
	.startLedger([addr1, addr2])
	// does a transaction, using truffle-contract library
	.doTx([myContract, "someFn", <param1>, <param2>])
	.assertSucces() 				// ensures no failure in the Tx
		// ensures a log was emitted with this data
		.assertLog("NameOfLog", {
			param1: 123,
			param2: "some string",
			param3: null				// this only tests that param3 exists
		})
		// ensures contract2.someConstant() returns 5678
		.assertCallReturns([contract2, "someConstant"], 5678)
	.doFn(async function(){
		// you can define a promise here, and use it in a later assertion.
		// perhaps you want to assert a value of a newly created contract
		pContract = Contract.at(await myContract.getNewContract());
		someResultThatJustHappened = myContract.foo();
	})
		// assertCallReturns can take fn's as arguments, allowing async stuff.
		.assertCallReturns(()=>[pContract, "foo"], ()=>someResultThatJustHappened)
	// this tells the ledger to collect all data for [addr1, addr2]
	.stopLedger()
	.assertDelta(addr1, 123)			// ensures addr1 gained 123 wei
	.assertDeltaMinusTxFee(addr2, 123)	// ensures addr2 gains 123, but lost txFee
	.start();							// starts the asyncChain above, returns promise.

// Prints out really nice looking log. You'll have to try it for yourself to see.
```

## Security

One of our goals is to ensure Penny Ether can run itself, with very limited input from the owner or admin. Additionally, we've set up the system so that _even if_ an adversary were to gain ownership control (or we turned evil), the damage possible is _severely_ limited.

### Roles

The following roles exist, with their permissions listed:

- **Owner** via `CustodialWallet.sol` _(see above)_
	- Can make changes to the registry, adding or upgrading the following contracts (`MainController`, `PennyAuctionController`, `PennyAuctionFactory`, `InstaDice`, any new contracts)
	- Controls 50% of proceeds from the CrowdSale, and 10% of tokens.
	- Can retrieve dividends accrued by `TokenLocker` (but cannot transfer or burn the tokens)
	- Can change the `Admin` account.
	- One time permissions:
		- Can set the `Treasury` address in the `Comptroller` once.
		- Can set the `Token` address in the `Treasury` once.
		- Can set the `Comptroller` address in the `Treasury` once.
		- Can tell `Comptroller` to initiate the CrowdSale once.

- **Admin**
	- Can change `Treasury` `dailyFundLimit` by +/- 5% each day.
	- Can change `Treasury` `distrubuteReward` to up to 1%.
	- Can change `MainController` rewards.
		- This rewards are considered "funding" by the `Treasury`, so they are limited.
	- Can set pre-defined auctions in `PennyAuctionController`
		- This ensures PennyAuctions are always running

### Scenarios

Let's go over a few scenarios, and their possible impact on Penny Ether

- **`Admin` account compromised**:
	- Possibilities:
		- The admin could change the settings as listed above. For example, an admin could cause up to the `dailyFundLimit` to be sent to a poorly configured game, or reward.
	- Possible Financial Loss:
		- `dailyFundLimit` per day -- not guaranteed to go to the attacker.
	- Remediation:
		- `Supervisor` immediately changes the `Admin` address to a secure one.
		- New `Admin` reverts any changes made.

- **`Custodian` account compromised**:
	- Possibilities:
		- All of the above.
		- Could change the `MainController` registry entry to their own wallet, so they receive `dailyFundLimit` per day.
		- Could deploy games where the revenue goes to their own wallet.
	- Financial Loss:
		- `dailyFundLimit` per day -- with funds going directly to the attacker.
		- Revenues may no longer go to `Treasury`, but to attacker.
	- Remeditation:
		- `Supervisor` immediately changes the `Custodian` address to a secure one.
		- New `Custodian` reverts all changes.
		- Same remediations as above.

- **`Supervisor` account compromised**:
	- Possibilities:
		- All of the above.
		- Could get all available funds in `CustodialWallet`
	- Financial Loss:
		- `dailyFundLimit` per day -- with funds going directly to the attacker.
		- Revenues may no longer go to `Treasury`, but to attacker.
		- PennyEther loses whatever balance is in `CustodialWallet` (likely not too much)
	- Remediation:
		- `Owner` immediately changes `Supervisor` address to a secure one.
		- Same remediations as above.
	- Notes: As noted in `CustodialWallet.sol`, `supervisor` wallet is held in cold storage.

- **`Owner` account compromised**:
	- Possibilities:
		- All of the above, but cannot be remediated.
	- Financial Loss:
		- `dailyFundLimit` per day -- with funds going directly to the attacker.
		- Revenues may no longer go to `Treasury`, but to attacker.
		- PennyEther loses whatever balance is in `CustodialWallet` (likely not too much)
	- Remediation:
		- Token holders are told to burn their tokens for .5 ETH per token.
		- If all tokens are burned, maximum payout to attacker is `dailyFundLimit * 14`.
	- Notes: As noted in `CustodialWallet.sol`, `owner` wallet is held in deep cold storage, and will likely never need to be used.

- Additional Notes
	- `Treasury` has a buffer between the `bankroll` amount, and the `minimum dividend threshold` of `14 * dailyLimit`. This means if dividends were just distributed, there is a guaranteed 14 days of solvency where _all_ tokens can be burned for a refund.
		
### Audits

Though we've thoroughly tested all roles and permissions, our contracts are currently under audit by a third party. We'll post the results here after they are done.