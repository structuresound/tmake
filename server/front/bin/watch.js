"use strict";
const yaml = require('js-yaml');
const fs = require('fs');
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");

const configServer = require("../webpack/dev/server");
const configClient = require("../webpack/dev/bundle");

const settingsPath = 'settings.yaml';
let settings;

try {
	settings = yaml.load(fs.readFileSync(settingsPath, 'utf8'));
} catch (e) {
	console.log('error reading settings file @',
		process.cwd() + '/' + settingsPath);
	console.log(e.message);
	settings = {
		private: {
			express: { domain: 'localhost', https: false, port: 3000 },
		},
		webpack: {
			dev: {
				server: {
					domain: 'localhost',
					port: 3001,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
						"Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
					}
				}
			}
		}
	}
}

var options = {
	// cached: true,
	// colors: true
};

new WebpackDevServer(webpack(configClient), {
	historyApiFallback: true,
	hot: true,
	stats: options
}).listen(settings.webpack.dev.server.port, settings.webpack.dev.server.domain, function (err) {
	var urlString = settings.webpack.dev.server.domain + ':' + settings.webpack.dev.server.port;
	if (err)
		console.log(err);
	console.log("Webpack Server launched with at " + urlString + " (Hot Module Replacement [HMR] enabled)");
});

webpack(configServer).watch({}, function (err, stats) {
	if (err) return console.error(err.message);
	console.log('rebuilt node server')
});
