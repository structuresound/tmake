interpolate = require '../lib/interpolate.js'
assert = require('chai').assert

data =
  some: thing: nested: 7
  name: 'shallow man'
  object:
    a: "b"
    c: "d"

testData = [
  'number {some.thing.nested}'
  'maybe {name}, {name} will help?'
]

expectData = [
  'number 7'
  'maybe shallow man, shallow man will help?'
]

describe 'interpolate', ->
  it 'keypath', ->
    for i of testData
      assert.equal interpolate(testData[i], data), expectData[i]
  it 'object', ->
    assert.deepEqual interpolate("{object}", data), data.object
