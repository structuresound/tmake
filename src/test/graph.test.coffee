###global it describe###
path = require('path')
expect = require('chai').expect

testArgv = require './testArgv'

graph = require('../lib/graph')(testArgv)
path = require('path')

{ depA } = require './fixtures'
{ depB } = require './fixtures'

describe 'graph', ->
  it 'source/include', ->
    graph.resolvePaths depA
    .then (resolved) ->
      expect(resolved.d.includeDirs[0]).to.equal path.join(testArgv.runDir, "#{testArgv.cachePath}/#{depA.name}/source/include")

  it 'dynamic includeDirs', ->
    graph.resolvePaths depB
    .then (resolved) ->
      expect(resolved.d.includeDirs).to.deep.equal [
        path.join(testArgv.runDir, "#{testArgv.cachePath}/#{depB.name}/testIncludeDir")
        path.join(testArgv.runDir, "#{testArgv.cachePath}/#{depB.name}/another")
      ]
