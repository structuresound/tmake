var ExtractTextPlugin = require("extract-text-webpack-plugin");
var shared = require("./shared");
var paths = require('../paths');


var loaders = [{
	test: /\.css$/,
	loader: ExtractTextPlugin.extract([
		"css-loader"
	])
},
{
	test: /\.scss$/,
	loader: ExtractTextPlugin.extract([
		'css-loader',
		'sass-loader'
	])
},
{
	test: /\.styl$/,
	loader: ExtractTextPlugin.extract([
		'css-loader',
		'stylus-loader'
	]),
}]

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
		path: paths.dev,
		libraryTarget: "commonjs2",
		publicPath: '/'
	},
	module: { loaders: loaders.concat(shared.loaders) },
	resolve: {
		extensions: shared.extensions
	},
	plugins: [new ExtractTextPlugin("[name].css")]
};

module.exports = server;
