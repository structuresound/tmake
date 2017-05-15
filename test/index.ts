import { join, dirname } from 'path';
import { realpathSync } from 'fs';
import { Runtime } from 'tmake-core';

import { Db } from 'cli/src/db';

const npmDir = join(dirname(realpathSync(__filename)), '../');
const options = {
  npmDir,
  runDir: join(npmDir, 'tests'),
  configDir: join(npmDir, 'tests'),
  binDir: join(npmDir, 'bin'),
  settingsDir: join(npmDir, 'settings'),
  userCache: join(npmDir, 'tests_cache'),
  cachePath: 'trie_modules',
  quiet: false,
  verbose: true,
  test: true,
  yes: true,
  _: []
}

Db.init(options);
const args = Runtime.init(options);

export { args };