PennyEth.

/app contains the front-end code. See readme for more info.

General architecture:

COMPTROLLER / DIVIDENDTOKEN / LOCKER

For security, are unaware of the registry.
Comptroller:
	- Does nothing until treasury is set (once) by owner.
	- Mints/Burns tokens, keeps PennyEther ownership at 20%
Token:
	- Token that splits up deposits to token holders


REGISTRY

A contract that holds all entries to important addresses. This is set-up on deploy.
If a contract is ever redeployed, the address should be updated here.
Only the owner can change entries.

Holds:
	- Owner
	- Admin
	- Treasury
	- MainController
	- GameControllers
	- PennyAuctionFactory

TREASURY

Holds all the funds, all the time.  All fees get collected here.  Only pays
out to MainController and Token (if set).

MAIN CONTROLLER

Interfaces with game controllers to:
	- refresh statuses of games
	- reward users for the above

GAME CONTROLLER (eg: PENNYAUCTIONCONTROLLER)

	- manages instances of games
	- allows games to be started, stopped, have feescollected
	- everything is callable by everyone

GAMES
	FACTORY
		Contains code to create a new instance of the game.
		Will use getTreasury() to determine where funds go.
	GAME
		Code for the game itself.

To develop:

	- Set up truffle... good luck with that.  I've been using an old version of truffle.
		- I've edited some truffle files to work with smocha... you can search truffle
		  codebase to replease "Mocha" with "Smocha" and you should be fine.
	- npm install -g ganache-cli
	- ganache-cli
	- probably need to install other things... I've polluted my global NPM at this point
	- truffle test test/PathToTest.js
	- Front-end development is more complicated... see the readme in "/app"

Notes:

	- truffle compiles by passing a "runs" paramater to solcjs. This parameter tells the
	  optimizer to optimize against a certain number of "runs" of the contract... 0
	  represents never running the contract, 1000 represents calling it 1,000 times, etc.
	  Now, etherscan validates against a value of 200.  There's a separate page that
	  can allow you to enter a custom value here: 
	  Anyway, you can change truffle's default by finding wherever the fuck it is
	  installed (/usr/local/bin/lib/node_modules/trufflesuit/node_modules/truffle-compile)
	  and changing the value there.