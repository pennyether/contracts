require("../js/mocha-lite");

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

describe("first describe", function(){
	it("first test", function(){
		return new Promise((res, rej)=>{
			setTimeout(res, 500);
		})
	})

	describe("this one has a before", function(){
		before("do stuff before", function(){

		})

		it("bla", function(){

		})

		after("do stuff after", function(){

		})
	})

	it("second test (fails)", function(){
		throw new Error("FAILURE REASON!");
	});

	describe("wow, a describe inside a describe...", function(){
		it("fourth test", function(){});
		it("fifth test", function(){});
		before("before fn", function(){
			it("and it inside a before?", function(){

			});
		});
	});

	it("third test", function(){
		afterEach("afterEach", function(){

		})
		beforeEach("beforeEach", function(){
			
		})
		it("what???", function(){

		})
	})

	describe("another describe", function(){
		it("does test one", function(){

		});

		return new Promise((res, rej) => {
			setTimeout(res, 400);
		}).then(function(){
			it("waits for test two.", function(){

			})	
		})
	})
});

describe("another describe", function(){
	before("my name is before", function(){
		throw new Error("some error inside a before");
	})

	describe("two", function(){
		it("three", function(){

		})
	})


})

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