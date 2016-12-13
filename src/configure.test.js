// import {expect} from 'chai';
//
// import args from '../lib/util/args';
// import sh from '../lib/util/sh';
// import fs from '../lib/util/fs';

if (process.env.NODE_ENV === 'test') {
  describe('configure', function configure() {
    // sh.mkdir('-p', args.runDir);
    this.timeout(120000);
    this.slow(1000);
    // it('can clean the test folder', () => {
    //   fs.nuke(args.runDir);
    //   return expect(fs.existsSync(args.runDir))
    //     .to
    //     .equal(false);
    // });

    // it('can replace strings in files', () => {
    //   sh.mkdir('-p', args.runDir);
    //   return tmake
    //     .run('configure')
    //     .then(() => {
    //       const bconH = fs.readFileSync(path.join(args.runDir, 'trie_modules/include/libbson-1.0/bcon.h'), 'utf8');
    //       return expect(bconH.includes('#include <libbson-1.0/bson.h>'))
    //         .to
    //         .equal(true);
    //     });
    // });
  });
}
