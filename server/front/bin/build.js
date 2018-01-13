"use strict";
const webpack = require("webpack");

const configServer = require("../webpack/production/server");
const configClient = require("../webpack/production/bundle");

webpack(configServer).run(function(err, stats) {
	webpack(configClient).run(function(err, stats) {
	});
});
