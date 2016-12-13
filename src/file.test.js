import {expect} from 'chai';
import path from 'path';
import {check} from 'js-object-tools';
import file from '../lib/util/file';
import args from '../lib/util/args';

describe('file', () => {
  it('can parse a yaml file', () => {
    return file
      .parseFileAsync(path.join(args.npmDir, '/src/test/libbson.yaml'))
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
