# SMOCHA

Smocha is like Mocha, mostly, but allows you to test things asynchronously, and allows you to nest things however you wish. 

## Features

- Use and define `describe`, `it`, etc, *asynchronously*.
- Nest statements however you'd like.
- Supports `.skip` and `.only`
- Supports `done()` callback function, or just return a promise.
- Console logging is automatically indented.
- Lots of pretty logging.

## Usage

`file`, `describe`, and `it`, `before`, etc, can all accept async functions, and can be nested however you'd like.

This means you can insert "its" in an asynchronous fashion:

```
describe("Does stuff", async function(){
	// Notice this is an async function.
	// You can define it() in here, and it will actually work.
	// Regular mocha doesn't allow this.
	const foo = await somePromise();
	it("uses foo", function(){
		// you can use foo in here.
	});

	// you can also have describe and it be siblings.
	describe("something involved", function(){ /* stuff */ });
	await somePromise();
	it("something else", function(){ /* code */ });
});
```

*See `./smochatest.js` for a ton of examples.*

## Logger

Smocha dumps everything to the Smocha.logger object, which can be configured in a variety of ways.  The default uses lots of colors and stuff. You can change this to suit your needs.

## (Almost) No Dependencies

Smocha is written in vanilla js. `smocha/logger.js` uses the "colors" library. That's all.

## Notes

Smocha cannot currently be used as a drop-in for Mocha. We haven't yet dug into the internals of Mocha and made Smocha compatibile.