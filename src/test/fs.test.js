/*globals describe it*/
import check from '../lib/util/check';
import fs from '../lib/util/fs';
import { expect } from 'chai';

import testArgv from './testArgv';

describe('fs', () =>
  it('can parse a yaml file', () =>
    fs.parseFileAsync(`${testArgv.npmDir}/src/test/configurations/libbson.yaml`)
    .then(function(config) {
      if (check(config, Error)) { throw config; }
      expect(config.git.repository).to.equal("mongodb/libbson");
      expect(config.build.sources.matching.length).to.not.equal(0);
      return expect(config.build.sources.matching[0]).to.equal("src/bson/**.c");
    })
  )
);
