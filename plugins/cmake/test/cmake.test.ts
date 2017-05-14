import * as fs from 'fs';
import { mkdir } from 'shelljs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { contains, check } from 'typed-json-transform';
import { parseFileSync, nuke } from 'tmake-file';

import { ProjectRunner, list, unlink, findAndClean } from 'tmake-core';
import { registerPlugin } from 'tmake-core';
import { execAsync } from 'tmake-core';
import { graph, loadCache } from 'tmake-core';
import { args } from 'tmake-core';

const helloWorld = parseFileSync(path.join(args.npmDir, 'test/config/hello.yaml'));

describe('tmake-cmake-plugin', function () {
  this.timeout(120000);

  let googleNode: TMake.Project;

  before(() => {
    registerPlugin(require(path.join(__dirname, 'dist/cmake.js')).default);
    return graph(helloWorld)
      .then((res) => {
        googleNode = res[0];
        return expect(googleNode.name).to.equal('googletest');
      });
  });

  it('fetch: archive', () => {
    mkdir('-p', args.runDir);
    this.slow(1000);
    return loadCache(googleNode)
      .then(() => {
        return new ProjectRunner(googleNode)
          .fetch()
          .then(() => {
            const fp =
              path.join(args.runDir, 'trie_modules/googletest/source');
            const filePath = fs.existsSync(fp);
            return expect(filePath).to.equal(true, fp);
          });
      });
  });

  it('build: an existing cmake project', () => {
    this.slow(5000);
    return loadCache(googleNode)
      .then(() => {
        return new ProjectRunner(googleNode)
          .build()
          .then(() => {
            const fp = `${googleNode.environments[0].d.build}/libgtest.a`;
            assert.equal(fs.existsSync(fp), true)
            assert.isString(googleNode.environments[0].cache['cmake_configure'].get());
          });
      });
  });
});