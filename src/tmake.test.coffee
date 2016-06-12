assert = require('chai').assert
_ = require('underscore')
_p = require("bluebird")
path = require('path')
Datastore = require('nedb-promise')

sh = require('../lib/sh')
fs = require('../lib/fs')

npmDir = process.cwd()
runDir = path.join process.cwd(), 'tests'

argv =
  runDir: runDir
  userCache: path.join runDir, '/fake_cache'
  cachePath: "trie_modules"
  npmDir: npmDir
  pgname: "tmake"
  quiet: true
  verbose: false
  test: true
  yes: true
  _: [
    'test'
  ]

conf =
  git: "structuresound/hello"
  target: "bin"
  build:
    with: "ninja"
  deps: [
    git:
      repository: "google/googletest"
      archive: "release-1.7.0"
    build:
      with: "cmake"
    path:
      project: "googletest-release-1.7.0"
  ]

db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()

describe 'tmake', ->
  fs.nuke runDir
  sh.mkdir '-p', argv.runDir
  @timeout 60000

  tmake = require('../lib/tmake')(argv, conf, undefined, db, userDb, settingsDb)

  it 'can fetch a source tarball', (done) ->
    argv._[0] = "fetch"
    argv._[1] = "googletest"
    tmake.run()
    .then (res) ->
      assert.ok fs.existsSync path.join argv.runDir, 'trie_modules/googletest'
      done()

  it 'can build google test', (done) ->
    argv._[0] = "all"
    argv._[1] = "googletest"
    tmake.run()
    .then ->
      db.findOne name: "googletest"
    .then (dep) ->
      assert.ok dep.cache.installed
      done()

  it 'can fetch a git repo', (done) ->
    argv._[0] = "fetch"
    argv._[1] = ""
    tmake.run()
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.git.checkout
      done()

  it 'can configure a build', (done) ->
    argv._[0] = "configure"
    argv._[1] = ""
    tmake.run()
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.configured
      done()

  it 'can build using ninja', (done) ->
    argv._[0] = "all"
    argv._[1] = ""
    tmake.run()
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.built
      done()

  it 'run the built binary', (done) ->
    sh.Promise './hello', (path.join runDir, 'bin'), true
    .then (res) ->
      results = res.split('\n')
      assert.equal results[results.length-2], 'Hello, world, from Visual C++!'
      done()

  it 'can push to the user local db', (done) ->
    db.findOne name: "hello"
    .then (dep) ->
      tmake.link dep
    .then (res) ->
      userDb.findOne name: "hello"
    .then (res) ->
      assert.equal res.name, "hello"
      done()
