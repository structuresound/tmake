import {expect} from 'chai';
import path from 'path';
import fs from 'fs';

import args from '../lib/util/args';
import {stringHash} from '../lib/util/hash';
import {Project} from '../lib/node';
import {fetch as fetchToolchain, pathForTool} from '../lib/tools';

describe('tools', function () {
  const project = new Project({name: 'tools-test'});
  const env = project.environments[0];

  this.timeout(120000);
  const hostChain = env.tools;
  const ninjaVersion = 'v1.7.1';

  it('can parse tools correctly', () => {
    expect(hostChain.ninja.name)
      .to
      .equal('ninja');
    expect(hostChain.ninja.bin)
      .to
      .equal('ninja');
    return expect(hostChain.ninja.url)
      .to
      .equal(`https://github.com/ninja-build/ninja/releases/download/${ninjaVersion}/ninja-${env.host.platform}.zip`);
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
    const cachePath = path.join(args.userCache, 'cache', hash);
    return expect(fs.existsSync(cachePath))
      .to
      .equal(true);
  });

  return it('put the executable in the right place', () => {
    const ninjaPath = pathForTool(hostChain.ninja);
    const hash = stringHash(hostChain.ninja.url);
    expect(ninjaPath)
      .to
      .equal(path.join(args.userCache, 'toolchain', 'ninja', hash, 'ninja'));
    return expect(fs.existsSync(ninjaPath))
      .to
      .equal(true);
  });
});
