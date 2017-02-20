import * as fs from 'fs';
import * as path from 'path';

import { assert, expect } from 'chai';
import { execAsync, mkdir } from '../src/sh';
import { parseFileSync, nuke } from '../src/file';
import { args } from '../src/args';
import { graph, loadCache } from '../src/graph';
import { Project } from '../src/project';
import { ProjectRunner, list, unlink, findAndClean } from '../src/tmake';

const helloWorld = parseFileSync(path.join(args.npmDir, 'test/config/hello.yaml'));

describe('main: ', function () {
  this.timeout(120000);
  before(() => {
    return graph(helloWorld)
      .then((res) => {
        googleNode = res[0];
        helloNode = res[res.length - 1];
        assert.equal(helloNode.name, 'hello');
        return expect(googleNode.name).to.equal('googletest');
      });
  });

  let googleNode: Project;
  let helloNode: Project;

  it('clean the test folder', () => {
    nuke(args.runDir);
    return expect(fs.existsSync(args.runDir)).to.equal(false);
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
            const exists = fs.existsSync(fp)
            return expect(exists, fp).to.equal(true);
          });
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
    return list('cache', { name: googleNode.name })
      .then((res) => {
        const entry = res[0];
        const msg = JSON.stringify(entry, [], 2);
        assert.equal(entry.name, googleNode.name, msg);
        assert.equal(entry.version, 'release-1.7.0', msg);
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
        const fp = path.join(args.runDir, 'source', 'build.ninja')
        const exists = fs.existsSync(fp);
        return expect(exists, fp).to.equal(true);
      });
    });
  });

  it('build: with: ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).build().then(() => {
        const filePath = fs.existsSync(
          path.join(args.runDir, 'build', helloNode.environments[0].host.architecture, `${helloNode.name}`));
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

  it('link: add', () => {
    return loadCache(helloNode)
      .then(() => { return new ProjectRunner(helloNode).link() })
      .then(() => { return list('user', { name: helloNode.name }); })
      .then((res) => {
        const msg = JSON.stringify(res, [], 2);
        return expect(res[0].name).to.equal(helloNode.name, msg);
      });
  });

  it('link: remove', () => {
    return list('cache', { name: helloNode.name })
      .then(res => unlink(res[0]))
      .then(() => list('user', { name: helloNode.name }))
      .then(res => expect(res.length).to.not.be.ok);
  });

  it('can clean libbson project', () => {
    return findAndClean(helloNode.name)
      .then(res => expect(res).to.not.be.ok);
  });
});
