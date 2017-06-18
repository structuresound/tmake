import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import { contains, check } from 'typed-json-transform';

import {
  ProjectRunner, list, findAndClean,
  Runtime, execAsync, graph, loadCache, args, parseFileSync, nuke
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
    Runtime.loadPlugins();
    assert.equal(args.runDir, path.join(__dirname, './cache'), 'test configuration');
    const helloWorld = parseFileSync('test/config/hello.yaml');
    // Runtime.registerPlugin(require(path.join(__dirname, '../plugins/cmake/dist/cmake.js')).default);
    assert.equal('CMake', (<any>Runtime.getPlugin('cmake')).name);
    return graph(helloWorld)
      .then((res) => {
        googleNode = res[0];
        helloNode = res[res.length - 1];
        assert.equal(helloNode.post.name, 'hello');
        return expect(googleNode.post.name).to.equal('googletest');
      });
  });

  it('has a cache path', () => {
    assert.ok(args.cachePath);
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
    return testDb.projectNamed(googleNode.post.name)
      .then((entry) => {
        const { post } = entry;
        assert.ok(post.name);
        const msg = JSON.stringify(entry);
        assert.equal(post.name, googleNode.post.name, msg);
        assert.equal(post.version, '1.7.0', msg);
        assert.ok(!post.configure, msg);
        assert.ok(!post.path, msg);
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
        const fp = path.join(helloNode.post.configurations[0].post.d.build, 'build.ninja')
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('build: with: ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).build().then(() => {
        const filePath = fs.existsSync(
          path.join(args.runDir, 'build', helloNode.post.configurations[0].post.environment.host.architecture, `${helloNode.post.name}`));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('install: binaries', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).install().then(() => {
        const filePath =
          fs.existsSync(path.join(args.runDir, 'bin', `${helloNode.post.name}`));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('test: main', () => {
    return execAsync(path.join(args.runDir, 'bin', helloNode.post.name))
      .then((res) => {
        const results = res.split('\n');
        return expect(results[results.length - 2])
          .to.equal('Hello, world, from Visual C++!');
      });
  });

  it('can clean libbson project', () => {
    return findAndClean(helloNode.post.name)
      .then(res => expect(res).to.not.be.ok);
  });
});
