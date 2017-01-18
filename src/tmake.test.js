import { assert, expect } from 'chai';
import path from 'path';
import fs from 'fs';
import { execAsync, mkdir } from '../lib/util/sh';
import file from '../lib/file';
import args from '../lib/util/args';
import { graph, loadCache } from '../lib/graph';
import { ProjectRunner, list, unlink, findAndClean } from '../lib/tmake';

const helloWorld =
  file.parseFileSync(path.join(args.npmDir, '/src/test/hello.yaml'));
describe('tmake', function () {
  this.timeout(120000);
  it('can clean the test folder', () => {
    file.nuke(args.runDir);
    return expect(fs.existsSync(args.runDir)).to.equal(false);
  });

  let googleNode;
  let helloNode;

  it('resolves dependencies', () => {
    return graph(helloWorld)
      .then((res) => {
        googleNode = res[0];
        helloNode = res[res.length - 1];
        assert.equal(helloNode.name, 'hello');
        return expect(googleNode.name).to.equal('googletest');
      });
  });

  it('can fetch a source tarball', () => {
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

  it('can build an existing cmake project', () => {
    this.slow(5000);
    return loadCache(googleNode)
      .then(() => {
        return new ProjectRunner(googleNode)
          .build()
          .then(() => {
            const filePath = fs.existsSync(path.join(
              args.runDir,
              'trie_modules/googletest/source/build/build.ninja'));
            return expect(filePath).to.equal(true);
          });
      });
  });

  it('can install a built static lib', () => {
    this.slow(5000);
    return loadCache(googleNode)
      .then(() => {
        return new ProjectRunner(googleNode)
          .install()
          .then(() => {
            const filePath = fs.existsSync(
              path.join(args.runDir, 'trie_modules/lib/libgtest.a'));
            return expect(filePath).to.equal(true);
          });
      });
  });

  it('has the correct format for a project', () => {
    return list('cache', { name: googleNode.name })
      .then((res) => {
        const entry = res[0];
        const msg = JSON.stringify(entry, 0, 2);
        assert.equal(entry.name, googleNode.name, msg);
        assert.equal(entry.version, 'release-1.7.0', msg);
        assert.ok(!entry.configutation, msg);
        assert.ok(!entry.d, msg);
        assert.ok(!entry.p, msg);
        return expect(entry.libs)
          .to.deep.equal(['lib/libgtest.a', 'lib/libgtest_main.a'], msg);
      });
  });

  it('can fetch a git repo', () => {
    this.slow(2000);
    return new ProjectRunner(helloNode).fetch().then(() => {
      const fp = path.join(args.runDir, 'source/README.md');
      const filePath = fs.existsSync(fp);
      return expect(filePath).to.equal(true, fp);
    });
  });

  it('can configure a ninja build', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).configure().then(() => {
        const filePath = fs.existsSync(path.join(args.runDir, 'build.ninja'));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('can build with ninja', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).build().then(() => {
        const filePath = fs.existsSync(
          path.join(args.runDir, 'build', `${helloNode.name}`));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('can install a binary', () => {
    return loadCache(helloNode).then(() => {
      return new ProjectRunner(helloNode).install().then(() => {
        const filePath =
          fs.existsSync(path.join(args.runDir, 'bin', `${helloNode.name}`));
        return expect(filePath).to.equal(true);
      });
    });
  });

  it('run the built binary', () => {
    return execAsync(path.join(args.runDir, 'bin', helloNode.name))
      .then((res) => {
        const results = res.split('\n');
        return expect(results[results.length - 2])
          .to.equal('Hello, world, from Visual C++!');
      });
  });

  it('can link to the user local db', () => {
    return loadCache(helloNode)
      .then(() => { return new ProjectRunner(helloNode).link() })
      .then(() => { return list('user', { name: helloNode.name }); })
      .then((res) => {
        const msg = JSON.stringify(res, 0, 2);
        return expect(res[0].name).to.equal(helloNode.name, msg);
      });
  });

  it('can remove a link from the local db', () => {
    return list('cache', { name: helloNode.name })
      .then(res => unlink(res[0]))
      .then(() => list('user', { name: helloNode.name }))
      .then(res => expect(res.length).to.not.be.ok);
  });

  it('can clean libbson project', () => {
    return findAndClean('helloNode.name').then((cleanProject) => {
      return expect(cleanProject.cache).to.deep.equal({});
    });
  });
});
