import { assert , expect} from 'chai';
import 'mocha';
import * as path from 'path';
import * as Bluebird from 'bluebird';
import { contains, containsAny, check } from 'typed-json-transform';
import { Project, Configuration, Runtime, defaults, args, parseFileAsync } from 'tmake-core';

import { TestDb } from './db';

describe('configuration', function(){
  this.timeout(240000);

  let project: TMake.Project;
  let configuration: TMake.Configuration;

  it('creates a configuration object with values',() => {
    Runtime.init({database: new TestDb()});
    const { host } = defaults.environment;
    return parseFileAsync(path.join(__dirname, 'config/meta.yaml'))
      .then((projectFile) => {
        project = new Project(<TMake.Project.Raw><any>projectFile);
        configuration = project.parsed.platforms[host.name][host.architecture];
        const {name} = configuration.parsed;
        return expect(name, name).to.equal('metaProject');
      });
  });

  it('creates one environment', () => { assert.ok(check(configuration, Configuration)); });
  it('creates folder locations', () => { assert.ok(check(configuration.parsed.d, Object)); });

  it('creates correct paths', () => {
    assert.equal(configuration.parsed.d.source, path.join(args.runDir, 'source'), 'source dir');
    assert.equal(configuration.parsed.d.project, path.join(args.runDir, 'source'), 'project dir');
    assert.equal(configuration.parsed.d.build, path.join(args.runDir, `build/${Runtime.os.arch()}`), 'build dir');
  });
});
