assert = require('chai').assert

argv =
  runDir: process.cwd()
  cachePath: "trie_modules"

graph = require('../lib/graph.js')(argv, undefined, argv.runDir)
path = require('path')
cascade = require('../lib/cascade')

data =
  pathArgument: "hello"

depA =
  name: "assert"
  git: "hello/world"
  HELLO: "hello"
  WORLD: "world"
  BSON_BYTE_ORDER:
    macro: 'OS_ENDIANNESS'
    map:
      LE: 1234
      BE: 4321
  'mac ios':
    OSX_SDK_VERSION: "${xcrun --sdk macosx --show-sdk-version}"
    OPENSSL_VERSION: "1.0.1"
  cmd: "./Configure {{OSX_SDK_VERSION}} --openssldir=\"/tmp/openssl-{{OPENSSL_VERSION}}\""
  configure:
    echo: 'echo hello'
    keyword: "don't run this"

describe 'parse', ->
  platform = require('../lib/platform')(argv, depA)
  depA = cascade.deep depA, platform.keywords(), platform.selectors()
  parse = require('../lib/parse')(depA)

  it 'replaces and maps', ->
    assert.equal parse.configSetting("{{BSON_BYTE_ORDER}}"), 1234

  it 'iterates a command object', (done) ->
    commandObject =
      echo: -> return 7

    keywords = ['keyword']
    parse.iterate(depA.configure, commandObject, keywords)
    .then (res) ->
      assert.deepEqual res, [ 7 ]
      done()

  it 'executes shell commands', ->
    assert.equal parse.configSetting("${echo {{HELLO}}} {{WORLD}}"), "hello world"
    assert.equal parse.configSetting(depA.cmd), "./Configure 10.11 --openssldir=\"/tmp/openssl-1.0.1\""
