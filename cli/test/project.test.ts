import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { contains, check } from 'typed-json-transform';
import { parseFileSync, nuke } from 'tmake-file';

import {
  ProjectRunner, list, findAndClean,
  Runtime, execAsync, graph, loadCache, args
} from 'tmake-core';

import { Database } from '../src/db';

describe('tmake', function () {
  this.timeout(120000);

  let googleNode: TMake.Project;
  let helloNode: TMake.Project;

  const testDb = new Database();

  before(() => {
    assert.ok(testDb.projectNamed);
    Runtime.init(testDb);
    assert.equal(args.runDir, path.join(__dirname, '../../test/cache'), 'test env');
    const helloWorld = parseFileSync('test/config/hello.yaml');
    Runtime.registerPlugin(require(path.join(__dirname, '../../plugins/cmake/dist/cmake.js')).default);
    assert.equal('CMake', (<any>Runtime.getPlugin('cmake')).name);
    return graph(helloWorld)
      .then((res) => {
        googleNode = res[0];
        helloNode = res[res.length - 1];
        assert.equal(helloNode.name, 'hello');
        return expect(googleNode.name).to.equal('googletest');
      });
  });


  it('install: a built static lib, and required headers', () => {
    this.slow(5000);
    return loadCache(googleNode)
      .then(() => {
        return new ProjectRunner(googleNode)
          .install()
          .then(() => {
            const exists = fs.existsSync(path.join(args.runDir, 'trie_modules/lib/libgtest.a'));
            return expect(exists, 'trie_modules/lib/libgtest.a').to.equal(true);
          }).then(() => {
            const exists = fs.existsSync(path.join(args.runDir, `trie_modules/include/gtest/gtest.h`));
            return expect(exists, `trie_modules/include/gtest/gtest.h`).to.equal(true);
          });
      });
  });

  it('check: built libs got added to local cache', () => {
    return testDb.projectNamed(googleNode.name)
      .then((entry) => {
        assert.ok(entry.name);
        const msg = JSON.stringify(entry);
        assert.equal(entry.name, googleNode.name, msg);
        assert.equal(entry.version, '1.7.0', msg);
        assert.ok(!entry.configure, msg);
        assert.ok(!entry.path, msg);
        return expect(entry.cache.libs)
          .to.deep.equal(['lib/libgtest.a', 'lib/libgtest_main.a'], msg);
      });
  });

  it('fetch: git', () => {
    this.slow(2000);
    return new ProjectRunner(helloNode).fetch().then(() => {
      const fp = path.join(args.runDir, 'source/README.md');
      const filePath = fs.existsSync(fp);
      return expect(filePath).to.equal(true, fp);
    });
  });

  it('configure: for: ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).configure().then(() => {
        const fp = path.join(helloNode.environments[0].d.build, 'build.ninja')
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('build: with: ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).build().then(() => {
        const filePath = fs.existsSync(
          path.join(args.runDir, 'build', helloNode.environments[0].environment.host.architecture, `${helloNode.name}`));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('install: binaries', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).install().then(() => {
        const filePath =
          fs.existsSync(path.join(args.runDir, 'bin', `${helloNode.name}`));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('test: main', () => {
    return execAsync(path.join(args.runDir, 'bin', helloNode.name))
      .then((res) => {
        const results = res.split('\n');
        return expect(results[results.length - 2])
          .to.equal('Hello, world, from Visual C++!');
      });
  });

  it('can clean libbson project', () => {
    return findAndClean(helloNode.name)
      .then(res => expect(res).to.not.be.ok);
  });
});
