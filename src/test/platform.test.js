/*globals describe it*/
import { assert } from 'chai';
import { expect } from 'chai';
import _ from 'underscore';

import testArgv from './testArgv';

import { tmakeConfig } from './fixtures';

describe('platform', function() {
  const platform = require('../lib/platform')(testArgv, tmakeConfig);
  it('will select on the current platform', () => assert.ok(_.contains(platform.selectors, platform.name())));

  const cascade = require('../lib/cascade.js');
  const dep = platform.parse(cascade.deep(tmakeConfig, platform.keywords, platform.selectors));

  it('will parse the configuration based on self and platform selectors', function() {
    assert.equal(dep.configure.keyword, "don't run this");
    if (_.contains(platform.selectors, 'mac')) {
      return assert.equal(dep.configure.echo, 'echo apple world');
    } else if (_.contains(platform.selectors, 'ios')) {
      return assert.equal(dep.configure.echo, 'echo apple world');
    } else if (_.contains(platform.selectors, 'win')) {
      return assert.equal(dep.configure.echo, 'echo win world');
    }
  });

  it('can interpolate a shell command to a string', () => assert.equal(platform.parse("$(echo {HELLO}) {WORLD}", dep), "hello world"));

  it('can parse a user defined macro', () => assert.equal(platform.parse("{BSON_BYTE_ORDER}", dep), 1234));

  return it('iterates a command object', function() {
    const commandObject =
      {echo() { return 7; }};

    const keywords = ['keyword', 'with', 'cmd'];
    return platform.iterate(dep.configure, commandObject, keywords)
    .then(function(res) {
      if (_.contains(platform.selectors, 'mac')) {
        expect(res[0].obj).to.equal('echo apple world');
      }
      if (_.contains(platform.selectors, 'linux')) {
        return expect(res[0].obj).to.equal('echo linux world');
      }
    });
  });
});
