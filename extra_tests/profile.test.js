import {assert, expect} from 'chai';
import _ from 'lodash';
import {diff} from 'js-object-tools';

import {Module, Profile} from '../lib/module';
import {profileTester} from './fixtures';

describe('profile', function() {
  const module = new Module(profileTester);
  const profile = new Profile(profileTester.profile);

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
    assert.equal(profile.conf.configure.keyword, 'don\'t run this');
    assert.equal(profile.parse(profile.conf.configure.with), profileTester.expect.configure.with);
    assert.equal(profile.parse(profile.conf.configure.cmd), profileTester.expect.configure.cmd);
  });
  it('can parse a user defined macro', () => {
    assert.equal(profile.parse('{BSON_BYTE_ORDER}'), profileTester.expect.BSON_BYTE_ORDER);
  });
});
