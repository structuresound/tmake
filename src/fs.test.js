import {expect} from 'chai';
import path from 'path';
import {check, diff as __} from 'js-object-tools';
import fs from '../lib/util/fs';
import argv from '../lib/util/argv';

describe('fs', () => {
  it('can parse a yaml file', () => {
    return fs
      .parseFileAsync(path.join(argv.npmDir, '/src/test/libbson.yaml'))
      .then((config) => {
        if (check(config, Error)) {
          throw config;
        }
        expect(config.git.repository)
          .to
          .equal('mongodb/libbson');
        expect(config.build.sources.matching.length)
          .to
          .not
          .equal(0);
        return expect(config.build.sources.matching[0])
          .to
          .equal('src/bson/**.c');
      });
  });
});
