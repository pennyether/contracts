var CopyWebpackPlugin = require('copy-webpack-plugin');
var path = require('path');

module.exports = {
	entry: {
		// this is just here to be watched, below is a rule to copy it.
		"empty": './lib/javascripts/app.js',
		// artifacts.js requires truffle's artifact builds
		"/javascripts/artifacts.js": './lib/javascripts/artifacts.js'
	},
	output: {
    	path: path.resolve(__dirname, './dist'),
    	filename: '[name]'
	},
	plugins: [
		new CopyWebpackPlugin([
			{from: "./lib/javascripts/app.js", to: "./javascripts/app.js"},
			{from: "./lib/javascripts/Playground.js", to: "./javascripts/Playground.js"},
			{from: "./lib/index.html", to: "./"},
			{from: "./lib/stylesheets", to: "./stylesheets"},
			{from: "./lib/images", to: "./images"}
		]),

		// delete the "empty" file
		{apply: function(compiler){
			const fs = require("fs");
			compiler.plugin('done', function() {
				var emptyFile = compiler.options.output.path + "/empty";
			   	fs.unlink(emptyFile, function(err, res){
					if (!err) console.log("Deleted " + emptyFile);
				});
			});
		}}
	]
};