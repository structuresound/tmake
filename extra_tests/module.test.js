/*global it describe*/
import path from 'path';
import {assert, expect} from 'chai';
import fs from '../lib/util/fs';
import argv from '../lib/util/argv';
import {check} from 'js-object-tools';
import {Module} from '../lib/module';

describe('module', () => {
  let config = fs.parseFileSync(path.join(argv.npmDir, '/src/test/configurations/libbson.yaml'));
  const module = new Module(config);

  it('creates an object of type Module', () => {
    assert.ok(check(module, Module));
  });

  it('creates folder locations', () => {
    assert.ok(check(module.d, Object));
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
