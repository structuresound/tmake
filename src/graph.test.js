import path from 'path';
import {assert} from 'chai';
import {check} from 'js-object-tools';

import args from '../lib/util/args';
import {graph} from '../lib/graph';
import {resolveName} from '../lib/node';
import file from '../lib/file';

const helloWorld = file.parseFileSync(path.join(args.npmDir, '/src/test/hello.yaml'));
describe('graph', () => {
  let modules;
  let rootModule;
  before(() => {
    return graph(helloWorld).then((res) => {
      modules = res;
      rootModule = modules[modules.length - 1];
      return Promise.resolve(rootModule);
    });
  });

  it('has a root node', () => {
    assert.ok(check(rootModule, Object));
  });

  it('build list has root + deps(root) length', () => {
    assert.equal(modules.length, Object.keys(helloWorld.deps).length + 1);
  });

  it('build list puts root dep last (order)', () => {
    assert.equal(rootModule.name, resolveName(helloWorld));
  });
});
