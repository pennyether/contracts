PennyEth.

/app contains the front-end code. See readme for more info.

General architecture:

REGISTRY

A contract that holds all entries to important addresses. This is set-up on deploy.
If a contract is ever redeployed, the address should be updated here.
Only the owner can change entries.

TREASURY

Holds all the funds, all the time.  All fees get collected here.  Only pays
out to MainController and Token.

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

	- npm install -g ganache-cli
	- ganache-cli
	- probably need to install other things... I've polluted my global NPM at this point
	- truffle test test/PathToTest.js
	- Front-end development is more complicated... see the readme in "/app"