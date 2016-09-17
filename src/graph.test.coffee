###global it describe###
assert = require('chai').assert
path = require('path')

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
  it 'source/include', (done) ->
    # parse = require('../lib/parse')(depA, argv)
    graph.resolvePaths depA
    .then (resolved) ->
      assert.equal resolved.d.includeDirs[0], path.join(argv.runDir, "#{argv.cachePath}/#{depA.name}/source/include")
      done()

  it 'dynamic includeDirs', (done) ->
    graph.resolvePaths depB
    .then (resolved) ->
      assert.deepEqual resolved.d.includeDirs, [
        path.join(argv.runDir, "#{argv.cachePath}/#{depB.name}/testIncludeDir")
        path.join(argv.runDir, "#{argv.cachePath}/#{depB.name}/another")
      ]
      done()
