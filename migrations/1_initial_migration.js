var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
	deployer.then(async function(){
		console.log("Executing initial migration...");
		await deployer.deploy(Migrations);
		console.log("Done");
	});
};
