import * as path from 'path';
import { assert } from 'chai';
import { check } from 'typed-json-transform';

import { graph } from '../src/graph';
import { Project } from '../src/project';
import * as Bluebird from 'bluebird';

import {args, Runtime, parseFileSync} from '../src';

const MockDb = {
  projectNamed(){
    return Bluebird.resolve();
  },
  loadEnvironment(){
    return Bluebird.resolve();
  }
}
Runtime.init(<any>MockDb);

const helloWorld = parseFileSync(path.join(args.npmDir, '/test/config/hello.yaml'));
describe('graph', () => {
  let modules;
  let rootModule;
  before(() => {
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
    assert.equal(rootModule.name, Project.resolveName(helloWorld));
  });
});
