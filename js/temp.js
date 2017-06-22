require("colors");
web3 = null;
accounts = [];
assert = function(){}

var describe;
var it;
var mainDescribe = {
	msg: "Root Describe",
	describes: [],
	tests: []
};
var curDescribe = mainDescribe;

var describe = function(msg, fn) {
	var newDescribe = {
		msg: msg,
		describes: [],
		tests: []
	};
	curDescribe.describes.push(newDescribe);

	var oldDescribe = curDescribe;
	curDescribe = newDescribe;
	fn();	// any calls here will operate on curDescibe
	curDescribe = oldDescribe;
}
var it = async function(msg, fn) {
	curDescribe.tests.push({
		msg: msg,
		execute: fn
	});
}
var runDescribe = async function(describe, indents){
	if (!indents) indents = 0;
	var indent = (new Array(indents)).join("    ");
	console.log(`${indent}Describe: ${describe.msg}`.bold);
	for (var i=0; i < describe.tests.length; i++){
		var test = describe.tests[i];
		var skipped = false;
		var ctx = {skip: () => { skipped = true }};

		console.log(`${indent}    Running test: ${test.msg}`.bold)
		await Promise.resolve()
			.then(()=>{ return test.execute.call(ctx); })
			.then(
				() => { if (!skipped) console.log(`${indent}    PASSED`.green); },
				() => { if (!skipped) console.log(`${indent}    FAILED`.red); }
			).then( () => { if (skipped) console.log(`${indent}    SKIPPED`.blue); })
	}
	for (var i=0; i < describe.describes.length; i++){
		await runDescribe(describe.describes[i], indents+1);
	}
}

// describe("when A", function(){
// 	it("should bla", function(){});
// 	it("should bla2", function(){});
// });
// describe("when B", function(){
// 	it("should foo", function(){})
// 	it("should bar", function(){})
// })
// runDescribe(mainDescribe);

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at:', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

var createTxTester = require("./tx-tester.js").make(null, function(){});

createTxTester(describe, it)
	.describe("The first describe")
		.it("should do a")
			.wait(2500, "pausing...".yellow)
			.fail()
		.it("should do b")
			.wait(500, "pausing...".yellow)
			.pass()
		.it("should do c")
			.wait(500, "pausing inside of c".yellow)
			.pass()
	.describe("The second describe")
		.it("should do d")
			.wait(500)
			.pass()
		.it ("Should do e")
			.wait(500)
			.pass()
	.describe("The third describe")
		.wait("waiting inside third describe")
		.it("should do f (which fails)")
			.wait(500)
			.fail()
		.it("should do g")
			.wait(500)
			.pass()
	.describe("The fourth describe")
		.it("should do h (which fails)")
			.wait(500)
			.fail()
		.it("should do i")
			.wait(500)
			.pass()
	.endDescribe()
	.wait(500, "about to fail...")
	.fail()
	.ret("RETURN VALUE")
	.start()
	.then(
		(ret)=>{ console.log(`tester finished with ${ret}`.bold.green); },
		(e)=>{ console.log("tester failed".bold.red, e); }
	);
	

runDescribe(mainDescribe);