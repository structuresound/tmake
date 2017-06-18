import * as path from 'path';
import { assert } from 'chai';
import { contains, containsAny, check } from 'typed-json-transform';
import { Project, Configuration, Runtime, args, parseFileAsync } from 'tmake-core';

describe('environment', () => {
  let project: TMake.Project;
  let configuration: TMake.Configuration;

  before(() => {
    return parseFileAsync(path.join(args.npmDir, 'test/config/metaProject.yaml'))
      .then((projectFile) => {
        project = new Project(<TMake.Project.Pre><any>projectFile);
        configuration = project.post.configurations[0];
      });
  });

  it('creates one environment', () => { assert.ok(check(configuration, Configuration)); });
  it('creates folder locations', () => { assert.ok(check(configuration.post.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(configuration.post.d.source, path.join(args.runDir, 'source'), 'source dir');
    assert.equal(configuration.post.d.project, path.join(args.runDir, 'source'), 'project dir');
    assert.equal(configuration.post.d.build, path.join(args.runDir, 'build/test-arch'), 'build dir');
  });

  it('has keywords including compilers',
    () => { assert.ok(contains(configuration.post.environment.keywords, 'clang')); });
  it('selectors contain a host', () => {
    assert.ok(
      containsAny(configuration.post.environment.selectors, ['host-mac', 'host-linux', 'host-win']), `${configuration.post.environment.selectors.join(', ')}`);
  });
  it('project selectors match configuration target', () => {
    assert.ok(contains(configuration.post.environment.selectors, 'test-platform'), `${configuration.post.environment.selectors.join(', ')}`);
  });
  it('can interpolate a shell command to a string',
    () => { assert.equal(configuration.parse('$(echo hello world)'), 'hello world'); });
  it('can interpolate a shell command with configuration + environment vars',
    () => {
      assert.equal(configuration.parse('$(echo ${HELLO}) ${WORLD}'), 'hello world');
    });

  it('selects properly', () => {
    assert.deepEqual(configuration.select({ cmake: { key: 'value' } }), { cmake: { key: 'value' } });
    assert.deepEqual(configuration.select({ cmake: {} }), { cmake: {} });
  });

  const expect =
    {
      BSON_BYTE_ORDER: 4321,
      configure: {
        shell: './Configure test-platform-1.0 --openssldir=/tmp/openssl-1.0.1',
        ninja: null,
      }
    }

  it('will parse the configuration based on self and outputType selectors', () => {
    console.log(configuration.post.configure);
    assert.equal(configuration.parse(configuration.post.configure.shell), expect.configure.shell);
    assert.equal(configuration.parse(configuration.post.configure.ninja), expect.configure.ninja);
  });

  it('can parse a user defined macro', () => {
    assert.equal(configuration.parse('${BSON_BYTE_ORDER}'), expect.BSON_BYTE_ORDER);
  });
});
