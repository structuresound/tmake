import {assert} from 'chai';
import _ from 'lodash';
import {diff} from 'js-object-tools';

import {Profile, keywords} from '../lib/profile';

const projectFile = {
  name: 'testConf',
  profile: {
    target: {
      platform: 'meta',
      endianness: 'BE'
    },
    environment: {
      HELLO: 'hello',
      WORLD: 'world',
      OPENSSL_VERSION: '1.0.1',
      BSON_BYTE_ORDER: {
        macro: '{target.endianness}',
        map: {
          LE: 1234,
          BE: 4321
        }
      }
    }
  },
  configure: {
    'target-meta': {
      with: 'meta-ninja',
      cmd: './Configure {TEST_SDK_VERSION} --openssldir=\'/tmp/openssl-{OPENSSL_VERSION}\''
    },
    keyword: 'don\'t run this'
  },
  expect: {
    BSON_BYTE_ORDER: 4321,
    configure: {
      with: 'meta-ninja',
      cmd: './Configure meta-1.0 --openssldir=\'/tmp/openssl-1.0.1\''
    }
  }
};

describe('profile', () => {
  const profile = new Profile(projectFile.profile);

  it('has keywords including compilers', () => {
    assert.ok(diff.contains(keywords, 'clang'));
  });
  it('selectors contain a host profile', () => {
    assert.ok(diff.contains(profile.selectors, ['host-mac', 'host-linux', 'host-win']));
  });
  it('target selectors match configuration target', () => {
    assert.ok(diff.contains(profile.selectors, ['target-meta']));
  });
  it('can interpolate a shell command to a string', () => {
    assert.equal(profile.parse('$(echo hello world)'), 'hello world');
  });
  it('can interpolate a shell command with configuration + environment vars', () => {
    assert.equal(profile.parse('$(echo {HELLO}) {WORLD}'), 'hello world');
  });
  it('will parse the configuration based on self and profile selectors', () => {
    const configuration = profile.select(projectFile.configure);
    assert.equal(configuration.keyword, 'don\'t run this');
    assert.equal(profile.parse(configuration.with), projectFile.expect.configure.with);
    assert.equal(profile.parse(configuration.cmd), projectFile.expect.configure.cmd);
  });
  it('can parse a user defined macro', () => {
    assert.equal(profile.parse('{BSON_BYTE_ORDER}'), projectFile.expect.BSON_BYTE_ORDER);
  });
});
