import * as path from 'path';
import { assert } from 'chai';
import { check } from 'typed-json-transform';

import { graph } from '../src/graph';
import { resolveName } from '../src/project';
import * as file from 'tmake-file';
import * as Bluebird from 'bluebird';

import {args} from '../../test';

const helloWorld = file.parseFileSync(path.join(args.npmDir, '/test/config/hello.yaml'));
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
    assert.equal(rootModule.name, resolveName(helloWorld));
  });
});
