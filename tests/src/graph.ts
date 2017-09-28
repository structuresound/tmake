import * as path from 'path';
import { assert } from 'chai';
import 'mocha';
import { check } from 'typed-json-transform';
import * as Bluebird from 'bluebird';

import { args, graph, Project, Runtime, parseFileSync } from 'tmake-core';
import { TestDb } from './db';

const helloWorld = parseFileSync(path.join(__dirname, 'config/hello.yaml'));
let rootModule: TMake.Project;

describe('graph', () => {
  let modules;
  before(() => {
    Runtime.init(new TestDb());
    return graph(helloWorld).then((res) => {
      modules = res;
      rootModule = modules[modules.length - 1];
      return Bluebird.resolve(rootModule);
    });
  });

  it('has a root node', () => {
    assert.ok(check(rootModule, Object));
  });

  it('build list has root + deps(root) length', () => {
    assert.equal(modules.length, Object.keys(helloWorld.require).length + 1);
  });

  it('build list puts root dep last (order)', () => {
    const name = Project.resolveName(helloWorld);
    assert.equal(rootModule.parsed.name, name);
  });
});
