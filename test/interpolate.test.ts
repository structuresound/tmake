import { assert } from 'chai';
import { interpolate } from '../src/interpolate';

const data = {
  some: {
    thing: {
      nested: 7
    }
  },
  name: 'shallow man',
  object: {
    a: 'b',
    c: 'd'
  }
};

const testData = ['number {some.thing.nested}', 'maybe {name}, {name} will help?'];

const expectData = ['number 7', 'maybe shallow man, shallow man will help?'];

describe('interpolate', () => {
  it('keypath', () => {
    for (let i = 0; i < testData.length; i += 1) {
      assert.equal(interpolate(testData[i], data), expectData[i]);
    }
  });
  it('object', () => {
    assert.deepEqual(interpolate('{object}', data), data.object);
  });
});
