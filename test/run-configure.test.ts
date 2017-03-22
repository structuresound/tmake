import { expect, assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';


import { args } from '../src/args';
import { log } from '../src/log';
import * as file from '../src/file';

import { Project, ProjectFile } from '../src/project';
import { graph } from '../src/graph';
import { fetch } from '../src/fetch';
import { configure } from '../src/configure';
import { findAndClean } from '../src/tmake';

describe('configure', function () {
  this.timeout(120000);
  let libbson: Project;
  before(() => {
    assert.ok(args.runDir.endsWith('tests'));
    assert.ok(__dirname.endsWith('test'));
    return file.parseFileAsync(path.join(__dirname, 'config/libbson.yaml'))
      .then((config: ProjectFile) => {
        return graph(config).then((res) => {
          libbson = res[0];
        });
      })
  })

  it('can parse a complex project correctly', () => {
    assert.equal(libbson.name, 'libbson');
    assert.equal(libbson.configure.replace.config.inputs.BSON_NEEDS_SET_OUTPUT_FORMAT, 0);
  });

  it('can clean the test folder', () => {
    file.nuke(args.runDir);
    return expect(fs.existsSync(args.runDir)).to.equal(false);
  });

  it('can fetch repo to configure', () => {
    return fetch(libbson).then(() => {
      const fp = path.join(args.runDir, 'source/src/bson/bson-version.h.in');
      return expect(fs.existsSync(fp)).to.equal(true, fp);
    });
  });

  it('can replace files for environment', () => {
    return configure(libbson.environments[0]).then(() => {
      const fp = path.join(args.runDir, 'source/src/bson/bson-version.h');
      assert.ok(fs.existsSync(fp));
      const str = fs.readFileSync(fp, 'utf8');
      return expect(str.includes('@BSON_MAJOR_VERSION@')).to.equal(false);
    });
  });
});
