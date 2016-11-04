import interpolate from '../lib/dsl/interpolate';
import { assert } from 'chai';

const data = {
  some: { thing: { nested: 7
}
},
  name: 'shallow man',
  object: {
    a: "b",
    c: "d"
  }
};

const testData = [
  'number {some.thing.nested}',
  'maybe {name}, {name} will help?'
];

const expectData = [
  'number 7',
  'maybe shallow man, shallow man will help?'
];

describe('interpolate', function() {
  it('keypath', () =>
    (() => {
      const result = [];
      for (const i in testData) {
        result.push(assert.equal(interpolate(testData[i], data), expectData[i]));
      }
      return result;
    })());
  return it('object', () => assert.deepEqual(interpolate("{object}", data), data.object));
});
