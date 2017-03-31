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
	loader: 'url-loader',
	query: {
		name: 'static/[hash].[ext]',
		limit: 10000,
	}
},
{ test: /\.html$/, loader: "file-loader?name=[name].[ext]" },
{
	test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
	loader: "url-loader",
	query: {
		mimetype: 'application/font-woff',
		limit: 10000,
	}
}
];
