import {expect} from 'chai';
import path from 'path';
import sh from '../lib/util/sh';
import fs from '../lib/util/fs';
import argv from '../lib/util/argv';
import {execute} from '../lib/tmake';

const helloWorld = fs.parseFileSync(path.join(argv.npmDir, '/src/test/hello.yaml'));
describe('tmake', function () {
  this.timeout(120000);

  it('can clean the test folder', () => {
    fs.nuke(argv.runDir);
    return expect(fs.existsSync(argv.runDir))
      .to
      .equal(false);
  });

  it('can fetch a source tarball', () => {
    sh.mkdir('-p', argv.runDir);
    this.slow(1000);
    return execute(helloWorld, 'fetch', 'googletest').then(() => {
      const fp = path.join(argv.runDir, 'trie_modules/googletest/source');
      const file = fs.existsSync(fp);
      return expect(file)
        .to
        .equal(true, fp);
    });
  });

  // it('can build an existing cmake project', () => {
  //   this.slow(5000);
  //   return execute(helloWorld, 'all').then(() => {
  //     const file = fs.existsSync(path.join(argv.runDir, 'trie_modules/lib/libgtest.a'));
  //     return expect(file)
  //       .to
  //       .equal(true);
  //   });
  // });

  // it('can fetch a git repo', function() {
  //   this.slow(2000);
  //   return test({_: ['fetch']}).then(function() {
  //     const file = fs.existsSync(path.join(testArgv.runDir, 'source/README.md'));
  //     return expect(file)
  //       .to
  //       .equal(true);
  //   });
  // });

  // it('can configure a ninja build', () => test({_: ['configure']}).then(function() {
  //   const file = fs.existsSync(path.join(testArgv.runDir, 'build.ninja'));
  //   return expect(file)
  //     .to
  //     .equal(true);
  // }));
  //
  // it('can build configure an xcode project', function() {
  //   const args = {
  //     _: ['configure'],
  //     xcode: true,
  //     force: helloWorld.name
  //   };
  //   if (!_.contains(_tmake.platform.selectors, 'mac')) {
  //     return this.skip();
  //   } else {
  //     return test(args).then(function() {
  //       const file = fs.existsSync(path.join(testArgv.runDir, `${helloWorld.name}.xcodeproj/project.pbxproj`));
  //       return expect(file)
  //         .to
  //         .equal(true);
  //     });
  //   }
  // });
  //
  // it('can build using ninja', () => test({_: ['all']}).then(() => db.findOne({name: helloWorld.name})).then(dep => expect((dep.cache.bin || dep.cache.libs)).to.be.a('String')));
  //
  // it('run the built binary', () => sh.Promise(`./${helloWorld.name}`, (path.join(testArgv.runDir, 'bin')), true).then(function(res) {
  //   const results = res.split('\n');
  //   return expect(results[results.length - 2])
  //     .to
  //     .equal('Hello, world, from Visual C++!');
  // }));
  //
  // it('can push to the user local db', () => db.findOne({name: helloWorld.name}).then(dep => _tmake.link(dep)).then(() => userDb.findOne({name: helloWorld.name})).then(res => expect(res.name).to.equal(helloWorld.name)));
  //
  // it('can remove a link from the local db', () => userDb.findOne({name: helloWorld.name}).then(dep => _tmake.unlink(dep)).then(() => userDb.findOne({name: helloWorld.name})).then(dep => expect(dep).to.not.be.ok));
});
