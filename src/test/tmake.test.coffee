###globals describe it###
expect = require('chai').expect
path = require('path')
Datastore = require('nedb-promise')
_ = require('underscore')
sh = require('../lib/util/sh')
fs = require('../lib/util/fs')

testArgv = require './testArgv'
db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()

{ helloWorld } = require './fixtures'

test = (args) ->
  argv = {}
  Object.assign argv, testArgv, args
  _runner = require('../lib/tmake')(argv, helloWorld, undefined, db, userDb, settingsDb)
  _runner.run()

describe 'tmake', ->
  @timeout 120000
  argv = {}
  Object.assign argv, testArgv
  _tmake = require('../lib/tmake')(argv, helloWorld, undefined, db, userDb, settingsDb)

  it 'can clean the test folder', ->
    fs.nuke testArgv.runDir
    expect(fs.existsSync testArgv.runDir).to.equal(false)

  it 'can fetch a source tarball', ->
    sh.mkdir '-p', testArgv.runDir
    @slow 1000
    test _: ["fetch", "googletest"]
    .then ->
      file = fs.existsSync path.join testArgv.runDir, 'trie_modules/googletest/source'
      expect(file).to.equal(true)

  it 'can build an existing cmake project', ->
    @slow 5000
    test _: ["all", "googletest"]
    .then ->
      file = fs.existsSync path.join testArgv.runDir, 'trie_modules/lib/libgtest.a'
      expect(file).to.equal(true)

  it 'can fetch a git repo', ->
    @slow 2000
    test _: ["fetch"]
    .then ->
      file = fs.existsSync path.join testArgv.runDir, "source/README.md"
      expect(file).to.equal(true)

  it 'can configure a ninja build', ->
    test _: ["configure"]
    .then ->
      file = fs.existsSync path.join testArgv.runDir, 'build.ninja'
      expect(file).to.equal(true)

  it 'can build configure an xcode project', ->
    args =
      _: ["configure"]
      xcode: true
      force: helloWorld.name
    unless _.contains _tmake.platform.selectors, 'mac'
      @skip()
    else
      test args
      .then ->
        file = fs.existsSync path.join testArgv.runDir, "#{helloWorld.name}.xcodeproj/project.pbxproj"
        expect(file).to.equal(true)

  it 'can build using ninja', ->
    test _: ["all"]
    .then ->
      db.findOne name: helloWorld.name
    .then (dep) ->
      expect((dep.cache.bin || dep.cache.libs)).to.be.a("String")

  it 'run the built binary', ->
    sh.Promise "./#{helloWorld.name}", (path.join testArgv.runDir, 'bin'), true
    .then (res) ->
      results = res.split('\n')
      expect(results[results.length-2]).to.equal 'Hello, world, from Visual C++!'

  it 'can push to the user local db', ->
    db.findOne name: helloWorld.name
    .then (dep) ->
      _tmake.link dep
    .then ->
      userDb.findOne name: helloWorld.name
    .then (res) ->
      expect(res.name).to.equal helloWorld.name

  it 'can remove a link from the local db', ->
    userDb.findOne name: helloWorld.name
    .then (dep) ->
      _tmake.unlink dep
    .then ->
      userDb.findOne name: helloWorld.name
    .then (dep) ->
      expect(dep).to.not.be.ok
