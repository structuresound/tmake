import path from 'path';

const npmDir = process.cwd();
const runDir = path.join(npmDir, 'tests');
const cacheDir = path.join(npmDir, 'tests_cache');
const binDir = path.join(npmDir, 'bin');

export default {
  npmDir,
  runDir,
  binDir,
  userCache: cacheDir,
  cachePath: "trie_modules",
  pgname: "tmake",
  quiet: true,
  verbose: false,
  test: true,
  yes: true,
  _: []
};
