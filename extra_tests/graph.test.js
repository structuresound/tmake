/*global it describe*/
import path from 'path';
import {assert, expect} from 'chai';

import argv from '../lib/util/argv';
import {check} from 'js-object-tools';
import {graph} from '../lib/graph';
import {helloWorld} from './fixtures';

import {Profile} from '../lib/profile';

describe('graph', () => {
  const profile = new Profile(helloWorld);
  let modules;
  let rootModule;
  before(() => {
    return graph(profile.conf).then((res) => {
      modules = res;
      rootModule = modules[modules.length - 1];
      return Promise.resolve(rootModule);
    })
  });

  it('has a root module', () => {
    assert.ok(check(rootModule, Object));
  });

  it('build list has root + deps(root) length', () => {
    assert.equal(modules.length, helloWorld.deps.length + 1);
  });

  it('build list puts root dep last (order)', () => {
    assert.equal(rootModule.name, helloWorld.name);
  });

  it('calculates folder locations', () => {
    assert.ok(check(rootModule.d, Object));
  });

  it('source/include', () => {
    assert.equal(rootModule.d.include, path.join(argv.runDir, `${argv.cachePath}/${rootModule.name}/source/include`));
  });
  // it('dynamic includeDirs', () => {
  //   return resolve(depB).then(resolved => {
  //     return expect(resolved.d.includeDirs)
  //       .to
  //       .deep
  //       .equal([path.join(argv.runDir, `${testArgv.cachePath}/${helloWorld.name}/testIncludeDir`)]);
  //   });
  // });
});
