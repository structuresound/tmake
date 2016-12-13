import {assert, expect} from 'chai';
import path from 'path';
import fs from 'fs';
import {execAsync, mkdir} from '../lib/util/sh';
import file from '../lib/util/file';
import args from '../lib/util/args';
import {graph} from '../lib/graph';
import {buildPhase} from '../lib/tmake';

const helloWorld = file.parseFileSync(path.join(args.npmDir, '/src/test/hello.yaml'));
describe('tmake', function() {
  this.timeout(120000);

  it('can clean the test folder', () => {
    file.nuke(args.runDir);
    return expect(fs.existsSync(args.runDir))
      .to
      .equal(false);
  });

  let googleNode;
  let helloNode;

  it('resolves dependencies', () => {
    return graph(helloWorld).then((res) => {
      googleNode = res[0];
      helloNode = res[res.length - 1];
      assert.equal(helloNode.name, 'hello');
      return expect(googleNode.name)
        .to
        .equal('googletest');
    });
  });

  it('can fetch a source tarball', () => {
    mkdir('-p', args.runDir);
    this.slow(1000);
    return buildPhase
      .fetch(googleNode)
      .then(() => {
        const fp = path.join(args.runDir, 'trie_modules/googletest/source');
        const filePath = fs.existsSync(fp);
        return expect(filePath)
          .to
          .equal(true, fp);
      });
  });

  it('can build an existing cmake project', () => {
    this.slow(5000);
    return buildPhase
      .build(googleNode)
      .then(() => {
        const filePath = fs.existsSync(path.join(args.runDir, 'trie_modules/googletest/source/build/build.ninja'));
        return expect(filePath)
          .to
          .equal(true);
      });
  });

  it('can install a built static lib', () => {
    this.slow(5000);
    return buildPhase
      .install(googleNode)
      .then(() => {
        const filePath = fs.existsSync(path.join(args.runDir, 'trie_modules/lib/libgtest.a'));
        return expect(filePath)
          .to
          .equal(true);
      });
  });

  it('can fetch a git repo', () => {
    this.slow(2000);
    return buildPhase
      .fetch(helloNode)
      .then(() => {
        const fp = path.join(args.runDir, 'source/README.md');
        const filePath = fs.existsSync(fp);
        return expect(filePath)
          .to
          .equal(true, fp);
      });
  });

  it('can configure a ninja build', () => {
    return buildPhase
      .configure(helloNode)
      .then(() => {
        const filePath = fs.existsSync(path.join(args.runDir, 'build.ninja'));
        return expect(filePath)
          .to
          .equal(true);
      });
  });

  // it('can build with ninja', () => {
  //   return buildPhase
  //     .build(helloNode)
  //     .then(() => {
  //       const filePath = fs.existsSync(path.join(args.runDir, 'bin', `${helloWorld.name}`));
  //       return expect(filePath)
  //         .to
  //         .equal(true);
  //     });
  // });
  //
  // it('run the built binary', () => {
  //   return execAsync(`./${helloWorld.name}`, (path.join(args.runDir, 'bin')), true).then((res) => {
  //     const results = res.split('\n');
  //     return expect(results[results.length - 2])
  //       .to
  //       .equal('Hello, world, from Visual C++!');
  //   });
  // });
  //
  // it('can push to the user local db', () => db.findOne({name: helloWorld.name}).then(dep => _tmake.link(dep)).then(() => userDb.findOne({name: helloWorld.name})).then(res => expect(res.name).to.equal(helloWorld.name)));
  //
  // it('can remove a link from the local db', () => userDb.findOne({name: helloWorld.name}).then(dep => _tmake.unlink(dep)).then(() => userDb.findOne({name: helloWorld.name})).then(dep => expect(dep).to.not.be.ok));
});
