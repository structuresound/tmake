var webpack = require("webpack");
var shared = require("./shared");
var paths = require('../paths');
var path = require('path');

var loaders = [{
    test: /\.(ttf|eot|otf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: "file-loader?name=[hash].[ext]"
},
{
    test: /\.css$/, loader: 'style-loader!css-loader'
},
{
    test: /\.scss$/, loader: 'style-loader!css-loader!sass-loader'
},
{
    test: /\.styl$/, loader: 'style-loader!css-loader!stylus-loader'
}]

var client = {
    name: "bundle",
    target: "web",
    cache: true,
    entry: {
        "bundle": [
            'react-hot-loader/patch',
            // activate HMR for React

            'webpack-dev-server/client?front/sockjs-node',
            // bundle the client for webpack-dev-server
            // and connect to the provided endpoint

            'webpack/hot/only-dev-server',
            // bundle the client for hot reloading
            // only- means to only hot reload for successful updates

            paths.src + "/client/dev"
            // the entry point of our app
        ]
    },
    output: {
        filename: "[name].js",
        path: paths.dev + '/front',
        publicPath: '/front/'
    },
    module: { loaders: loaders.concat(shared.loaders) },
    resolve: {
        extensions: shared.extensions
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        // enable HMR globally
        new webpack.NamedModulesPlugin(),
        // prints more readable module names in the browser console on HMR updates
        new webpack.NoEmitOnErrorsPlugin()
    ]
};

module.exports = client;
