import { assert, expect } from 'chai';
import 'mocha';
import * as path from 'path';
import * as fs from 'fs';

import { args, defaults, stringHash, Project, Tools, Runtime } from 'tmake-core';

import { TestDb } from './db';


describe('tools', function () {
  const ninjaVersion = 'v1.7.1';

  const v171Checksums = {
    linux: 'e3defdd347f045a15343255b13529ab0',
    mac: '9d0c46a1ff1ad7dea95b0814e6919d84'
  }

  var configuration: TMake.Configuration;
  var hostChain: TMake.Tools;

  this.timeout(120000);

  before(() => {
    Runtime.init(new TestDb());
    const project = new Project({ name: 'tools-test' });
    configuration = project.parsed.configurations[0];
    hostChain = defaults.host.tools;
  });

  it('can parse tools correctly', () => {
    expect(defaults.host.tools.ninja.name)
      .to
      .equal('ninja');
    expect(hostChain.ninja.bin)
      .to
      .equal(path.join(args.homeDir, 'toolchain/ninja', v171Checksums[defaults.host.platform], 'ninja'));
    return expect(hostChain.ninja.url)
      .to
      .equal(`https://github.com/ninja-build/ninja/releases/download/${ninjaVersion}/ninja-${defaults.host.platform}.zip`);
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
