import { join, dirname } from 'path';
import { realpathSync } from 'fs';
import { initArgs } from 'tmake-core';

const npmDir = join(__dirname, '../');
initArgs({
  npmDir,
  runDir: join(npmDir, 'tests'),
  configDir: join(npmDir, 'tests'),
  binDir: join(npmDir, 'bin'),
  settingsDir: join(npmDir, 'settings'),
  userCache: join(npmDir, 'tests_cache'),
  cachePath: 'trie_modules',
  pgname: 'tmake',
  quiet: false,
  verbose: true,
  test: true,
  yes: true,
  _: []
});