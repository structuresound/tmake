var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ExternalsPlugin = require('webpack-externals-plugin');
var webpack = require("webpack");
var shared = require("./shared");
var paths = require('../paths');

var serverLoaders = [];

var server = {
	name: "server",
	cache: true,
	target: "node",
	node: {
		__dirname: false
	},
	externals: [/^[a-z\-0-9]+$/, { "react-dom/server": true }],
	entry: { server: paths.src + "/server/index" },
	output: {
		filename: "[name].js",
		path: paths.prod,
		libraryTarget: "commonjs2",
		publicPath: '/'
	},
	module: { loaders: serverLoaders.concat(shared.loaders) },
	resolve: {
		extensions: shared.extensions
	},
	plugins:[
		new webpack.EnvironmentPlugin(['NODE_ENV']),
		new ExtractTextPlugin("[name].css"),
		new ExternalsPlugin({
			type: 'commonjs2',
			include: __dirname + '/node_modules',
		})
	]
};

module.exports = server;