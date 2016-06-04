assert = require('chai').assert
_ = require('underscore')
_p = require("bluebird")
path = require('path')
sh = require('../lib/sh')
Datastore = require('nedb-promise')

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
  yes: true
  _: [
    'test'
  ]

conf =
  git: "structuresound/hello"
  configure:
    run: "echo running a shell command"
    with: "ninja"
  build:
    with: "ninja"

db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()

tmake = require('../lib/tmake')(argv, conf, undefined, db, userDb, settingsDb)

describe 'tmake', ->
  sh.mkdir '-p', argv.runDir
  @timeout 5000

  it 'can fetch a git repo', (done) ->
    tmake.execute conf, [ "fetch" ]
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.git.checkout
      done()

  it 'can fetch from the project db', (done) ->
    db.update
      name: "hello"
    ,
      $set: something: "nice"
    ,
      upsert: true
    .then ->
      db.findOne name: "hello"
    .then (res) ->
      assert.equal res.something, "nice"
      done()

  it 'can configure a build', (done) ->
    tmake.execute conf, [ 'configure' ]
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.configured
      done()

  it 'can build using ninja', (done) ->
    tmake.execute conf, [ 'build' ]
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.built
      done()

  it 'can push to the user local db', (done) ->
    @timeout 5000
    db.findOne name: "hello"
    .then (dep) ->
      tmake.link dep
    .then (res) ->
      userDb.findOne name: "hello"
    .then (res) ->
      assert.equal res.name, "hello"
      done()
