PennyEth.

/app contains the front-end code. See readme for more info.

General architecture:

REGISTRY

A contract that holds all entries to important addresses. This is set-up on deploy.
If a contract is ever redeployed, the address should be updated here.
Only the owner can change entries.

TREASURY

Holds all the funds, all the time.  All fees get collected here.  Can be redeemed
by owner only.

MAIN CONTROLLER

Interfaces with game controllers to:
	- create / complete games
	- collect fees

GAME CONTROLLER (eg: PENNYAUCTIONCONTROLLER)

Can be called by MainController to:
	- start a new game
	- update game statuses (includes closing / redeeming collecting fees)
	- keep record of active and closed games

GAMES
	FACTORY
		Contains code to create a new instance of the game
	GAME
		Code for the game itself

To develop:

	- open testrpc
	- you can do truffle test to see all the beautiful tests