// Creates a promise with a "resolve()" and "reject()" function
// Upon resolving, will execute the initally passed function.
// Additional Methods:
//  - resolve(...): resolves with fn(...), ...[0], or nothing
//  - reject(e): fails it with e
function createDeferredFn(fn) {
	var resolve;
	var onResolve;

	var p = new Promise((res, rej) => resolve = res)
		.then(()=>{ return onResolve(); });

	p.resolve = function() { 
		var args = arguments;
		onResolve = () => { return fn ? fn.apply(null, args) : args[0] }
		resolve();
		return p;
	};
	p.reject = (e) => {
		onResolve = () => { throw e };
		resolve();
		return p;
	};
	return p;
}

module.exports = createDeferredFn;