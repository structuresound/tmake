check = require '../lib/check'
assert = require('chai').assert

data =
  object: {}
  objectArray: {'0': 'value'}
  array: []
  number: 1
  stringNumber: "1"
  complexStringNumber: "1.0.1"
  string: "hello"
  error: new SyntaxError()

describe 'check', ->
  it 'object', ->
    assert.ok check(data.object, Object)
    assert.ok !check(data.object, Array)
    assert.ok !check(data.objectArray, Array)
    assert.ok !check(data.object, String)
    assert.ok !check(data.object, Number)
  it 'array', ->
    assert.ok !check(data.array, Object)
    assert.ok check(data.array, Array)
    assert.ok !check(data.array, String)
    assert.ok !check(data.array, Number)

  it 'string', ->
    assert.ok !check(data.string, Object)
    assert.ok !check(data.string, Array)
    assert.ok check(data.string, String)
    assert.ok !check(data.stringNumber, String)
    assert.ok check(data.complexStringNumber, String)
    assert.ok !check(data.string, Number)

  it 'number', ->
    assert.ok !check(data.number, Object)
    assert.ok !check(data.number, Array)
    assert.ok !check(data.number, String)
    assert.ok check(data.number, Number)
    assert.ok check(data.stringNumber, Number)
    assert.ok !check(data.complexStringNumber, Number)

  it 'error', ->
    assert.ok !check(data.error, Object)
    assert.ok !check(data.error, Array)
    assert.ok !check(data.error, String)
    assert.ok !check(data.error, Number)
    assert.ok check(data.error, "Error")
