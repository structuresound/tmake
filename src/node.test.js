/*  global it describe*/
import path from 'path';
import {assert} from 'chai';
import {diff, check} from 'js-object-tools';

import file from '../lib/util/file';
import args from '../lib/util/args';
import {Node, keywords} from '../lib/node';

describe('node', () => {
  const projectFile = {
    name: 'testConf',
    target: {platform: 'test-platform', endianness: 'BE'},
    environment: {
      HELLO: 'hello',
      WORLD: 'world',
      OPENSSL_VERSION: '1.0.1',
      BSON_BYTE_ORDER:
          {macro: '{target.endianness}', map: {LE: 1234, BE: 4321}}
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
  const node = new Node(projectFile);

  it('creates an object of type Node', () => { assert.ok(check(node, Node)); });
  it('creates folder locations', () => { assert.ok(check(node.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(node.d.includeDirs[0], path.join(args.runDir, 'source'));
    assert.equal(node.d.source, path.join(args.runDir, 'source'));
    assert.equal(node.d.build, path.join(args.runDir, 'build'));
    assert.equal(node.d.project, path.join(args.runDir));
  });

  it('has keywords including compilers',
     () => { assert.ok(diff.contains(keywords, 'clang')); });
  it('selectors contain a host', () => {
    assert.ok(
        diff.contains(node.selectors, ['host-mac', 'host-linux', 'host-win']), `${node.selectors.join(', ')}`);
  });
  it('node selectors match configuration target', () => {
    assert.ok(diff.contains(node.selectors, ['test-platform']), `${node.selectors.join(', ')}`);
  });
  it('can interpolate a shell command to a string',
     () => { assert.equal(node.parse('$(echo hello world)'), 'hello world'); });
  it('can interpolate a shell command with configuration + environment vars',
     () => {
       assert.equal(node.parse('$(echo {HELLO}) {WORLD}'), 'hello world');
     });

  const expect =
  {
    BSON_BYTE_ORDER: 4321,
    configure: {
      with: 'test-platform-ninja',
      cmd: './Configure test-platform-1.0 --openssldir=\'/tmp/openssl-1.0.1\''
    }
  }

  it('will parse the configuration based on self and outputType selectors',
     () => {
       assert.equal(node.configuration.keyword, 'don\'t run this');
       assert.equal(node.parse(node.configuration.with), expect.configure.with);
       assert.equal(node.parse(node.configuration.cmd), expect.configure.cmd);
     });
  it('can parse a user defined macro', () => {
    assert.equal(node.parse('{BSON_BYTE_ORDER}'), expect.BSON_BYTE_ORDER);
  });
});
