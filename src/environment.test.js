/*  global it describe*/
import path from 'path';
import {assert} from 'chai';
import {contains, check} from 'js-object-tools';

import file from '../lib/file';
import args from '../lib/util/args';
import {Project} from '../lib/node';
import {Environment, keywords} from '../lib/environment';

describe('environment', () => {
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
  const project = new Project(projectFile);

  const env = project.environments[0];

  it('creates one environment', () => { assert.ok(check(env, Environment)); });
  it('creates folder locations', () => { assert.ok(check(env.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(env.d.includeDirs[0], path.join(args.runDir, 'source'));
    assert.equal(env.d.source, path.join(args.runDir, 'source'));
    assert.equal(env.d.build, path.join(args.runDir, 'build'));
    assert.equal(env.d.project, path.join(args.runDir, 'source'));
  });

  it('has keywords including compilers',
     () => { assert.ok(contains(keywords, 'clang')); });
  it('selectors contain a host', () => {
    assert.ok(
        contains(env.selectors, ['host-mac', 'host-linux', 'host-win']), `${env.selectors.join(', ')}`);
  });
  it('project selectors match configuration target', () => {
    assert.ok(contains(env.selectors, ['test-platform']), `${env.selectors.join(', ')}`);
  });
  it('can interpolate a shell command to a string',
     () => { assert.equal(env.parse('$(echo hello world)'), 'hello world'); });
  it('can interpolate a shell command with configuration + environment vars',
     () => {
       assert.equal(env.parse('$(echo {HELLO}) {WORLD}'), 'hello world');
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
       assert.equal(env.configure.keyword, 'don\'t run this');
       assert.equal(env.parse(env.configure.with), expect.configure.with);
       assert.equal(env.parse(env.configure.cmd), expect.configure.cmd);
     });
  it('can parse a user defined macro', () => {
    assert.equal(env.parse('{BSON_BYTE_ORDER}'), expect.BSON_BYTE_ORDER);
  });
});
