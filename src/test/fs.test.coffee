###globals describe it###
check = require '../lib/util/check'
fs = require('../lib/util/fs')
{ expect } = require('chai')

npmDir = process.cwd()

describe 'fs', ->
  it 'can parse a yaml file', ->
    fs.parseFileAsync "#{npmDir}/src/test/fixtures/libbson.yaml"
    .then (config) ->
      throw config if check config, Error
      expect(config.git.repository).to.equal("mongodb/libbson")
      expect(config.build.sources.matching.length).to.not.equal(0)
      expect(config.build.sources.matching[0]).to.equal("src/bson/**.c")
