###globals describe it###
assert = require('chai').assert
expect = require('chai').expect
_ = require 'underscore'
colors = require ('chalk')

argv =
  runDir: process.cwd()
  cachePath: "trie_modules"

depA =
  name: "assert"
  git: "hello/world"
  HELLO: "hello"
  WORLD: "world"
  CC: "/usr/bin/gcc"
  BSON_BYTE_ORDER:
    macro: "{OS_ENDIANNESS}"
    map:
      LE: 1234
      BE: 4321
  OPENSSL_VERSION: "1.0.1"
  configure:
    linux:
      echo: 'echo linux world'
    win:
      echo: 'echo win world'
    'mac ios':
      with: "ninja"
      echo: 'echo apple world'
    mac:
      cmd: "./Configure {OSX_SDK_VERSION} --openssldir=\"/tmp/openssl-{OPENSSL_VERSION}\""
    keyword: "don't run this"

describe 'platform', ->
  platform = require('../lib/dsl/platform')(argv, depA)
  assert.ok _.contains platform.selectors(), platform.name()
  cascade = require '../lib/dsl/cascade.js'
  depA = platform.parse cascade.deep(depA, platform.keywords(), platform.selectors())

  it 'will parse the configuration based on self and platform selectors', ->
    assert.equal depA.configure.keyword, "don't run this"
    if _.contains platform.selectors(), 'mac'
      assert.equal depA.configure.echo, 'echo apple world'
    else if _.contains platform.selectors(), 'ios'
      assert.equal depA.configure.echo, 'echo apple world'
    else if _.contains platform.selectors(), 'win'
      assert.equal depA.configure.echo, 'echo win world'

  it 'can interpolate a shell command to a string', ->
    assert.equal platform.parse("$(echo {HELLO}) {WORLD}", depA), "hello world"

  it 'can parse a user defined macro', ->
    assert.equal platform.parse("{BSON_BYTE_ORDER}", depA), 1234

  it 'iterates a command object', ->
    commandObject =
      echo: -> return 7

    keywords = ['keyword', 'with', 'cmd']
    platform.iterate(depA.configure, commandObject, keywords)
    .then (res) ->
      if _.contains platform.selectors(), 'mac'
        expect(res[0].obj).to.equal('echo apple world')
      if _.contains platform.selectors(), 'linux'
        expect(res[0].obj).to.equal('echo linux world')
