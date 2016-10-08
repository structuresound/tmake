###globals describe it###

expect = require('chai').expect
assert = require('chai').assert
cascade = require '../lib/dsl/cascade.js'

selectors = ['win', 'mac', 'linux', 'ios', 'android', 'x64', 'x86', 'simulator', 'clang', 'gcc', 'clion']

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
  'mac ios':
    flag: true
  other: "setting"
  build:
    with: "error A"
    'mac ios':
      sources:
        matching: [ 'apple.c' ]
    mac:
      with: "cmake"
  x64:
    build:
      with: "error C"
      mac:
        with: "ninja"
        clion:
          with: "cmake"
  win:
    build:
      with:
        x64: "clang"
        x86: "gcc"

testBSelectors = [
  ['mac', 'x64']
  ['mac', 'x64', 'clion']
  ['win']
  ['win', 'x64']
]

testBExpected = [
  flag: true
  other: "setting"
  build:
    with: "ninja"
    sources: matching: [ 'apple.c' ]
,
  flag: true
  other: "setting"
  build:
    with: "cmake"
    sources: matching: [ 'apple.c' ]
,
  build: with: "error A"
  other: "setting"
,
  build: with: "clang"
  other: "setting"
]

stdCompilerFlags =
  clang:
    ios:
      arch: "arm64"
    arch: "x86"

testCSelectors = [
  ['ios', 'clang']
  ['linux', 'gcc']
]

testCExpected = [
  arch: "arm64"
,
  {}
]

describe 'check', ->
  it 'matches selectors', (done) ->
    assert.ok cascade.matchesSelectors ['ios', 'mac', 'win'], 'x86 mac win'
    assert.ok cascade.matchesSelectors ['ios', 'mac', 'win'], 'ios'
    done()
  it 'doesnt match selectors', (done) ->
    assert.ok !cascade.matchesSelectors ['apple', 'bananna'], 'x86'
    assert.ok !cascade.matchesSelectors ['apple', 'bananna'], ['x86', 'ios']
    done()
  it 'cascade selectors shallow', (done) ->
    for i of testASelectors
      assert.deepEqual cascade.shallow(testAObject, selectors, testASelectors[i]), testAExpected[i]
    done()
  it 'cascade selectors deep', ->
    for i of testBSelectors
      expect(cascade.deep(testObjB, selectors, testBSelectors[i])).to.deep.equal testBExpected[i]
    for i of testCSelectors
      expect(cascade.deep(stdCompilerFlags, selectors, testCSelectors[i])).to.deep.equal testCExpected[i]