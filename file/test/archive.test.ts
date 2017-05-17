import { expect } from 'chai';
import { join } from 'path';
import { check } from 'typed-json-transform';
import { readFileSync } from 'fs';

import { nuke, unarchive } from '../src';

interface YamlConfig {
  git: any
  build: {
    matching: string[]
  }
}

describe('zip', () => {
  before(() => {
    return nuke('test/results');
  });
  it('unzip', () => {
    console.log(process.cwd());
    return unarchive('test/archives/hello.zip', 'test/archives/tmp', 'test/archives/results')
      .then(() => {
        const hello = readFileSync('test/archives/results/hello', 'utf8');
        return expect(hello)
          .to
          .equal('hello world\n');
      });
  });
});