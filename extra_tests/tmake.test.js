/*globals describe it*/
import { expect } from 'chai';
import path from 'path';
import Datastore from 'nedb-promise';
import _ from 'lodash';
import sh from '../lib/util/sh';
import fs from '../lib/util/fs';

import testArgv from './testArgv';
const db = new Datastore();
const userDb = new Datastore();
const settingsDb = new Datastore();

import { helloWorld } from './fixtures';

const test = function(args) {
  const argv = {};
  Object.assign(argv, testArgv, args);
  const _runner = require('../lib/tmake')(argv, helloWorld, undefined, db, userDb, settingsDb);
  return _runner.run();
};

describe('tmake', function() {
  this.timeout(120000);
  const argv = {};
  Object.assign(argv, testArgv);
  const _tmake = require('../lib/tmake')(argv, helloWorld, undefined, db, userDb, settingsDb);

  it('can clean the test folder', function() {
    fs.nuke(testArgv.runDir);
    return expect(fs.existsSync(testArgv.runDir)).to.equal(false);
  });

  it('can fetch a source tarball', function() {
    sh.mkdir('-p', testArgv.runDir);
    this.slow(1000);
    return test({_: ["fetch", "googconstest"]})
    .then(function() {
      const file = fs.existsSync(path.join(testArgv.runDir, 'trie_modules/googconstest/source'));
      return expect(file).to.equal(true);
    });
  });

  it('can build an existing cmake project', function() {
    this.slow(5000);
    return test({_: ["all", "googconstest"]})
    .then(function() {
      const file = fs.existsSync(path.join(testArgv.runDir, 'trie_modules/lib/libgtest.a'));
      return expect(file).to.equal(true);
    });
  });

  it('can fetch a git repo', function() {
    this.slow(2000);
    return test({_: ["fetch"]})
    .then(function() {
      const file = fs.existsSync(path.join(testArgv.runDir, "source/README.md"));
      return expect(file).to.equal(true);
    });
  });

  it('can configure a ninja build', () =>
    test({_: ["configure"]})
    .then(function() {
      const file = fs.existsSync(path.join(testArgv.runDir, 'build.ninja'));
      return expect(file).to.equal(true);
    })
  );

  it('can build configure an xcode project', function() {
    const args = {
      _: ["configure"],
      xcode: true,
      force: helloWorld.name
    };
    if (!_.contains(_tmake.platform.selectors, 'mac')) {
      return this.skip();
    } else {
      return test(args)
      .then(function() {
        const file = fs.existsSync(path.join(testArgv.runDir, `${helloWorld.name}.xcodeproj/project.pbxproj`));
        return expect(file).to.equal(true);
      });
    }
  });

  it('can build using ninja', () =>
    test({_: ["all"]})
    .then(() => db.findOne({name: helloWorld.name}))
    .then(dep => expect((dep.cache.bin || dep.cache.libs)).to.be.a("String"))
  );

  it('run the built binary', () =>
    sh.Promise(`./${helloWorld.name}`, (path.join(testArgv.runDir, 'bin')), true)
    .then(function(res) {
      const results = res.split('\n');
      return expect(results[results.length-2]).to.equal('Hello, world, from Visual C++!');
    })
  );

  it('can push to the user local db', () =>
    db.findOne({name: helloWorld.name})
    .then(dep => _tmake.link(dep))
    .then(() => userDb.findOne({name: helloWorld.name}))
    .then(res => expect(res.name).to.equal(helloWorld.name))
  );

  return it('can remove a link from the local db', () =>
    userDb.findOne({name: helloWorld.name})
    .then(dep => _tmake.unlink(dep))
    .then(() => userDb.findOne({name: helloWorld.name}))
    .then(dep => expect(dep).to.not.be.ok)
  );
});
