import {expect} from 'chai';
import path from 'path';

import argv from '../lib/util/argv';
import fs from '../lib/util/fs';
import {stringHash} from '../lib/util/hash';
import {Profile} from '../lib/profile';
import {fetch as fetchToolchain, pathForTool} from '../lib/toolchain';

describe('toolchain', function mocha() {
  const profile = new Profile({});

  this.timeout(120000);
  const hostChain = profile.selectToolchain();
  const ninjaVersion = 'v1.7.1';

  it('can parse toolchain correctly', () => {
    expect(hostChain.ninja.name)
      .to
      .equal('ninja');
    expect(hostChain.ninja.bin)
      .to
      .equal('ninja');
    return expect(hostChain.ninja.url)
      .to
      .equal(`https://github.com/ninja-build/ninja/releases/download/${ninjaVersion}/ninja-${profile.host.platform}.zip`);
  });

  it('can fetch a zip', () => {
    return fetchToolchain(hostChain).then(() => {
      const ninjaPath = pathForTool(hostChain.ninja);
      return expect(fs.existsSync(ninjaPath))
        .to
        .equal(true);
    });
  });

  it('cached the zip to the right location', () => {
    const hash = stringHash(hostChain.ninja.url);
    const cachePath = path.join(argv.userCache, 'cache', hash);
    return expect(fs.existsSync(cachePath))
      .to
      .equal(true);
  });

  return it('put the executable in the right place', () => {
    const ninjaPath = pathForTool(hostChain.ninja);
    const hash = stringHash(hostChain.ninja.url);
    expect(ninjaPath)
      .to
      .equal(path.join(argv.userCache, 'toolchain', 'ninja', hash, 'ninja'));
    return expect(fs.existsSync(ninjaPath))
      .to
      .equal(true);
  });
});
