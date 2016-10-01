###globals describe it###
expect = require('chai').expect
path = require('path')
Datastore = require('nedb-promise')
_ = require('underscore')
sh = require('../lib/util/sh')
fs = require('../lib/util/fs')

npmDir = process.cwd()
runDir = path.join process.cwd(), 'tests'
binDir = path.join process.cwd(), 'bin'

argv = ->
  runDir: runDir
  binDir: binDir
  userCache: path.join runDir, '/fake_cache'
  cachePath: "trie_modules"
  npmDir: npmDir
  pgname: "tmake"
  quiet: true
  verbose: false
  test: true
  yes: true
  _: []

conf = ->
  name: 'hello'
  git: "structuresound/hello"
  target: "bin"
  build:
    with: "ninja"
    xcode:
      with: "xcode"
  deps: [
    git:
      repository: "google/googletest"
      archive: "release-1.7.0"
    build:
      with: "cmake"
    path:
      project: "source"
  ]

db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()

test = (args) ->
  _args = _.extend argv(), args
  _runner = require('../lib/tmake')(_args, conf(), undefined, db, userDb, settingsDb)
  _runner.run()

describe 'tmake', ->
  fs.nuke runDir
  sh.mkdir '-p', runDir
  @timeout 60000
  _tmake = require('../lib/tmake')(argv(), conf(), undefined, db, userDb, settingsDb)

  it 'can fetch a source tarball', ->
    @slow 1000
    test _: ["fetch", "googletest"]
    .then ->
      file = fs.existsSync path.join runDir, 'trie_modules/googletest/source'
      expect(file).to.equal(true)

  it 'can build an existing cmake project', ->
    @slow 5000
    test _: ["all", "googletest"]
    .then ->
      file = fs.existsSync path.join runDir, 'trie_modules/lib/libgtest.a'
      expect(file).to.equal(true)

  it 'can fetch a git repo', ->
    @slow 2000
    test _: ["fetch"]
    .then ->
      db.findOne name: conf().name
    .then (dep) ->
      expect(dep.cache.git.checkout).to.equal("master")

  it 'can configure a ninja build', ->
    test _: ["configure"]
    .then ->
      file = fs.existsSync path.join runDir, 'build.ninja'
      expect(file).to.equal(true)

  it 'can build configure an xcode project', ->
    args =
      _: ["configure"]
      xcode: true
      force: conf().name
    unless _.contains _tmake.platform.selectors, 'mac'
      @skip()
    else
      test args
      .then ->
        file = fs.existsSync path.join runDir, "#{conf().name}.xcodeproj/project.pbxproj"
        expect(file).to.equal(true)

  it 'can build using ninja', ->
    test _: ["all"]
    .then ->
      db.findOne name: conf().name
    .then (dep) ->
      expect(dep.cache.built).to.equal(true)

  it 'run the built binary', ->
    sh.Promise "./#{conf().name}", (path.join runDir, 'bin'), true
    .then (res) ->
      results = res.split('\n')
      expect(results[results.length-2]).to.equal 'Hello, world, from Visual C++!'

  it 'can push to the user local db', ->
    db.findOne name: conf().name
    .then (dep) ->
      _tmake.link dep
    .then ->
      userDb.findOne name: conf().name
    .then (res) ->
      expect(res.name).to.equal conf().name

  it 'can remove a link from the local db', ->
    userDb.findOne name: conf().name
    .then (dep) ->
      _tmake.unlink dep
    .then ->
      userDb.findOne name: conf().name
    .then (dep) ->
      expect(dep).to.not.be.ok
