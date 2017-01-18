import { expect, assert } from 'chai';
import path from 'path';
import fs from 'fs';
import file from '../lib/file';
import args from '../lib/util/args';
import { log } from '../lib/util/log';

import { graph } from '../lib/graph';
import { fetch } from '../lib/fetch';
import { configure } from '../lib/configure';
import { findAndClean } from '../lib/tmake';

describe('configure', function () {
  this.timeout(120000);
  let libbson;
  before(() => {
    return file.parseFileAsync(path.join(args.npmDir, '/src/test/libbson.yaml'))
      .then((config) => {
        return graph(config).then((res) => {
          libbson = res[0];
          return expect(libbson.name).to.equal('libbson', 'parse file: ');
        });
      });
  });

  it('can clean the test folder', () => {
    file.nuke(args.runDir);
    return expect(fs.existsSync(args.runDir)).to.equal(false);
  });

  it('can fetch repo to configure', () => {
    return fetch(libbson).then(() => {
      const fp = path.join(args.runDir, 'source/src/bson/bson-version.h.in');
      return expect(fs.existsSync(fp)).to.equal(true, fp);
    });
  });

  it('can replace files for environment', () => {
    return configure(libbson.environments[0]).then(() => {
      const fp = path.join(args.runDir, 'source/src/bson/bson-version.h');
      assert.ok(fs.existsSync(fp));
      const str = fs.readFileSync(fp, 'utf8');
      return expect(str.includes('@BSON_MAJOR_VERSION@')).to.equal(false);
    });
  });
});
