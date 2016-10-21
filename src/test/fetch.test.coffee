###globals describe it###
expect = require('chai').expect
path = require('path')
Datastore = require('nedb-promise')
fs = require('../lib/util/fs')
{ stringHash } = require('../lib/util/hash')

testArgv = require './testArgv'

db = new Datastore()

{ helloWorld } = require './fixtures'
platform = require('../lib/dsl/platform')(testArgv, helloWorld)
toolchain = require('../lib/build/toolchain')(testArgv, helloWorld, platform, db)

describe 'toolchain', ->
  @timeout 120000
  ninjaVersion = "v1.7.1"
  hostChain = toolchain.select
    ninja:
      version: ninjaVersion
      url: "https://github.com/ninja-build/ninja/releases/download/{ninja.version}/ninja-{HOST_PLATFORM}.zip"

  it 'can parse toolchain correctly', ->
    expect(hostChain.ninja.name).to.equal("ninja")
    expect(hostChain.ninja.bin).to.equal("ninja")
    expect(hostChain.ninja.url).to.equal("https://github.com/ninja-build/ninja/releases/download/#{ninjaVersion}/ninja-#{platform.name()}.zip")

  it 'can fetch a zip', ->
    toolchain.fetch hostChain
    .then ->
      ninjaPath = toolchain.pathForTool hostChain.ninja
      expect(fs.existsSync ninjaPath).to.equal(true)

  it 'cached the zip to the right location', ->
    hash = stringHash hostChain.ninja.url
    cachePath = path.join(testArgv.userCache, "cache", hash)
    expect(fs.existsSync cachePath).to.equal(true)

  it 'put the executable in the right place', ->
    ninjaPath = toolchain.pathForTool hostChain.ninja
    hash = stringHash hostChain.ninja.url
    expect(ninjaPath).to.equal(path.join(testArgv.userCache, "toolchain", "ninja", hash, "ninja"))
    expect(fs.existsSync ninjaPath).to.equal(true)
