/*  global it describe*/
import path from 'path';
import {assert} from 'chai';
import {diff, check} from 'js-object-tools';

import file from '../lib/util/file';
import args from '../lib/util/args';
import {Node, keywords} from '../lib/node';

describe('node', () => {
  const config =
      file.parseFileSync(path.join(args.npmDir, '/src/test/libbson.yaml'));
  const node = new Node(config);

  it('creates an object of type Node', () => { assert.ok(check(node, Node)); });

  it('creates folder locations', () => { assert.ok(check(node.d, Object)); });
});

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
  },
  expect: {
    BSON_BYTE_ORDER: 4321,
    configure: {
      with: 'test-platform-ninja',
      cmd: './Configure test-platform-1.0 --openssldir=\'/tmp/openssl-1.0.1\''
    }
  }
};

describe('outputType', () => {
  const outputType = new Node(projectFile);

  it('has keywords including compilers',
     () => { assert.ok(diff.contains(keywords, 'clang')); });
  it('selectors contain a host outputType',
     () => {
       assert.ok(diff.contains(outputType.selectors,
                               ['host-mac', 'host-linux', 'host-win']),
                 `${outputType.selectors.join(', ')}`);
     });
  it('target selectors match configuration target', () => {
    assert.ok(diff.contains(outputType.selectors, ['test-platform']), `${outputType.selectors.join(', ')}`);
  });
  it('can interpolate a shell command to a string', () => {
    assert.equal(outputType.parse('$(echo hello world)'), 'hello world');
  });
  it('can interpolate a shell command with configuration + environment vars',
     () => {
       assert.equal(outputType.parse('$(echo {HELLO}) {WORLD}'), 'hello world');
     });
  it('will parse the configuration based on self and outputType selectors', () => {
    const configuration = outputType.select(projectFile.configure);
    assert.equal(configuration.keyword, 'don\'t run this');
    assert.equal(outputType.parse(configuration.with),
                 projectFile.expect.configure.with);
    assert.equal(outputType.parse(configuration.cmd),
                 projectFile.expect.configure.cmd);
  });
  it('can parse a user defined macro', () => {
    assert.equal(outputType.parse('{BSON_BYTE_ORDER}'),
                 projectFile.expect.BSON_BYTE_ORDER);
  });
});
