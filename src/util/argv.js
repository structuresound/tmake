import _argv from 'minimist';
import path from 'path';
import fs from './fs';

const argv = _argv(process.argv.slice(2));
const homeDir = () => process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];


const runDir = process.cwd();
if (argv.runDir == null) { argv.runDir = runDir; }
const binDir = path.dirname(fs.realpathSync(__filename));
if (argv.binDir == null) { argv.binDir = binDir; }
const libDir = path.join(argv.binDir, '../lib');
if (argv.libDir == null) { argv.libDir = libDir; }
const npmDir = path.join(argv.binDir, '../');
if (argv.npmDir == null) { argv.npmDir = npmDir; }

if (argv.cachePath == null) { argv.cachePath = 'trie_modules'; }
if (argv.program == null) { argv.program = 'tmake'; }
if (argv.userCache == null) { argv.userCache = `${homeDir()}/.tmake`; }
if (argv.v) { if (argv.verbose == null) { argv.verbose = argv.v; } }

export default argv;
