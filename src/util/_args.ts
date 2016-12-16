import * as minimist from 'minimist';
import * as path from 'path';
import * as _ from 'lodash';
import * as fs from 'fs';

interface Args {
  runDir: string;
  npmDir: string;
  binDir: string;
  libDir: string;
  cachePath: string;
  compiler: string;
  program: string;
  verbose: boolean;
  quiet: boolean;
  forceAll: boolean;
  nodeps: boolean;
  force: string;
  v: boolean;
  y: boolean;
  yes: boolean;
  test: boolean;
  userCache: string;
  _: string[];
}

const args: Args = <Args>minimist(process.argv.slice(2));
function homeDir() {
  return process.env[process.platform === 'win32'
      ? 'USERPROFILE'
      : 'HOME'];
}

const runDir = process.cwd();
if (!args.runDir) {
  args.runDir = runDir;
}


const npmDir = path.join(path.dirname(fs.realpathSync(__filename)), '../../');
const binDir = path.join(npmDir, 'bin');

console.log('binDir', binDir);

if (!args.binDir) {
  args.binDir = binDir;
}
const libDir = path.join(args.binDir, '../lib');
if (!args.libDir) {
  args.libDir = libDir;
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

if (process.env.NODE_ENV === 'test' || process.env.LOADED_MOCHA_OPTS) {
  _.extend(args, {
    npmDir,
    libDir: path.join(npmDir, 'lib'),
    runDir: path.join(npmDir, 'tests'),
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

export default args;