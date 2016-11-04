/*globals describe it*/
import { expect } from 'chai';

import path from 'path';
import Datastore from 'nedb-promise';
import sh from '../lib/util/sh';
import fs from '../lib/util/fs';

const db = new Datastore();
const userDb = new Datastore();
const settingsDb = new Datastore();

import testArgv from './testArgv';

const test = function(args) {
  const config = fs.parseFileSync(`${testArgv.npmDir}/src/test/configurations/libbson.yaml`);
  const argv = {};
  Object.assign(argv, testArgv, args);
  const _runner = require('../lib/tmake')(argv, config, undefined, db, userDb, settingsDb);
  return _runner.run();
};

describe('configure', function() {
  sh.mkdir('-p', testArgv.runDir);
  this.timeout(120000);

  it('can clean the test folder', function() {
    fs.nuke(testArgv.runDir);
    return expect(fs.existsSync(testArgv.runDir)).to.equal(false);
  });

  return it('can replace strings in files', function() {
    sh.mkdir('-p', testArgv.runDir);
    this.slow(1000);
    return test({_: ["configure"]})
    .then(function() {
      const bconH = fs.readFileSync(path.join(testArgv.runDir, 'trie_modules/include/libbson-1.0/bcon.h'), 'utf8');
      return expect(bconH.includes("#include <libbson-1.0/bson.h>")).to.equal(true);
    });
  });
});
