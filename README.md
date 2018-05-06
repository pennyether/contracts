# Penny Ether Contracts

This repo contains open-sourced PennyEther contracts, a description of how they work, and lots of tests. Descriptions of each contract are below, and each `.sol` file also contains a detailed technical description as well.

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
- To run all tests, and save results: `./scripts/create-test-results.js`

<div style='border: 1px solid gray; padding: 10px; background: #FFFFFA; border-radius: 5px;'>
If you receive an error that Web3 couldn't connect, make sure you have `testrpc` or `ganache` running on `localhost:8545`.  If you do not have Ganache, do: `npm install -g ganache-cli` then `ganache-cli`.
</div>

## Contract Architecture

### Contracts

Here's a rundown of our contracts, and how they interact with one another. For more details about what all of this means, please see <a href="https://www.pennyether.com/ico/whitepaper.html">the whitepaper</a>.

- <a id="comptroller"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/Comptroller.sol">**Comptroller.sol**</a>: Runs CrowdSale, controls tokens, and talks to `Treasury`.
	- <a id="dividendtoken"></a>**Creates <a href="https://github.com/pennyether/contracts/tree/master/contracts/DividendToken.sol">`DividendToken`</a>**:
		- A standard `ERC20` token
		- Any `ETH` sent to it will be distributed across all token holders relative to `balanceOfTokenHolder / totalSupply`.
		- `.getOwedDividends(<address>)` returns the amount of Ether owed to `<address>`
		- `.collectOwedDividends()` will send owed dividends to the caller's address.
		- When tokens are transferred, minted, or burned, `owedDividends` is updated for both the sender and receiver. Therefore, *dividends of tokens are not transferred, only the tokens themselves.*
		- Tokens can be frozen (this will only happen during the CrowdSale).

	- <a id="tokenlocker"></a>**Creates <a href="https://github.com/pennyether/contracts/tree/master/contracts/DividendTokenLocker.sol">`TokenLocker`</a>**:
		- This contract holds PENNY Tokens, and allows `owner` to transfer tokens and/or collect accrued dividends of these tokens.
		- Tokens "vest" linearly over a period defined by `comptroller`, which is hard-coded to use 600 days. Tokens cannot be transferred by `owner` unless they are vested.

	- **Can initiate the CrowdSale, during which**:
		- Tokens are frozen (cannot be transferred).
		- `1 ETH` gets `1 Token` (minimum allowed is `0.000000001 ETH`)
			- The first `bonusCap` Ether will receive a `50%` bonus, on a linear scale.
			- Eg: If `bonusCap` is 10,000:
				- The `1st ETH` will receive `~1.5 tokens`
				- The `5,000th ETH` will receive `~1.25 tokens`
				- The `10,000th ETH` will receive `1 token`
		- If `SoftCap` is not reached, all participants can collect a full refund by calling `.refund()`
		- If `HardCap` is reached, the crowdsale ends immediately thereafter.

	- <b>After the crowdsale</b>:
		- `TokenLocker` is minted `20%` of all tokens, and the vesting starts.
		- Participants end with `80%` of all tokens minted.
		- Proceeds are distributed:
			- `capitalPct` of Ether raised is sent to the `Treasury` as Capital, to be used to bankroll contracts
			- The remaining Ether raised is sent to `Owner Wallet`, to be used at the owners' discretion (salary, marketing, advertising, etc).

	- <b>Raising additional capital</b>
		- If `Treasury`'s `capitalTarget` is above `capitalRaised`, the Comptroller will sell tokens @ `1 PENNY per 1 Ether`. The proceeds will be sent to `Treasury` as `capitalRaised`.
		- When raising additional capital, more tokens are minted, and _everyone_'s ownership is diluted, including the owners'. This disincentivizes raising capital unless that capital can earn a return.

	- Notes:
		- All addresses are hard-coded. The addresses of the `treasury` and `token`, for example, cannot be changed. 

- <a id="treasury"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/Treasury.sol">**Treasury.sol**</a>: Manages capital and issues dividends on demand.
	- Uses `Governance` to manage Capital
		- A `Governance Request` can be created by the current `Admin`
		- A `Request` specifies a `type`, `target`, `value`, and `reason`.
		- A `Request` can be cancelled by the current `Admin` within 1 week.
		- A `Request` can be executed (by anyone) if not cancelled within 1 week.

	- There are four available `Governance Request` types.
		- `SendCapitalRequest`, if executed, will send `value` Ether to the `target` contract. This Ether can later be recalled.
		- `RecallCapitalRequest`, if executed, will recall _up to_ `value` Ether from `target`. It's possible that `target` has insufficient funds, in which case it should send back as much as possible.
		- `DistributeCapitalRequest`, if executed, will send `Capital` directly to `profits`, allowing a dividend to be issued.
		- `RaiseCapitalRequest` will increase the `capitalTarget` by `value`, allowing `Comptroller` to sell tokens. (This is unlikely to be needed in the foreseeable future, but is provided just in case)


	- Allows anyone to call `.issueDividend()`, provided `profits` > 0. This sends `profits` to the `PENNY Token`
	- Notes:
		- `token` is hard-coded and cannot be changed. This ensures that `profits` always go to the expected `token`.
		- `comptroller` is hard-coded and cannot be changed. This ensures that `capitalRaised` always increases when the `comptroller` raises capital.

	
- <a id="registry"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/Registry.sol">**Registry.sol**</a>: This is how we upgrade all versioned contracts.
	- Contains a `string => address` mapping of names to addresses.
	- Most contracts internally use `registry.addressOf(str)` to get the address of another contract, eg `register.addressOf("ADMIN")` to get the current `Admin`.
	- When a contract is redeployed, and the mapping is changed, all dependant contracts will thus start calling the _new_ version automatically.
	- Only the `owner wallet` can change mappings.

	
- <a id="taskmanager"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/TaskManager.sol">**TaskManager.sol**</a>: This contract keeps PennyEther running autonomously by incentivizing users to perform `Tasks` that pay a reward.
	- This contract gets bankrolled just like a game would, but will never produce profits.
	- When new types of games are added, this will be upgraded to provide additional rewards to ensure PennyEther remains autonomous.
	- The following `Tasks` are available:
		- Telling a `Bankrolled` contract to send its `profits` to `Treasury`. This pays a reward proportional to the amount of profits sent. This ensures profits will always get sent to `Treasury` in a timely fashion.
		- Starting a MonarchyGame: Creates a new `MonarchyGame`, if possible, and pays a small fixed fee. This ensures there are always `MonarchyGame`s running.
		- Refreshing Monarchy Games:
			- Causes all running games to send their accrued fees to `MonarchyController`
			- For any games that are complete, pays the winner and moves the game to *endedGames* so that another can be started in its place.
	- Notes:
		- This contract can only pay out a `dailyLimit` of rewards. This prevents a malicious `Admin` from draining the entire balance by setting very high `reward`s.
		- This contract contains limits on the reward amounts. These limits may need to be adjusted as the price of Ether fluctuates.

- <a href="https://github.com/pennyether/contracts/tree/master/contracts/common/Bankrollable.sol">**Bankrollable.sol**</a>: The base class for all game controllers. By simply inheriting this class, inhouse or 3rd-party developers can easily create contracts to be run on the PennyEther platform.
	- This allows Ether to be easily sent and recalled (from a whitelist of addresses)
	- Allows anyone to call `.sendProfits()`, which will send `balance - (bankrolled + collateral)` to _only_ the `Treasury`. By inheriting this class, `TaskManager` will automatically be able to reward users for calling `.sendProfits()`.
	- Optionally ensures inheritors keep `collateral` from ever being sent. For example, `VideoPoker` maintains `credits` for users, and sets `collateral` to the amount of `credits` owed. If `.sendProfits()` is ever called, `Bankrollable` ensures those `credits` are never sent as profits.



- <a id="instadice"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/games/InstaDice.sol">**InstaDice.sol**</a>: The `Game Controller` for InstaDice. It is `Bankrollable`.
	- Allows users to send ETH in return for a chance at winning more.
	- Uses the the transaction's `blockhash` to determine if a roll is a win or loss.
	- Pays out the previous roll on the current roll. This saves a tremendous amount of gas.
	- Allows the previous roll to be paid out manually.
	- Enforces a maximum bet to ensure zero incentive for miners to cheat `blockhash`

- <a id="videopoker"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/games/VideoPoker.sol">**VideoPoker.sol**</a>: The `Game Controller` for VideoPoker. It is `Bankrollable`.
	- This inherits `VideoPokerUtils.sol`, which contains `pure` functions that can draw and rank 5-card poker hands efficiently.
	- Stores all game details. A game consists of an initial hand, a `draws` number, and a final hand.
	- The initial hand is determined from the `bet` transaction's `blockhash`.
	- The drawn hand is determined from the `draw` transaction's `blockhash`
	- `Finalizing` will look at the final hand and `credit` the user on a win.
	- Since `blockhash` is only available for 255 blocks, a user must `draw` or `finalize` within 255 blocks of `betting` or `drawing`, respectively. If they fail to do so, the `initial hand` or `draw hand` will be unavailabled.
	- This contract sets the total `credits` as `collateral`, ensuring that even if all `bankroll` is removed, it will still have a balance to pay owed `credits`.

	
- <a id="monarchy"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/games/MonarchyController.sol">**MonarchyController.sol**</a>: The `Game Controller` for `MonarchyGame`s. It is `Bankrollable`.
	- Allows `Admin` to set (and enable and disable) pre-defined game parameters called `definedGame`s.
	- If `enabled` and unstarted, a `definedGame` can be started by anyone (typically the `TaskManager`), provided `MonarchyController` has a sufficient balance to start the game, and has not used its `dailyLimit`.
	- When a game is created, its `collector` is permanently set to be `MonarchyController` -- that is, all overthrow fees will be sent back to this contract.
	- `.refreshGames()` causes all active games to send their accrued fees. This also ends any games that are completed, and moves them to the `endedGames` array, allowing the `definedGame` to be started once again.
	- Enforces a `dailyLimit` in how much can be spent starting games. This minimizes the damage if `Admin` becomes evil, or if games are somehow ending too quickly.
	
- <a href="https://github.com/pennyether/contracts/tree/master/contracts/games/MonarchyFactory.sol">**MonarchyFactory.sol**</a>: A contract that can create `MonarchyGame.sol` contract instances. This exists on its own for etherscan verification purposes, as well as to simplify the codebase.
	- Will always set `MonarchyGame.collector` to `MonarchyFactory`.
	- Fails gracefully if the contract is unable to be created.

- <a id="monarchygame"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/games/MonarchyGame.sol">**MonarchyGame.sol**</a>: A new instance of this contract is created for each MonarchyGame.
	- Contains logic for running a game in a very gas-efficient manner.
	- Sends `overthrow` fees to `collector`.
	- Allows anyone to send the winnings to the winner, provided the game is completed.


- <a id="owner-wallet"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/CustodialWallet.sol">**CustodialWallet.sol**</a>: This contract essentially owns PennyEther, and uses a 2-tier cold wallet ownership structure.
	- The `custodian` can make calls on behalf of this wallet.
	- The `supervisor` (cold wallet) can:
		- Send balance of the contract to a recipient.
		- Change the `custodian` (and must provide a new `supervisor` wallet)
	- The `owner` (very cold wallet) can:
		- Change the `supervisor` (and must provide a new `owner` wallet)

- <a id="dao"></a><a href="https://github.com/pennyether/contracts/tree/master/contracts/Dao">**DAO.sol**</a>: This allows Token Holders to deposit tokens (and still receive dividends), and use those tokens to create and vote on Propositions.
	- This contract is a work in progress.

### Roles

Since contracts interact with registered contracts quite frequently, we created inheritible classes for each, called **`roles`**. Together with the `Registry` this allows for simple role management and upgradability.

- An example of this is <a href="https://github.com/pennyether/contracts/tree/master/contracts/TaskManager.sol">`TaskManager`</a> which inherits <a href="https://github.com/pennyether/contracts/tree/master/contracts/roles/UsingMonarchyController.sol">`roles/UsingMonarchyController`</a>.
- Whenever `TaskManager` needs to get the address of the current `MonarchyController`, it uses the inherited `getMonarchyController()` method, which returns an `IMonarchyController` interface.
- A common `role` is `UsingAdmin`, which provides a `.fromAdmin()` function modifier. Contracts that use this will automatically permission against the current `Admin`.
- If the mapping for a `role` is changed in the `Registry`, it immediately takes effect accross all contracts that use that role. For example, if the `Admin` mapping in `Registry` is changed, this takes effect immediately in all contracts.
- <a href="https://github.com/pennyether/contracts/tree/master/contracts/roles">`/contracts/roles`</a> contains all roles.
- <a href="https://github.com/pennyether/contracts/tree/master/contracts/roles">`/contracts/interfaces`</a> contains the interfaces returned by the roles.

## <a id="testing"></a>Testing

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

## <a id="security"></a>Security

One of our goals is to ensure Penny Ether can run itself, with very limited input from the owner or admin. Additionally, we've set up the system so that _even if_ an adversary were to gain ownership control (or we turned evil), the damage possible is _severely_ limited.

### Actors

The following actors exist, with their permissions listed:

- **Owner** via `CustodialWallet.sol` _(see above)_
	- Can make changes to the `Registry`, adding or upgrading the following contracts (`TaskManager`, `MonarchyController`, `InstaDice`, `VideoPoker`, and any new contracts)
	- Can change the `Admin` account.
	- Can collect dividends, and transfer vested tokens from `TokenLocker`
	- Can configure the CrowdSale
	- Receives some proceed from the CrowdSale.
	- Can set `dailyLimit` of `TaskManager` and `MonarchyController`

- **Admin**
	- Can configure `TaskManager`, `Monarchy`, `InstaDice`, and `VideoPoker` parameters, within limits.
	- Can issue `Governance Requests` to `Treasury`.

### Scenarios

Let's go over a few scenarios, and their possible impact on PennyEther. Note that the below cases only count _if the DAO has not been instated_. Once the DAO is instated, Token Holders will collectively have full control over all actors.

- **`Admin` account compromised**:
	- Possibilities:
		- The admin could change the settings as listed above. For example, they may increase the reward size for some `Tasks`, or alter the minimum/maximum bets of `InstaDice` and `VideoPoker` (within some limit).
	- Possible Financial Loss:
		- Extremely limited. `dailyLimit`s ensure `MonarchyController` and `TaskManager` do not get drained. Game Controllers may temporarily not take bets due to the changed configuration.
	- Remediation:
		- `Custodian` immediately changes the `Admin` address to a secure one.
		- New `Admin` reverts any changes made.

- **`Custodian` account compromised**:
	- Possibilities:
		- Same as previous case.
		- Can cause all games to not produce revenues.
		- Can cause profits of games to be temporarily sent to another contract.
	- Financial Loss:
		- Same as previous case.
		- Revenues may no longer go to `Treasury`, but to attacker.
	- Remeditation:
		- `Supervisor` immediately changes the `Custodian` address to a secure one.
		- New `Custodian` reverts all changes.
		- Same remediations as previous case.

- **`Supervisor` account compromised**:
	- Possibilities:
		- Same as previous case.
		- Could get all available funds in `CustodialWallet`
	- Financial Loss:
		- Same as previous case.
		- PennyEther loses whatever balance is in `CustodialWallet` (likely not too much)
	- Remediation:
		- `Owner` immediately changes `Supervisor` address to a secure one.
		- Same remediations as previous case.
	- Notes: As noted in `CustodialWallet.sol`, `supervisor` wallet is held in cold storage.

- **`Owner` account compromised**:
	- Possibilities:
		- All of the above, but cannot be remediated.
	- Financial Loss:
		- Same as previous case.
		- All `Capital` will be in control of attacker.
		- All Ether bankrolled to game contracts will be in control of attacker.
	- Remediation:
		- A new `Registry`, `Treasury`, and `Comptroller` can be redeployed, pointing to the existing `PENNY Token`.
		- However, there will be zero capital. It's likely PennyEther team would provide capital, but there's no assurance.
	- Notes: As noted in `CustodialWallet.sol`, `owner` wallet is held in deep cold storage, and will likely never need to be used.

		
### Audits

Though we've thoroughly tested all roles and permissions, our contracts are currently under audit by a third party. We'll post the results here after they are done.