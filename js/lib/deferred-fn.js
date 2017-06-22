// creates a promise with a "resolve()" and "reject()" function
// resolve(v): resolves with fn(), v, or nothing
// reject(e): fails it with e
function createDeferredFn(fn) {
	var resolve;
	var onResolve;

	var p = new Promise((res, rej) => resolve = res)
		.then(()=>{ return onResolve(); });

	p.resolve = function(v) { 
		onResolve = () => { return fn ? fn(v) : v }
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