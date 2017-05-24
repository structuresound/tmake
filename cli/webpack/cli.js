var webpack = require('webpack');
var path = require('path');
var nodeExternals = require('webpack-node-externals');

const ROOT_DIR = path.resolve(__dirname, '..');

var paths = {
  root: ROOT_DIR,
  prod: path.join(ROOT_DIR, 'bin', 'dist'),
  src: path.join(ROOT_DIR, 'src'),
  modules: path.join(ROOT_DIR, 'node_modules')
}

var cli = {
  name: "cli",
  cache: true,
  target: "node",
  node: {
    __dirname: false
  },
  externals: [
    // nodeExternals({
    //   whitelist: ['tmake-core']
    // })
    'ajv',
    'any-promise',
    'lzma-native',
    'pify',
    'read-chunk',
    'unzip',
  ],
  entry: {
    cli: path.join(paths.src, "cli.ts")
  },
  output: {
    filename: "[name].js",
    path: paths.prod,
    libraryTarget: "commonjs2"
  },
  module: {
    loaders: [{
      test: /\.ts[x]?$/,
      loaders: ["babel-loader", 'ts-loader?' + JSON.stringify({
        entryFileIsJs: true
      })],
      exclude: paths.modules
    }, {
      test: /\.js[x]?$/,
      loaders: [
        'babel-loader'
      ],
      exclude: paths.modules
    }]
  },
  resolve: {
    extensions: [
      ".ts",
      ".js"
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true
      }
    })
  ]
};

module.exports = cli;