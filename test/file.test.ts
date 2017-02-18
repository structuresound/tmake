import { expect } from 'chai';
import * as path from 'path';
import { check } from 'js-object-tools';
import * as file from '../src/file';
import { args } from '../src/args';

describe('file', () => {
  it('can parse a yaml file', () => {
    return file
      .parseFileAsync(path.join(args.npmDir, 'test/config/libbson.yaml'))
      .then((config) => {
        if (check(config, Error)) {
          throw config;
        }
        expect(config.git.repository)
          .to
          .equal('mongodb/libbson');
        expect(config.build.sources.length)
          .to
          .not
          .equal(0);
        return expect(config.build.sources[0])
          .to
          .equal('src/bson/**.c');
      });
  });
});
