import { assert } from 'chai';
import 'mocha';
import * as path from 'path';
import { contains, containsAny, check } from 'typed-json-transform';
import { Project, Configuration, Runtime, args, parseFileAsync } from 'tmake-core';

import { TestDb } from './db';

describe('configuration', () => {
  let project: TMake.Project;
  let configuration: TMake.Configuration;

  before(() => {
    Runtime.init(new TestDb());
    return parseFileAsync(path.join(__dirname, 'config/meta.yaml'))
      .then((projectFile) => {
        project = new Project(<TMake.Project.Raw><any>projectFile);
        configuration = project.parsed.configurations[0];
      });
  });

  it('creates one environment', () => { assert.ok(check(configuration, Configuration)); });
  it('creates folder locations', () => { assert.ok(check(configuration.parsed.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(configuration.parsed.d.source, path.join(args.runDir, 'source'), 'source dir');
    assert.equal(configuration.parsed.d.project, path.join(args.runDir, 'source'), 'project dir');
    assert.equal(configuration.parsed.d.build, path.join(args.runDir, 'build/test-arch'), 'build dir');
  });
});
