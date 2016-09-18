###globals describe it###
expect = require('chai').expect
path = require('path')
Datastore = require('nedb-promise')
check = require '../lib/check'
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
      project: "source"
  ]

db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()

describe 'tmake', ->
  fs.nuke runDir
  sh.mkdir '-p', argv.runDir
  @timeout 60000

  tmake = require('../lib/tmake')(argv, conf, undefined, db, userDb, settingsDb)

  it 'can fetch a source tarball', ->
    argv._[0] = "fetch"
    argv._[1] = "googletest"
    tmake.run()
    .then ->
      file = fs.existsSync path.join argv.runDir, 'trie_modules/googletest/source'
      expect(file).to.equal(true)

  it 'can build google test', ->
    argv._[0] = "all"
    argv._[1] = "googletest"
    tmake.run()
    .then ->
      db.findOne name: "googletest"
    .then (dep) ->
      expect(dep.cache.installed).to.equal(true)

  it 'can fetch a git repo', ->
    argv._[0] = "fetch"
    argv._[1] = ""
    tmake.run()
    .then ->
      db.findOne name: "hello"
    .then (dep) ->
      expect(dep.cache.git.checkout).to.be.a('string')

  it 'can configure a build', ->
    argv._[0] = "configure"
    argv._[1] = ""
    tmake.run()
    .then ->
      db.findOne name: "hello"
    .then (dep) ->
      expect(dep.cache.configured).to.equal(true)

  it 'can build using ninja', ->
    argv._[0] = "all"
    argv._[1] = ""
    tmake.run()
    .then ->
      db.findOne name: "hello"
    .then (dep) ->
      expect(dep.cache.built).to.equal(true)

  it 'run the built binary', ->
    sh.Promise './hello', (path.join runDir, 'bin'), true
    .then (res) ->
      results = res.split('\n')
      expect(results[results.length-2]).to.equal 'Hello, world, from Visual C++!'

  it 'can push to the user local db', ->
    db.findOne name: "hello"
    .then (dep) ->
      tmake.link dep
    .then ->
      userDb.findOne name: "hello"
    .then (res) ->
      expect(res.name).to.equal "hello"

  it 'can remove a link from the local db', ->
    userDb.findOne name: "hello"
    .then (dep) ->
      tmake.unlink dep
    .then ->
      userDb.findOne name: "hello"
    .then (dep) ->
      expect(dep).to.not.be.ok
