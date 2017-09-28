import { expect } from 'chai';
import 'mocha';
import { join } from 'path';
import { check } from 'typed-json-transform';
import { readFileSync } from 'fs';

import { nuke, unarchive } from 'tmake-core';

interface YamlConfig {
  git: any
  build: {
    matching: string[]
  }
}

describe('archive', () => {
  before(() => {
    return nuke('cache/archives');
  });
  it('unzip', () => {
    console.log(process.cwd());
    return unarchive('src/archives/hello.zip', '.tmake/archives/tmp', '.tmake/archives/results')
      .then(() => {
        const hello = readFileSync('.tmake/archives/results/hello', 'utf8');
        return expect(hello)
          .to
          .equal('hello world\n');
      });
  });
});
