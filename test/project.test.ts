import * as path from 'path';
import { assert } from 'chai';
import { contains, check } from 'js-object-tools';

import { parseFileAsync } from '../src/file';
import { args } from '../src/args';
import { Project, ProjectFile } from '../src/project';

describe('node', () => {
  let project: Project;

  before(() => {
    return parseFileAsync(path.join(args.npmDir, 'test/config/metaProject.yaml'))
      .then((projectFile: ProjectFile) => {
        project = new Project(projectFile);
      });
  });


  it('creates an object of type Project', () => { assert.ok(check(project, Project)); });
  it('creates folder locations', () => { assert.ok(check(project.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(project.d.includeDirs[0], path.join(args.runDir, 'source'));
    assert.equal(project.d.source, path.join(args.runDir, 'source'));
  });
});
