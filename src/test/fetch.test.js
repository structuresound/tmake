/*globals describe it*/
import { expect } from 'chai';
import path from 'path';
import Datastore from 'nedb-promise';
import fs from '../lib/util/fs';
import { stringHash } from '../lib/util/hash';

import testArgv from './testArgv';

const db = new Datastore();

import { helloWorld } from './fixtures';
const platform = require('../lib/platform')(testArgv, helloWorld);
const toolchain = require('../lib/build/toolchain')(testArgv, helloWorld, platform, db);

describe('toolchain', function() {
  this.timeout(120000);
  const ninjaVersion = "v1.7.1";
  const hostChain = toolchain.select({
    ninja: {
      version: ninjaVersion,
      url: "https://github.com/ninja-build/ninja/releases/download/{ninja.version}/ninja-{HOST_PLATFORM}.zip"
    }
  });

  it('can parse toolchain correctly', function() {
    expect(hostChain.ninja.name).to.equal("ninja");
    expect(hostChain.ninja.bin).to.equal("ninja");
    return expect(hostChain.ninja.url).to.equal(`https://github.com/ninja-build/ninja/releases/download/${ninjaVersion}/ninja-${platform.name()}.zip`);
  });

  it('can fetch a zip', () =>
    toolchain.fetch(hostChain)
    .then(function() {
      const ninjaPath = toolchain.pathForTool(hostChain.ninja);
      return expect(fs.existsSync(ninjaPath)).to.equal(true);
    })
  );

  it('cached the zip to the right location', function() {
    const hash = stringHash(hostChain.ninja.url);
    const cachePath = path.join(testArgv.userCache, "cache", hash);
    return expect(fs.existsSync(cachePath)).to.equal(true);
  });

  return it('put the executable in the right place', function() {
    const ninjaPath = toolchain.pathForTool(hostChain.ninja);
    const hash = stringHash(hostChain.ninja.url);
    expect(ninjaPath).to.equal(path.join(testArgv.userCache, "toolchain", "ninja", hash, "ninja"));
    return expect(fs.existsSync(ninjaPath)).to.equal(true);
  });
});
