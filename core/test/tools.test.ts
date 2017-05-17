import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';

import { args,stringHash, Project, Tools } from '../src';

describe('tools', function () {
  const project = new Project({ name: 'tools-test' });
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
      .equal(path.join(args.homeDir, 'toolchain/ninja', '9d0c46a1ff1ad7dea95b0814e6919d84', 'ninja'));
    return expect(hostChain.ninja.url)
      .to
      .equal(`https://github.com/ninja-build/ninja/releases/download/${ninjaVersion}/ninja-${env.environment.host.platform}.zip`);
  });

  it('can fetch a zip', () => {
    return Tools.fetch(hostChain).then(() => {
      const ninjaPath = Tools.pathForTool(hostChain.ninja);
      return expect(fs.existsSync(ninjaPath))
        .to
        .equal(true);
    });
  });

  it('cached the zip to the right location', () => {
    const hash = stringHash(hostChain.ninja.url);
    const cachePath = path.join(args.homeDir, 'cache', hash);
    return expect(fs.existsSync(cachePath))
      .to
      .equal(true);
  });

  return it('put the executable in the right place', () => {
    const ninjaPath = Tools.pathForTool(hostChain.ninja);
    const hash = stringHash(hostChain.ninja.url);
    expect(ninjaPath)
      .to
      .equal(path.join(args.homeDir, 'toolchain', 'ninja', hash, 'ninja'));
    return expect(fs.existsSync(ninjaPath))
      .to
      .equal(true);
  });
});
