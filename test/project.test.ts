import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { contains, check } from 'typed-json-transform';

import { args, Project, parseFileAsync, nuke } from 'tmake-core';

describe('project', () => {
  let project: TMake.Project;
  before(() => {
    return parseFileAsync(path.join(args.npmDir, 'test/config/metaProject.yaml'))
      .then((projectFile) => {
        project = new Project(<TMake.Project.Pre><any>projectFile);
      });
  });

  it('creates an object of type Project', () => { assert.ok(check(project, Project)); });
  it('creates folder locations', () => { assert.ok(check(project.post.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(project.post.d.source, path.join(args.runDir, 'source'));
    assert.equal(project.post.d.root, args.runDir, 'root dir');
  });
});