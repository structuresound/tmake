/*  global it describe*/
import path from 'path';
import {assert} from 'chai';
import {check} from 'js-object-tools';

import fs from '../lib/util/fs';
import argv from '../lib/util/argv';
import {Module} from '../lib/module';

describe('module', () => {
  const config = fs.parseFileSync(path.join(argv.npmDir, '/src/test/libbson.yaml'));
  const module = new Module(config);

  it('creates an object of type Module', () => {
    assert.ok(check(module, Module));
  });

  it('creates folder locations', () => {
    assert.ok(check(module.d, Object));
  });
});
