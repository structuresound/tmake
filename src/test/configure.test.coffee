###globals describe it###
{ expect } = require('chai')

path = require('path')
Datastore = require('nedb-promise')
sh = require('../lib/util/sh')
fs = require('../lib/util/fs')

db = new Datastore()
userDb = new Datastore()
settingsDb = new Datastore()

testArgv = require './testArgv'

test = (args) ->
  config = fs.parseFileSync "#{testArgv.npmDir}/src/test/configurations/libbson.yaml"
  argv = {}
  Object.assign argv, testArgv, args
  _runner = require('../lib/tmake')(argv, config, undefined, db, userDb, settingsDb)
  _runner.run()

describe 'configure', ->
  sh.mkdir '-p', testArgv.runDir
  @timeout 120000

  it 'can clean the test folder', ->
    fs.nuke testArgv.runDir
    expect(fs.existsSync(testArgv.runDir)).to.equal(false)

  it 'can replace strings in files', ->
    sh.mkdir '-p', testArgv.runDir
    @slow 1000
    test _: ["configure"]
    .then ->
      bconH = fs.readFileSync path.join(testArgv.runDir, 'trie_modules/include/libbson-1.0/bcon.h'), 'utf8'
      expect(bconH.includes("#include <libbson-1.0/bson.h>")).to.equal(true)
