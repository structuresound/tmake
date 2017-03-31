var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ManifestPlugin = require("webpack-manifest-plugin");
var webpack = require("webpack");
var shared = require("./shared");

var VENDOR_PATH = shared.NODE_MODULES;

var vendorLoaders = [];

var vendor = {
	name: "bundle",
	target: "web",
	cache: true,
	entry: {
		vendor: [shared.APP_DIR + "/client/vendor"],
	},
	output: {
		filename: "[chunkhash:8].js",
		path: shared.BUILD_DIR + '/front',
		pathinfo: false,
		libraryTarget: 'umd'
	},
	module: { loaders: vendorLoaders.concat(shared.loaders) },
	resolve: {
		extensions: shared.extensions,
        alias: {
			'jquery': VENDOR_PATH + '/jquery/dist/jquery.min.js',
			'bluebird': VENDOR_PATH + '/bluebird/js/browser/bluebird.min.js',
			'js-yaml': VENDOR_PATH + '/js-yaml/dist/js-yaml.min.js',
            'react': VENDOR_PATH + '/react/dist/react-with-addons.min.js',
			'redux': VENDOR_PATH + '/redux/dist/redux.min.js',
            'react-dom': VENDOR_PATH + '/react-dom/dist/react-dom.min.js',
			'react-bootstrap': VENDOR_PATH + '/react-bootstrap/dist/react-bootstrap.min.js',
            'react-router': VENDOR_PATH + '/react-router/umd/ReactRouter.min.js',
			'react-redux': VENDOR_PATH + '/react-redux/dist/react-redux.min.js',
			'react-router-redux': VENDOR_PATH + '/react-router-redux/dist/ReactRouterRedux.min.js'
        }
	},
	plugins: [
		new webpack.optimize.OccurrenceOrderPlugin(),
		new ManifestPlugin({
			fileName: 'vendor.json'
		})
	]
};

module.exports = vendor;