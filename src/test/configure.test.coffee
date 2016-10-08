###globals describe it###
{ expect } = require('chai')

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

db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()


test = (args) ->
  config = fs.parseFileSync "#{npmDir}/src/test/fixtures/libbson.yaml"
  _args = _.extend argv(), args
  _runner = require('../lib/tmake')(_args, config, undefined, db, userDb, settingsDb)
  _runner.run()

describe 'configure', ->
  sh.mkdir '-p', runDir
  @timeout 60000

  it 'can clean the test folder', ->
    fs.nuke runDir
    expect(fs.existsSync runDir).to.equal(false)

  it 'can replace strings in files', ->
    sh.mkdir '-p', runDir
    @slow 1000
    test _: ["configure"]
    .then ->
      bconH = fs.readFileSync path.join(runDir, 'trie_modules/include/libbson-1.0/bcon.h'), 'utf8'
      expect(bconH.includes("#include <libbson-1.0/bson.h>")).to.equal(true)
