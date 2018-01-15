#!/usr/bin/env node

const path = require('path');
Smocha = require("./smocha");
(new Smocha()).run();

function dummyPromise(){
	return new Promise((res,rej)=>{
		setTimeout(res, 10);
	});
}

describe("Some cool features", async function(){
	before("Before can have nested describe/its", function(){
		describe("I'm a describe", function(){
			it("Test 1", function(){
				console.log("console.logs() get nested!");
			});
			it("Test 2", function(){});
		});
		it("An it, sibling of describe. No problem here.", function(){})
	});

	await dummyPromise();
	describe("This describe was created after awaiting for a promise.", function(){
		it("It's can have children its. Why not?", function(){
			it("Child it #1", function(){});
			it("Child it #2", function(){});
		});
	});

	afterEach("This is an afterEach", function(){});
});

describe("testing before/after", function(){
	before("i fail, so everything else should skip.", function(){
		throw new Error("Error message in 'before'");
	});
	after("i should get skipped", function(){})

	describe("I should not run because before failed.", function(){
		it("bla", function(){})
		it("bla", function(){})
		it("bla", function(){})
	})

	it("I should get skipped as well", function(){})
});

describe("this beforeEach fails", function(){
	before("good before", function(){})
	beforeEach("before each fails", function(){
		throw new Error("FAIL!")
	});
	it("this should get skipped", function(){})
	it("this should get skipped", function(){})
	it("this should get skipped", function(){})
	afterEach("this afterEach should get skipped", function(){})
	after("after should get run", function(){})
});

describe("This has its that skip", function(){
	before("some before", function(){
		console.log("I'm an example of logging from within before");
	});
	it("logs stuff", function(){
		console.log("hello from inside it");
		it("I'm a test that fails", function(){
			console.log("hello from inside nested it");
			throw new Error("crap");
		});
	})
	it("I will call skip internally.", function(){
		this.skip("calling skip internally")
	})
	after("the after", function(){
		console.log("logging from inside after");
	})
})

describe("Only works relative to nested elements, and multiple can have .only", function(){
	describe("I should be skipped", function(){});
	describe.only("I should not be skipped", function(){
		it("I should be skipped", function(){})
		it.only("I should not be skipped", function(){})
		it.only("I should not skipped", function(){})
		it("I should be skipped", function(){})
	});
	describe("I should be skipped", function(){});
})

describe("This beforeEach will fail on the second run.", async function(){
	var count = 0;

	beforeEach("I'll fail the second run.", function(){
		count++;
		if (count === 2) throw new Error("beef");
	})

	afterEach("I'm afterEach", function(){});

	it("Test 1", function(){})

	it("Test 2 should skip, because beforeEach fails", function(){})

	it("This test uses 'done' callback", function(done) {
		setTimeout(done, 500);
	});
	it("This test uses 'done' callback to fail.", function(done) {
		done(12345);
	});
	it("This test uses 'done' callback and passes an Error", function(done) {
		done(new Error("I hope the stacktrace is here."));
	});
	it("This test uses 'done' callback, but returns a value (so should fail)", function(done) {
		setTimeout(done, 500);
		return Promise.resolve();
	});
	it("This test returns a failed promise, so it should fail", function() {
		return Promise.reject(new Error("I'm a failure."));
	});

	await new Promise(function(res, rej){
		setTimeout(function(){
			it("I'm an it that got defined after a setTimeout", function(){});
			res();
		}, 100);
	});
})

describe("This describe fails after defining an it.", function(){
	it("I should never be run", function(){
		console.log("I SHOULDNT BE DISPLAYED");
	})

	return new Promise((res,rej) => {
		setTimeout(() => {
			rej(new Error("I hate pants"))
		}, 100);
	})
});