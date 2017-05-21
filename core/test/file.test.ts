import { expect } from 'chai';
import * as path from 'path';
import { check } from 'typed-json-transform';
import {parseFileAsync} from '../src';

interface YamlConfig {
  git: any
  build: {
    matching: string[]
  }
}

describe('file', () => {
  it('can parse a yaml file', () => {
    return parseFileAsync('test/config/libbson.yaml')
      .then((_config) => {
        let config = <YamlConfig><any>_config;
        if (check(config, Error)) {
          throw config;
        }
        expect(config.git.repository)
          .to
          .equal('mongodb/libbson');
        expect(config.build.matching.length)
          .to
          .not
          .equal(0);
        return expect(config.build.matching[0])
          .to
          .equal('src/bson/**.c');
      });
  });
});
