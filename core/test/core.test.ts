import { assert } from 'chai';
import { args } from '../src';

describe('test environment', function () {
  it('has a cache path', () => {
    assert.ok(args.cachePath);
  });
});