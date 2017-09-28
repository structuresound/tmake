var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var paths = require('../paths');

exports.extensions = [
	".webpack.js",
	".web.js",
	".ts",
	".tsx",
	".js",
	".jsx",
	".css",
	".scss",
	".styl",
	".eot",
	".svg",
	".ttf",
	".otf",
	".woff",
	".woff2"
]

exports.loaders = [{
		test: /\.ts[x]?$/,
		loaders: ["babel-loader", 'ts-loader?' + JSON.stringify({
			entryFileIsJs: true
		})],
		exclude: paths.modules
	}, {
		test: /\.js[x]?$/,
		use: [
			'babel-loader',
		],
		exclude: paths.modules
	},
	{
		test: /\.(jp[e]?g|png|gif|ico)$/i,
		loader: 'file-loader',
		query: {
			name: 'static/[hash:base64:8].[ext]'
		}
	},
	{
		test: /\.html$/,
		loader: "file-loader?name=[name].[ext]"
	},
	{
		test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		loader: 'file-loader',
		query: {
			name: '[hash:base64:8].[ext]',
			mimetype: 'application/font-woff'
		}
	}
];