###
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
###

cascade = require '../lib/cascade.js'

selectors = ['win', 'mac', 'x64', 'x86']

testAObject =
  useAccel: 0
  win:
    useAccel: 1
    x86:
      useAccel: 2
    x64:
      useAccel: 3
  mac:
    useAccel: 4
    x86:
      useAccel: 5
    x64:
      useAccel: 6

testASelectors = [
  ['mac', 'x64']
  ['win']
  ['win', 'x64']
]

testAExpected = [
  useAccel: 6
,
  useAccel: 1
,
  useAccel: 3
]

testObjB =
  build:
    with: "error A"
  mac:
    build:
      with: "cmake"
  x64:
    build:
      with: "error C"
      mac:
        with: "ninja"
  win:
    build:
      with:
        x64: "clang"
        x86: "gcc"

testBSelectors = [
  ['mac', 'x64']
  ['win']
  ['win', 'x64']
]

testBExpected = [
  build: with: "ninja"
,
  build: with: "error A"
,
  build: with: "clang"
]


exports['cascade'] =
  setUp: (done) -> done()
  'parse shallow': (test) ->
    for i of testASelectors
      test.deepEqual cascade.shallow(testAObject, selectors, testASelectors[i]), testAExpected[i]
    test.done()
  'parse deep': (test) ->
    for i of testBSelectors
      test.deepEqual cascade.deep(testObjB, selectors, testBSelectors[i]), testBExpected[i]
    test.done()
