#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var npmdir = path.dirname(fs.realpathSync(__filename))
var libdir = path.join(npmdir, '../lib');
require(libdir + '/bbt.js').run(argv, npmdir);
