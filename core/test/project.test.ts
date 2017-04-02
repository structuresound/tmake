/// <reference path="../src/tmake.d.ts" />

import * as path from 'path';
import { assert } from 'chai';
import { contains, check } from 'typed-json-transform';
import { parseFileAsync } from 'tmake-file';

import { Project } from '../src/project';

import { args } from './args';

describe('project', () => {
  let project: Project;

  before(() => {
    return parseFileAsync(path.join(args.npmDir, 'test/config/metaProject.yaml'))
      .then((projectFile) => {
        project = new Project(<TMake.Project.File><any>projectFile);
      });
  });

  it('creates an object of type Project', () => { assert.ok(check(project, Project)); });
  it('creates folder locations', () => { assert.ok(check(project.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(project.d.source, path.join(args.runDir, 'source'));
    assert.equal(project.d.root, args.runDir, 'root dir');
  });
});
