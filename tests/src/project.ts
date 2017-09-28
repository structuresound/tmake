import { assert, expect } from 'chai';
import 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import { contains, check } from 'typed-json-transform';

import { args, Project, parseFileAsync, nuke } from 'tmake-core';

describe('project', () => {
  let project: TMake.Project;
  before(() => {
    return parseFileAsync(path.join(__dirname, 'config/meta.yaml'))
      .then((projectFile) => {
        project = new Project(<TMake.Project.Raw><any>projectFile);
      });
  });

  it('creates an object of type Project', () => { assert.ok(check(project, Project)); });
  it('creates folder locations', () => { assert.ok(check(project.parsed.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(project.parsed.d.source, path.join(args.runDir, 'source'));
    assert.equal(project.parsed.d.root, args.runDir, 'root dir');
  });
});
