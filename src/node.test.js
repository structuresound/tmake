/*  global it describe*/
import path from 'path';
import { assert } from 'chai';
import { contains, check } from 'js-object-tools';

import file from '../lib/file';
import args from '../lib/util/args';
import { Project } from '../lib/node';

describe('node', () => {
  const projectFile = {
    name: 'testConf',
    target: { platform: 'test-platform', endianness: 'BE' },
    environment: {
      HELLO: 'hello',
      WORLD: 'world',
      OPENSSL_VERSION: '1.0.1',
      BSON_BYTE_ORDER:
      { macro: '{target.endianness}', map: { LE: 1234, BE: 4321 } }
    },
    configure: {
      'test-platform': {
        with: 'test-platform-ninja',
        cmd:
        './Configure {TEST_SDK_VERSION} --openssldir=\'/tmp/openssl-{OPENSSL_VERSION}\''
      },
      keyword: 'don\'t run this'
    }
  };
  const node = new Project(projectFile);

  it('creates an object of type Project', () => { assert.ok(check(node, Project)); });
  it('creates folder locations', () => { assert.ok(check(node.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(node.d.includeDirs[0], path.join(args.runDir, 'source'));
    assert.equal(node.d.source, path.join(args.runDir, 'source'));
  });
});
