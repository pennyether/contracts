- Run `npm install` to install webpack and plugins
- Run `npm run webpack` to create app in `./dist` folder, and watch files
- Run `npm install http-server -g` and then `http-server` from the `./dist` folder

Structure:
./images/:
./javascripts/: javascripts used by various html files
	./app.js:  The js for index.html
	./artifacts.js:  Loads JSON for contract-truffle to use.
					 Artifacts includes the ABI as well as deployed addresses.
	./Playground.js:  Small library to generate UI for contract instances
./stylesheets/:
	./styles.css:  Main stylesheet
./index.html:  The app itself
	- this is using CDN versions of web3 and truffle-contract
	- there may be a lot of bugs within those...

Webpack is configured as follows:
- compiles only artifacts.js, everything else is copied.