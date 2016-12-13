/*  global it describe*/
import path from 'path';
import {assert} from 'chai';
import {check} from 'js-object-tools';

import file from '../lib/util/file';
import args from '../lib/util/args';
import {Node} from '../lib/node';

describe('module', () => {
  const config = file.parseFileSync(path.join(args.npmDir, '/src/test/libbson.yaml'));
  const module = new Node(config);

  it('creates an object of type Node', () => {
    assert.ok(check(module, Node));
  });

  it('creates folder locations', () => {
    assert.ok(check(module.d, Object));
  });
});
