###global it describe###
path = require('path')
expect = require('chai').expect

argv =
  runDir: path.join process.cwd(), 'tests'
  cachePath: "trie_modules"

graph = require('../lib/graph.js')(argv, undefined, argv.runDir)
path = require('path')

depA =
  name: "auto"
  git: "hello/world"

depB =
  name: "manual"
  git: "hello/world"
  path:
    includeDirs: [
      "testIncludeDir"
      "another"
    ]

describe 'graph', ->
  it 'source/include', ->
    # parse = require('../lib/parse')(depA, argv)
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
