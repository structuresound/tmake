/*global it describe*/
import path from 'path';
import {assert} from 'chai';
import {check} from 'js-object-tools';

import argv from '../lib/util/argv';
import {graph} from '../lib/graph';
import {helloWorld} from './fixtures';

import {Module} from '../lib/module';

describe('graph', () => {
  let modules;
  let rootModule;
  before(() => {
    return graph(helloWorld).then((res) => {
      modules = res;
      rootModule = modules[modules.length - 1];
      return Promise.resolve(rootModule);
    });
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

  it('install', () => {
    assert.equal(rootModule.d.includeDirs[0], path.join(argv.runDir, 'source'));
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
