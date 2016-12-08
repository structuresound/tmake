import _argv from 'minimist';
import path from 'path';
import _ from 'lodash';

import fs from './fs';

const argv = _argv(process.argv.slice(2));
function homeDir() {
  return process.env[process.profile === 'win32'
      ? 'USERPROFILE'
      : 'HOME'];
}

const runDir = process.cwd();
if (!argv.runDir) {
  argv.runDir = runDir;
}


const npmDir = path.join(path.dirname(fs.realpathSync(__filename)), '../../');
const binDir = path.join(npmDir, 'bin');

console.log('binDir', binDir);

if (!argv.binDir) {
  argv.binDir = binDir;
}
const libDir = path.join(argv.binDir, '../lib');
if (!argv.libDir) {
  argv.libDir = libDir;
}

if (!argv.npmDir) {
  argv.npmDir = npmDir;
}

if (!argv.cachePath) {
  argv.cachePath = 'trie_modules';
}
if (!argv.program) {
  argv.program = 'tmake';
}
if (!argv.userCache) {
  argv.userCache = `${homeDir()}/.tmake`;
}
if (argv.v) {
  if (!argv.verbose) {
    argv.verbose = argv.v;
  }
}

if (process.env.NODE_ENV === 'test' || process.env.LOADED_MOCHA_OPTS) {
  _.extend(argv, {
    npmDir,
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
