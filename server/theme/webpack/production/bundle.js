var webpack = require("webpack");
var shared = require("./shared");
var paths = require('../paths');
var path = require('path');

var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ManifestPlugin = require("webpack-manifest-plugin");
var md5Plugin = require("webpack-md5-hash");
var loaders = [{
        test: /\.(ttf|eot|otf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
        query: {
            name: '[hash:base64:8].[ext]',
        }
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
    }
]

var client = {
    name: "bundle",
    target: "web",
    cache: true,
    entry: {
        dark: [
            paths.src + "/dark"
        ]
    },
    output: {
        filename: "[name].js",
        path: paths.prod + '/theme',
        publicPath: '/theme/'
    },
    module: {
        loaders: loaders.concat(shared.loaders)
    },
    resolve: {
        extensions: shared.extensions
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new ExtractTextPlugin({
            filename: "[chunkhash].css",
            allChunks: true
        }),
        new md5Plugin(),
        new ManifestPlugin({
            fileName: 'theme.json'
        })
    ]
};

module.exports = client;