import * as fs from 'fs';
import * as path from 'path';
import * as Bluebird from 'bluebird';
import 'mocha';
import { assert, expect } from 'chai';
import { contains, check } from 'typed-json-transform';

import {
  ProjectRunner, list, findAndClean, defaults,
  Runtime, execAsync, graph, loadCache, args, parseFileSync, nuke, moveArchive
} from 'tmake-core';

import { ClientDb } from 'tmake-cli';

Bluebird.onPossiblyUnhandledRejection(function (e: Error, promise: any) {
  console.log(e.message);
  console.log(e.stack);
});

describe('core', function () {
  this.timeout(600000);

  const ctx = {
    googleNode: undefined,
    helloNode: undefined,
    testDb: undefined,
    architecture: '',
    platform: ''
  }
  
  before(() => {
    ctx.testDb = new ClientDb();
    assert.ok(ctx.testDb.projectNamed, 'Missing Db');
    Runtime.init({database: ctx.testDb});

    const { host: {architecture, platform} } = defaults.environment;
    ctx.architecture = architecture;
    assert.ok(ctx.architecture, 'Missing Host Architecture');
    ctx.platform = platform;
    assert.ok(ctx.platform, 'Missing Host Platform');

    Runtime.loadPlugins();
    assert.equal(args.runDir, path.join(__dirname, '../runtime'), 'test configuration');
    const helloWorld = parseFileSync(path.join(__dirname, 'config/hello.yaml'));
    const cmake = (<any>Runtime.getPlugin('cmake'));
    assert.isOk(cmake, 'Missing CMake Plugin');
    assert.equal('CMake', cmake.name);
    return graph(helloWorld)
      .then((res) => {
        ctx.googleNode = res[0];
        assert.isOk(ctx.googleNode);
        ctx.helloNode = res[res.length - 1];
        assert.isOk(ctx.helloNode);
        const { parsed } = ctx.helloNode;
        assert.isOk(parsed);
        assert.equal(parsed.name, 'hello');
        const { target } = parsed;
        assert.isOk(target, 'Missing target from parsed project');
        assert.isOk(target.flags, 'Missing flags from parsed target');
        assert.isOk(ctx.googleNode.parsed);
        return expect(ctx.googleNode.parsed.name).to.equal('gtest');
      });
  });

  it('has a cache path', () => {
    assert.ok(args.cachePath);
  });

  it('can build and install', () => {
    const {googleNode, platform, architecture} = ctx;
    assert.ok(googleNode, 'missing project');
    this.slow(5000);
    return loadCache(googleNode)
      .then(() => {
        return new ProjectRunner(googleNode)
          .install()
          .then(() => {
            const id = googleNode.parsed.platforms[platform][architecture].hash();
            const fp = `lib/${platform}/${architecture}/${id}/libgtest.a`;
            const exists = fs.existsSync(path.join(googleNode.parsed.d.home, fp));
            return expect(exists, fp).to.equal(true);
          }).then(() => {
            const fp = path.join(googleNode.parsed.d.home, `include/${platform}/gtest/gtest.h`);
            const exists = fs.existsSync(fp);
            return expect(exists, fp).to.equal(true);
          });
      });
  });

  it('can move built libs to local cache', () => {
    const {googleNode, platform, architecture, testDb} = ctx;
    assert.ok(googleNode, 'missing project');
    return testDb.projectNamed(googleNode.parsed.name)
      .then((entry) => {
        assert.ok(entry);
        assert.ok(entry.name);
        const msg = JSON.stringify(entry);
        assert.equal(entry.name, googleNode.parsed.name, msg);
        assert.equal(entry.version, '1.8.0', msg);
        assert.ok(!entry.configure, msg);
        assert.ok(!entry.path, msg);
        const id = googleNode.parsed.platforms[platform][architecture].hash();
        return testDb.loadConfiguration(id).then((c) => {
          assert.ok(c, `no configuration for hash: ${id}`);
          const msg = JSON.stringify(c);
          const hasGTest = contains(c.cache.libs, `lib/${platform}/${architecture}/${id}/libgtest.a`);
          const hasGTestMain = contains(c.cache.libs, `lib/${platform}/${architecture}/${id}/libgtest_main.a`);
          return expect(hasGTest && hasGTestMain).to.deep.equal(true, msg);
        });
      });
  });

  it('can fetch git', () => {
    this.slow(2000);
    const {helloNode, platform, architecture} = ctx;
    assert.ok(helloNode, 'missing project');
    return new ProjectRunner(helloNode).fetch().then(() => {
      const fp = path.join(args.runDir, 'hello/README.md');
      const exists = fs.existsSync(fp);
      return expect(exists, fp).to.equal(true, fp);
    })
  });

  it('can configure ninja', () => {
    const {helloNode, platform, architecture} = ctx;
    assert.ok(helloNode, 'missing project');
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).configure().then(() => {
        const fp = path.join(helloNode.parsed.platforms[platform][architecture].parsed.d.build, 'build.ninja')
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('can build with ninja', () => {
    const {helloNode, platform, architecture} = ctx;
    assert.ok(helloNode, 'missing project');
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).build().then(() => {
        const fp = path.join(args.runDir, 'build', helloNode.parsed.platforms[platform][architecture].hash(), `${helloNode.parsed.name}`);
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('can install binaries', () => {
    const {helloNode, platform, architecture} = ctx;
    assert.ok(helloNode, 'missing project');
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).install().then(() => {
        const fp = path.join(args.runDir, 'bin', platform, Runtime.os.arch(), `${helloNode.parsed.name}`);
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('can clean the project', () => {
    const {helloNode, platform, architecture} = ctx;
    assert.ok(helloNode, 'missing project');
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).clean().then(() => {
        const fe = fs.existsSync(path.join(args.runDir, 'build'));
        return expect(fe).to.not.be.ok;
      });
    });
  });

  it('can run an executable', () => {
    const { platform, helloNode } = ctx;
    return execAsync(path.join(args.runDir, 'bin', platform, Runtime.os.arch(), helloNode.parsed.name))
      .then((res) => {
        const results = res.split('\n');
        return expect(results[results.length - 2])
          .to.equal('Hello, world, from Visual C++!');
      });
  });
});
