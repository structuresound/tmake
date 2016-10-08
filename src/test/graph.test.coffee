###global it describe###
path = require('path')
expect = require('chai').expect

argv =
  runDir: path.join process.cwd(), 'tests'
  cachePath: "trie_modules"

graph = require('../lib/graph')(argv)
path = require('path')

{ depA } = require './fixtures'
{ depB } = require './fixtures'

describe 'graph', ->
  it 'source/include', ->
    graph.resolvePaths depA
    .then (resolved) ->
      expect(resolved.d.includeDirs[0]).to.equal path.join(argv.runDir, "#{argv.cachePath}/#{depA.name}/source/include")

  it 'dynamic includeDirs', ->
    graph.resolvePaths depB
    .then (resolved) ->
      expect(resolved.d.includeDirs).to.deep.equal [
        path.join(argv.runDir, "#{argv.cachePath}/#{depB.name}/testIncludeDir")
        path.join(argv.runDir, "#{argv.cachePath}/#{depB.name}/another")
      ]
