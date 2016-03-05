#!/usr/bin/env node
require('source-map-support').install();

var path = require('path');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var binDir = path.dirname(fs.realpathSync(__filename))
var libDir = path.join(binDir, '../lib');
var npmDir = path.join(binDir, '../');
require(libDir + '/bbt.js')(argv, binDir, npmDir).run();
process.stdout.on('error', function(err){
  console.log("terminating on error", err)
  process.exit()
});
