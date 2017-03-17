/*  global it describe*/
import * as path from 'path';
import { assert } from 'chai';
import { contains, containsAny, check } from 'js-object-tools';

import { parseFileAsync } from '../src/file';
import { args } from '../src/args';
import { Project, ProjectFile } from '../src/project';
import { Environment } from '../src/environment';

import { Runtime } from '../src/runtime';

describe('environment', () => {
  console.log('registering built in plugins . . .');
  Runtime.loadPlugins();

  let project: Project;
  let env: Environment;

  before(() => {
    return parseFileAsync(path.join(args.npmDir, 'test/config/metaProject.yaml'))
      .then((projectFile: ProjectFile) => {
        project = new Project(projectFile);
        env = project.environments[0];
      });
  });

  it('creates one environment', () => { assert.ok(check(env, Environment)); });
  it('creates folder locations', () => { assert.ok(check(env.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(env.d.source, path.join(args.runDir, 'source'), 'source dir');
    assert.equal(env.d.project, path.join(args.runDir, 'source'), 'project dir');
    assert.equal(env.d.build, path.join(args.runDir, 'build/test-arch'), 'build dir');
  });

  it('has keywords including compilers',
    () => { assert.ok(contains(env.environment.keywords, 'clang')); });
  it('selectors contain a host', () => {
    assert.ok(
      containsAny(env.environment.selectors, ['host-mac', 'host-linux', 'host-win']), `${env.environment.selectors.join(', ')}`);
  });
  it('project selectors match configuration target', () => {
    assert.ok(contains(env.environment.selectors, 'test-platform'), `${env.environment.selectors.join(', ')}`);
  });
  it('can interpolate a shell command to a string',
    () => { assert.equal(env.parse('$(echo hello world)'), 'hello world'); });
  it('can interpolate a shell command with configuration + environment vars',
    () => {
      assert.equal(env.parse('$(echo ${HELLO}) ${WORLD}'), 'hello world');
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
    console.log(env.configure);
    assert.equal(env.parse(env.configure.shell), expect.configure.shell);
    assert.equal(env.parse(env.configure.ninja), expect.configure.ninja);
  });

  it('can parse a user defined macro', () => {
    assert.equal(env.parse('${BSON_BYTE_ORDER}'), expect.BSON_BYTE_ORDER);
  });
});
