import { join, dirname } from 'path';
import { realpathSync } from 'fs';
import { args, Runtime } from '../src';

const npmDir = join(dirname(realpathSync(__filename)), '../');
Runtime.init({
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
});

export { args }