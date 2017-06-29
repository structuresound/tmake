var webpack = require("webpack");
var shared = require("./shared");
var paths = require('../paths');
var path = require('path');

var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ManifestPlugin = require("webpack-manifest-plugin");

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
            'webpack-dev-server/client?bundle/sockjs-node',
            // bundle the client for webpack-dev-server
            // and connect to the provided endpoint

            'webpack/hot/only-dev-server',
            // bundle the client for hot reloading
            // only- means to only hot reload for successful updates

            paths.src + "/dark"
            // the entry point of our app
        ]
    },
    output: {
        filename: "[name].js",
        path: paths.dev + '/theme',
        publicPath: '/theme/'
    },
    module: {
        loaders: loaders.concat(shared.loaders)
    },
    resolve: {
        extensions: shared.extensions
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        // enable HMR globally
        new webpack.NamedModulesPlugin(),
        // prints more readable module names in the browser console on HMR updates
        new webpack.NoEmitOnErrorsPlugin(),
        new ExtractTextPlugin({
            filename: "[chunkhash:8].css",
            allChunks: true
        }),
        new ManifestPlugin({
            fileName: 'theme.json'
        })
    ]
};

module.exports = client;