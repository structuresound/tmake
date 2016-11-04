/*globals describe it*/
import check from '../lib/util/check';
import { assert } from 'chai';

const data = {
  object: {},
  objectArray: {'0': 'value'},
  array: [],
  number: 1,
  stringNumber: "1",
  complexStringNumber: "1.0.1",
  string: "hello",
  error: new SyntaxError()
};

describe('check', function() {
  it('object', function() {
    assert.ok(check(data.object, Object));
    assert.ok(!check(data.object, Array));
    assert.ok(!check(data.objectArray, Array));
    assert.ok(!check(data.object, String));
    return assert.ok(!check(data.object, Number));
  });
  it('array', function() {
    assert.ok(!check(data.array, Object));
    assert.ok(check(data.array, Array));
    assert.ok(!check(data.array, String));
    return assert.ok(!check(data.array, Number));
  });

  it('string', function() {
    assert.ok(!check(data.string, Object));
    assert.ok(!check(data.string, Array));
    assert.ok(check(data.string, String));
    assert.ok(!check(data.stringNumber, String));
    assert.ok(check(data.complexStringNumber, String));
    return assert.ok(!check(data.string, Number));
  });

  it('number', function() {
    assert.ok(!check(data.number, Object));
    assert.ok(!check(data.number, Array));
    assert.ok(!check(data.number, String));
    assert.ok(check(data.number, Number));
    assert.ok(check(data.stringNumber, Number));
    return assert.ok(!check(data.complexStringNumber, Number));
  });

  return it('error', function() {
    assert.ok(!check(data.error, Object));
    assert.ok(!check(data.error, Array));
    assert.ok(!check(data.error, String));
    assert.ok(!check(data.error, Number));
    return assert.ok(check(data.error, "Error"));
  });
});
