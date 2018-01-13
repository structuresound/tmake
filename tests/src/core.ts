import * as fs from 'fs';
import * as path from 'path';
import * as Bluebird from 'bluebird';
import 'mocha';
import { assert, expect } from 'chai';
import { contains, check } from 'typed-json-transform';

import {
  ProjectRunner, list, findAndClean,
  Runtime, execAsync, graph, loadCache, args, parseFileSync, nuke
} from 'tmake-core';

import { ClientDb } from 'tmake-cli';

Bluebird.onPossiblyUnhandledRejection(function (e: Error, promise: any) {
  console.log(e.message);
  console.log(e.stack);
});

describe('tmake-core', function () {
  this.timeout(240000);

  let googleNode: TMake.Project;
  let helloNode: TMake.Project;

  const testDb = new ClientDb();

  before(() => {
    assert.ok(testDb.projectNamed);
    Runtime.init([], testDb);
    Runtime.loadPlugins();
    assert.equal(args.runDir, path.join(__dirname, '../runtime'), 'test configuration');
    const helloWorld = parseFileSync(path.join(__dirname, 'config/hello.yaml'));
    const cmake = (<any>Runtime.getPlugin('cmake'));
    assert.exists(cmake);
    assert.equal('CMake', cmake.name);
    return graph(helloWorld)
      .then((res) => {
        googleNode = res[0];
        helloNode = res[res.length - 1];
        assert.exists(helloNode.parsed);
        assert.equal(helloNode.parsed.name, 'hello');
        assert.exists(googleNode.parsed);
        return expect(googleNode.parsed.name).to.equal('googletest');
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
            const fp = `trie_modules/lib/${Runtime.os.arch()}/libgtest.a`;
            const exists = fs.existsSync(path.join(args.runDir, fp));
            return expect(exists, fp).to.equal(true);
          }).then(() => {
            const fp = path.join(args.runDir, `trie_modules/include/gtest/gtest.h`);
            const exists = fs.existsSync(fp);
            return expect(exists, fp).to.equal(true);
          });
      });
  });

  it('check: built libs got added to local cache', () => {
    return testDb.projectNamed(googleNode.parsed.name)
      .then((entry) => {
        const parsed = entry;
        assert.ok(parsed.name);
        const msg = JSON.stringify(entry);
        assert.equal(parsed.name, googleNode.parsed.name, msg);
        assert.equal(parsed.version, '1.8.0', msg);
        assert.ok(!parsed.configure, msg);
        assert.ok(!parsed.path, msg);
        const hasGTest = contains(entry.cache.libs, `lib/${Runtime.os.arch()}/libgtest.a`);
        const hasGTestMain = contains(entry.cache.libs, `lib/${Runtime.os.arch()}/libgtest_main.a`);
        return expect(hasGTest && hasGTestMain).to.deep.equal(true, msg);
      });
  });

  it('fetch: git', () => {
    this.slow(2000);
    return new ProjectRunner(helloNode).fetch().then(() => {
      const fp = path.join(args.runDir, 'source/README.md');
      const exists = fs.existsSync(fp);
      return expect(exists, fp).to.equal(true, fp);
    })
  });

  it('configure: for: ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).configure().then(() => {
        const fp = path.join(helloNode.parsed.configurations[0].parsed.d.build, 'build.ninja')
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('build: with: ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).build().then(() => {
        const fp = path.join(args.runDir, 'build', helloNode.parsed.configurations[0].parsed.target.architecture, `${helloNode.parsed.name}`);
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('install: binaries', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).install().then(() => {
        const fp = path.join(args.runDir, 'bin', Runtime.os.arch(), `${helloNode.parsed.name}`);
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('test: main', () => {
    return execAsync(path.join(args.runDir, 'bin', Runtime.os.arch(), helloNode.parsed.name))
      .then((res) => {
        const results = res.split('\n');
        return expect(results[results.length - 2])
          .to.equal('Hello, world, from Visual C++!');
      });
  });

  it('can clean the project', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).clean().then(() => {
        const fe = fs.existsSync(path.join(args.runDir, 'build'));
        return expect(fe).to.not.be.ok;
      });
    });
  });

});
