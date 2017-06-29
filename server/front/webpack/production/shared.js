var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var webpack = require("webpack");

const ROOT_DIR = path.resolve(__dirname, '..', '..');
exports.BUILD_DIR = path.join(ROOT_DIR, 'production');
exports.APP_DIR = path.join(ROOT_DIR, 'src');
const NODE_MODULES = path.join(ROOT_DIR, 'node_modules')

exports.NODE_MODULES = NODE_MODULES;
exports.ROOT_DIR = ROOT_DIR;
exports.CLIENT_BUILD_DIR = exports.BUILD_DIR
exports.SERVER_BUILD_DIR = exports.BUILD_DIR


exports.extensions = [
	'.webpack.js',
	'.web.js',
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.css',
	'.scss',
	'.styl',
	'.eot',
	'.svg',
	'.ttf',
	'.otf',
	'.woff',
	'.woff2'
]

exports.loaders = [{
	test: /\.ts[x]?$/,
	loaders: ["babel-loader", 'ts-loader?' + JSON.stringify({
		entryFileIsJs: true
	})],
	exclude: NODE_MODULES
}, {
	test: /\.js[x]?$/,
	use: [
		'babel-loader',
	],
	exclude: NODE_MODULES
},
{
	test: /\.css$/,
	loader: ExtractTextPlugin.extract([
		'css-loader'
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
},
{
	test: /\.(jp[e]?g|png|gif|ico)$/i,
	loader: 'url-loader',
	query: {
		name: '[hash:base64:8].[ext]',
		limit: 50000,
	}
},
{ test: /\.html$/, loader: 'file-loader?name=[name].[ext]' },
{
	test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
	loader: 'url-loader',
	query: {
		mimetype: 'application/font-woff',
		name: '[hash:base64:8].[ext]',
		limit: 50000,
	}
}
];