var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ManifestPlugin = require("webpack-manifest-plugin");
var webpack = require("webpack");

var paths = require('../paths');
var shared = require("./shared");
var bundleLoaders = [];

var bundle = {
	context: paths.src,
	devtool: 'cheap-module-source-map',
	entry: {
		bundle: [paths.src + "/client/production"]
	},
	output: {
		filename: "[chunkhash:8].js",
		chunkFilename: '[name].[chunkhash:8].js',
		path: paths.prod + '/front',
		publicPath: '/front/'
	},
	module: { loaders: bundleLoaders.concat(shared.loaders) },
	resolve: {
		extensions: shared.extensions
	},
	plugins: [
		new webpack.EnvironmentPlugin(['NODE_ENV']),
		new webpack.optimize.UglifyJsPlugin({ compress:{ warnings: false } }),
		new ExtractTextPlugin({
			filename: "[chunkhash:8].css",
			allChunks: true
		}),
		new ManifestPlugin({
			fileName: 'bundle.json'
		})
	]
};

module.exports = bundle;