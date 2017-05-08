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
    return unarchive('test/archives/hello.zip', 'test/tmp', 'test/results')
      .then(() => {
        const hello = readFileSync('test/results/hello', 'utf8');
        return expect(hello)
          .to
          .equal('hello world\n');
      });
  });
});