import * as minimist from 'minimist';
import * as path from 'path';
import * as _ from 'lodash';
import * as fs from 'fs';
import { clone, extend } from 'typed-json-transform';
import stringify = require('json-stable-stringify');

import {initArgs, decodeArgs} from 'tmake-core';

export const args = <TMake.Args>minimist(process.argv.slice(2));

function homeDir() {
  return process.env[process.platform === 'win32'
    ? 'USERPROFILE'
    : 'HOME'];
}

const runDir = process.cwd();
if (!args.runDir) {
  args.runDir = runDir;
}
if (!args.configDir) {
  args.configDir = args.runDir;
}

const npmDir = path.join(path.dirname(fs.realpathSync(__filename)), '../');
const settingsDir = path.join(npmDir, 'settings');

if (!args.npmDir) {
  args.npmDir = npmDir;
}

if (!args.cachePath) {
  args.cachePath = 'trie_modules';
}
if (!args.program) {
  args.program = 'tmake';
}
if (!args.userCache) {
  args.userCache = `${homeDir()}/.tmake`;
}
if (args.v) {
  if (!args.verbose) {
    args.verbose = args.v;
  }
}
if (args.f) {
  args.force = 'all';
}

if (process.env.TMAKE_ARGS) {
  extend(args, decodeArgs(process.env.TMAKE_ARGS));
}

initArgs(args);