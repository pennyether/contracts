var CopyWebpackPlugin = require('copy-webpack-plugin');
var path = require('path');

module.exports = {
	entry: {
		"/javascripts/artifacts.js": './lib/javascripts/artifacts.js'
	},
	output: {
    	path: path.resolve(__dirname, './dist'),
    	filename: '[name]'
	},
	plugins: [
		// copy everything from ./lib, but ignore files we actually want compiled.
		new CopyWebpackPlugin([
			{
				from: "./lib",
				to: "./",
				ignore: "javascripts/artifacts.js"
			},
		]),
	]
};