require("../js/smocha");

start();

// before("super before", function(){
// 	console.log("in super before.before()...")

// 	return Promise.resolve().then(function(){
// 		console.log("In promise in super before.before");
// 		it("DID A TEST DEFINED IN BEFORE?", function(){
// 			console.log("running test in super before");
// 		});
// 		describe("super before describe", function(){
// 			console.log("in super beofre describe");
// 			it("does something in super before describe", function(){

// 			})
// 		})
// 		it("does something AFTER super before describe", function(){
				
// 		})
// 		describe("super before describe", function(){
// 			console.log("in super beofre describe");
// 			it("does something in super before describe", function(){

// 			})
// 		})
// 	})
// })

describe("DESCRIBE", async function(){
	var count = 0;

	beforeEach("BEFOREEACH", function(){
		count++;
		if (count === 2) throw new Error("beef");
	})

	afterEach("AFTEREACH", function(){

	});

	it("TEST1", function(){

	})

	it("TEST TO BE SKIPPED", function(){

	})

	describe("A describe", function(){
		before("this is a before", function(){
			
		})
		it("a", function(){})
		it("b", function(){ throw new Error("this is an example of a really long error message"); })
		it("c", function(){})
		after("this is a before", function(){
			
		})
	});

	await new Promise(function(res, rej){
		setTimeout(function(){
			it("ND.TESTDEFINED ASYNC", function(){});
			res();
		}, 100);
	})

	describe("NESTED DESCRIBE", async function(){
		before("", function(){
			throw new Error("shit");
		})

		it("ND.TEST1", function(){

		})
		it("ND.TEST2", function(){
			
		})
		describe("describe to be skipped", function(){});
	})

	it("TEST3", function(){

	})
	it("TEST4", function(){

	})

	describe("bla bla bla", function(){

		it("does stuff", function(){

		})

		after("failing after", function(){
			throw new Error("afternnoon");
		})

		return new Promise((res, rej)=>{
			setTimeout(()=>{
				it("does a test defined asychronously", function(){});
				res();
			}, 100)
		})
	})
})

describe("this fails while running", function(){
	it("does stuff", function(){

	})

	return new Promise((res,rej) => {
		setTimeout(() => {
			rej(new Error("I hate pants"))
		}, 100);
	})
})

it("still works after prev desc failed", function(){

})

it("is pretty cool", function(){

})

describe("only do me", function(){
	describe("failed describe", function(){
		throw new Error("fjkdsa");
	})
})

// describe("first describe", function(){
// 	// it("first test", function(){
// 	// 	return new Promise((res, rej)=>{
// 	// 		setTimeout(res, 500);
// 	// 	})
// 	// })

// 	// describe("this one has a before", function(){
// 	// 	before("do stuff before", function(){

// 	// 	})

// 	// 	it("bla", function(){

// 	// 	})

// 	// 	after("do stuff after", function(){
// 	// 		throw new Error("failed (in after)")
// 	// 	})
// 	// })

// 	// it("second test (fails)", function(){
// 	// 	throw new Error("FAILURE REASON!");
// 	// });

// 	// describe("wow, a describe inside a describe...", function(){
// 	// 	console.log("logging from in a describe");
// 	// 	it("fourth test", function(){
// 	// 		console.log("Logging from fourth test");
// 	// 	});
// 	// 	it("fifth test", function(){});
// 	// 	before(function bla(){
// 	// 		it("and it inside a before?", function(){

// 	// 		});
// 	// 	});
// 	// });

// 	// describe("another describe", function(){
// 	// 	it("does test one", function(){

// 	// 	});

// 	// 	return new Promise((res, rej) => {
// 	// 		setTimeout(res, 400);
// 	// 	}).then(function(){
// 	// 		it("waits for test two.", function(){

// 	// 		})	
// 	// 	})
// 	// })
// });

// describe("A", function(){

// 	describe("A.A", function(){
// 		before("", function(){
// 			console.log("A.A.before()...")
// 		})

// 		console.log("A.A");
// 		it("A.A.T1", function(){
// 			this.skip();
// 		});
// 		describe("A.A.A", function(){
// 			console.log("A.A.A");
// 			it("A.A.A.T1", function(){
				
// 			})
// 		});
// 		it("A.A.T2", function(){
			
// 		})
// 	})
// });

// 	it("some test", function(){

// 	});

// 	outerD("B.A", function(){
// 		console.log("B.A");
// 		it("B.A.T1", function(){
			
// 		});
// 		describe("B.A.A", function(){
// 			console.log("B.A.A");
// 			it("B.A.A.T1", function(){
				
// 			})
// 		});
// 		it("B.A.T2", function(){
			
// 		})
// 	})
// })