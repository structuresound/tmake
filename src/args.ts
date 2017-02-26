import * as minimist from 'minimist';
import * as path from 'path';
import * as _ from 'lodash';
import * as fs from 'fs';
import { clone, extend } from 'js-object-tools';
import stringify = require('json-stable-stringify');

export interface Args {
  runDir: string;
  npmDir: string;
  binDir: string;
  configDir: string;
  cachePath: string;
  compiler: string;
  program: string;
  verbose: boolean;
  debug: boolean;
  dev: boolean;
  quiet: boolean;
  noDeps: boolean;
  version: boolean;
  f: string;
  force: string;
  v: boolean;
  y: boolean;
  yes: boolean;
  test: boolean;
  userCache: string;
  _: string[];
  environment: any;
}

export const args: Args = <Args>minimist(process.argv.slice(2));
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
const binDir = path.join(npmDir, 'bin');

if (!args.binDir) {
  args.binDir = binDir;
}

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

if (process.env.NODE_ENV === 'test' || process.env.LOADED_MOCHA_OPTS) {
  _.extend(args, {
    npmDir,
    runDir: path.join(npmDir, 'tests'),
    configDir: path.join(npmDir, 'tests'),
    binDir: path.join(npmDir, 'bin'),
    userCache: path.join(npmDir, 'tests_cache'),
    cachePath: 'trie_modules',
    pgname: 'tmake',
    quiet: false,
    verbose: true,
    test: true,
    yes: true,
    _: []
  });
}

export function encode() {
  const cp = clone(args);
  delete cp._
  return new Buffer(stringify(cp)).toString('base64');
}

export function decode(str) {
  const decoded = new Buffer(str, 'base64').toString('ascii');
  const json = JSON.parse(decoded);
  delete json._;
  return json;
}

if (process.env.TMAKE_ARGS) {
  extend(args, decode(process.env.TMAKE_ARGS));
}