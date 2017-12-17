In order for metamask to work, you need to:
- `npm install http-server -g` and then `http-server` from the `./dist` folder
	- I think metamask has problems when running from local files... bummer.
- Anytime ABIs are changed, do `node generate_abis.js`.
- When running locally with metamask:
	- anytime you start ganache, log out of metamask, log back in.
	- select main network, then select private network.
	- otherwise there are nonce issues, and sometimes ganache just doenst mine.
	- fucking dumb ass bull shit flushes 3 hours down the toilet.
	- typical ethereum.. things randomly dont work, you dont know why, so
	  you have to go debug the whole fucking stack looking for dumbshit
	  glitches caused by code that doesnt validate shit.  FUCK ETHEREUM.

ARCHITECTURE

- Loader.js loads all scripts that are needed on every page
	- Web3
	- TruffleContract (for now...)
	- jQuery
	- PennyEther object (makes life easier)

- Loader.promise.then(...page's code...)