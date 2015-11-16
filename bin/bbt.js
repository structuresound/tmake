#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../build');
require(lib + '/bbt').run(argv);
