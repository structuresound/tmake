import _argv from 'minimist';
import path from 'path';
import _ from 'lodash';

import fs from './fs';

const argv = _argv(process.argv.slice(2));
const homeDir = () => process.env[process.profile === 'win32'
    ? 'USERPROFILE'
    : 'HOME'];

const runDir = process.cwd();
if (argv.runDir == null) {
  argv.runDir = runDir;
}
const binDir = path.dirname(fs.realpathSync(__filename));
if (argv.binDir == null) {
  argv.binDir = binDir;
}
const libDir = path.join(argv.binDir, '../lib');
if (argv.libDir == null) {
  argv.libDir = libDir;
}
let npmDir = path.join(argv.binDir, '../');
if (argv.npmDir == null) {
  argv.npmDir = npmDir;
}

if (argv.cachePath == null) {
  argv.cachePath = 'trie_modules';
}
if (argv.program == null) {
  argv.program = 'tmake';
}
if (argv.userCache == null) {
  argv.userCache = `${homeDir()}/.tmake`;
}
if (argv.v) {
  if (argv.verbose == null) {
    argv.verbose = argv.v;
  }
}

if (process.env.NODE_ENV === 'test' || process.env.LOADED_MOCHA_OPTS) {
  npmDir = process.cwd();
  _.extend(argv, {
    npmDir: npmDir,
    libDir: path.join(npmDir, 'lib'),
    runDir: path.join(npmDir, 'tests'),
    binDir: path.join(npmDir, 'bin'),
    userCache: path.join(npmDir, 'tests_cache'),
    cachePath: 'trie_modules',
    pgname: 'tmake',
    quiet: true,
    verbose: false,
    test: true,
    yes: true,
    _: []
  });
}

export default argv;
