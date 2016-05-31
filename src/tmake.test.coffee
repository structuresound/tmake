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

pit = (desc, fn) ->
  it desc, (done) ->
    fn.bind(this)()
    .then -> done()
    .catch (e) -> done(e)

faker = timeout: -> true

_tests = {}
we = (desc, fn) -> _tests[desc] = fn

test = -> _.each _tests, (v, k) ->
  if v.test then pit k, v.test
  else pit k, v

run = -> _.each _tests, (v, k) ->
  if v.run then v.run()
  else
    (v.thaw || v).bind(faker)()

describe 'tmake', ->
  sh.mkdir '-p', argv.runDir

  we 'can fetch a git repo',
    test: ->
      @timeout 5000
      tmake.execute conf, [ "fetch" ]

  we 'can fetch from the project db', ->
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

  we 'can configure a build', ->
    tmake.execute conf, [ 'configure' ]
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.configured

  we 'can build using ninja', ->
    tmake.execute conf, [ 'build' ]
    .then (res) ->
      db.findOne name: "hello"
    .then (dep) ->
      assert.ok dep.cache.built

  we 'can push to the user local db', ->
    @timeout 5000
    db.findOne name: "hello"
    .then (dep) ->
      tmake.link dep
    .then (res) ->
      userDb.findOne name: "hello"
    .then (res) ->
      assert.equal res.name, "hello"

  test()
