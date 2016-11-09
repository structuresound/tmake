import {expect} from 'chai';
import path from 'path';
// import Datastore from 'nedb-promise';

import argv from '../lib/util/argv';
import sh from '../lib/util/sh';
import fs from '../lib/util/fs';

import tmake from '../lib/tmake';

if (process.env.NODE_ENV === 'test') {
  describe('configure', function() {
    sh.mkdir('-p', argv.runDir);
    this.timeout(120000);
    this.slow(1000);
    it('can clean the test folder', () => {
      fs.nuke(argv.runDir);
      return expect(fs.existsSync(argv.runDir))
        .to
        .equal(false);
    });

    it('can replace strings in files', () => {
      sh.mkdir('-p', argv.runDir);
      return tmake
        .run('configure')
        .then(() => {
          const bconH = fs.readFileSync(path.join(argv.runDir, 'trie_modules/include/libbson-1.0/bcon.h'), 'utf8');
          return expect(bconH.includes('#include <libbson-1.0/bson.h>'))
            .to
            .equal(true);
        });
    });
  });
}
