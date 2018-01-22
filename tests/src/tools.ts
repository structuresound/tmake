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

  this.timeout(120000);


  let host: TMake.Host;
  let ninja: TMake.Tool;
  let configuration: TMake.Configuration; 

  before(() => {
    Runtime.init({database: new TestDb()});

    const project = new Project({ name: 'tools-test' });

    host = defaults.environment.host;
    ninja = defaults.environment.tools.ninja;
    configuration = project.parsed.platforms[host.name][host.architecture];

  });

  it('can parse tools correctly', () => {
    assert.isOk(ninja);
    expect(ninja.name)
      .to
      .equal('ninja');
    expect(ninja.bin)
      .to
      .equal(path.join(args.homeDir, 'toolchain/ninja', v171Checksums[host.name], 'ninja'));
    return expect(ninja.url)
      .to
      .equal(`https://github.com/ninja-build/ninja/releases/download/${ninjaVersion}/ninja-${host.name}.zip`);
  });

  it('can fetch a zip', () => {
    assert.isOk(ninja);
    return Tools.fetch(ninja).then((path) => {
      return expect(fs.existsSync(path))
        .to
        .equal(true);
    });
  });

  it('cached the zip to the right location', () => {
    const hash = stringHash(ninja.url);
    const cachePath = path.join(args.homeDir, 'cache', hash);
    return expect(fs.existsSync(cachePath))
      .to
      .equal(true);
  });

  return it('put the executable in the right place', () => {
    assert.isOk(ninja);
    const ninjaPath = Tools.pathForTool(ninja);
    const hash = stringHash(ninja.url);
    expect(ninjaPath)
      .to
      .equal(path.join(args.homeDir, 'toolchain', 'ninja', hash, 'ninja'));
    return expect(fs.existsSync(ninjaPath))
      .to
      .equal(true);
  });
});
