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
    macro: 'OS_ENDIANNESS'
    map:
      LE: 1234
      BE: 4321
  'ios mac':
    OSX_SDK_VERSION: "$(xcrun --sdk macosx --show-sdk-version)"
    OPENSSL_VERSION: "1.0.1"
  configure:
    win:
      echo: 'echo win world'
    'mac ios':
      with: "ninja"
      echo: 'echo apple world'
    mac:
      cmd: "./Configure {OSX_SDK_VERSION} --openssldir=\"/tmp/openssl-{OPENSSL_VERSION}\""
    keyword: "don't run this"

describe 'parse', ->
  platform = require('../lib/platform')(argv, depA)
  assert.ok _.contains platform.selectors(), platform.name()
  cascade = require '../lib/cascade.js'

  depA = cascade.deep depA, platform.keywords(), platform.selectors()
  parse = require('../lib/parse')(depA, argv)

  it 'will cascade / reduce the configuration', ->
    assert.equal depA.configure.keyword, "don't run this"
    if _.contains platform.selectors(), 'mac'
      assert.equal depA.OSX_SDK_VERSION, "$(xcrun --sdk macosx --show-sdk-version)"
      assert.equal depA.configure.echo, 'echo apple world'
    else if _.contains platform.selectors(), 'ios'
      assert.equal depA.OSX_SDK_VERSION, "$(xcrun --sdk macosx --show-sdk-version)"
      assert.equal depA.configure.echo, 'echo apple world'
    else if _.contains platform.selectors(), 'win'
      assert.equal depA.configure.echo, 'echo win world'

  it 'can interpolate a shell command to a string', ->
    assert.equal parse.configSetting("$(echo {HELLO}) {WORLD}"), "hello world"

  it 'replaces and maps', ->
    assert.equal parse.configSetting("{BSON_BYTE_ORDER}"), 1234

  it 'iterates a command object', ->
    commandObject =
      echo: -> return 7

    keywords = ['keyword', 'with', 'cmd']
    parse.iterate(depA.configure, commandObject, keywords)
    .then (res) ->
      expect(res[0].obj).to.equal('echo apple world')

  it 'resolves shell commands to variables', ->
    if _.contains platform.selectors(), 'mac'
      assert.equal depA.OSX_SDK_VERSION, "$(xcrun --sdk macosx --show-sdk-version)"
      OSX_SDK_VERSION = parse.configSetting(depA.OSX_SDK_VERSION)
      console.log colors.magenta "OSX_SDK_VERSION = #{OSX_SDK_VERSION}"
      assert.equal parse.configSetting(depA.configure.cmd), "./Configure #{OSX_SDK_VERSION} --openssldir=\"/tmp/openssl-1.0.1\""
    unless _.contains platform.selectors(), 'win'
      assert.equal parse.configSetting("$(which gcc)"), depA.CC
