Promise = require 'bluebird'
fs = require '../fs'
check = require('../check')
sh = require('../sh')

module.exports = (dep, argv, db, parse, buildTests) ->
  buildFolder = dep.d.build
  buildFile = dep.cache.buildFile
  buildSettings = dep.build
  cachePath = "cache.built"

  if buildTests
    buildFolder = dep.d.test
    buildFile = dep.cache.test.buildFile
    buildSettings = dep.test?.build
    cachePath = "cache.tests.built"

  commandBlock =
    any: (obj) -> commandBlock.shell obj
    ninja: -> commandBlock.with 'ninja'
    cmake: -> commandBlock.with 'cmake'
    make: -> commandBlock.with 'make'
    shell: (obj) ->
      Promise.each parse.iterable(obj), (c) ->
        if check c, String then c = cmd: c
        sh.Promise parse.configSetting(c.cmd), parse.pathSetting(c.cwd || dep.d.source, dep), true
    with: (name) ->
      buildWith name

  ensureBuildFolder = ->
    unless fs.existsSync buildFolder then fs.mkdirSync buildFolder

  buildWith = (system) ->
    runner = build: -> Promise.reject "build file not found for #{system} @ #{buildFile}"
    ensureBuildFolder()
    fs.existsAsync buildFile
    .then (exists) ->
      if exists
        switch system
          when 'ninja'
            runner = require('./ninja')(dep, argv)
          when 'cmake'
            runner = require('./cmake')(dep, argv)
          when 'gyp'
            runner = require('./gyp')(dep, argv)
          when 'make'
            runner = require('./make')(dep, argv)
      runner.build()

  execute: ->
    return Promise.resolve() if ((!buildTests && dep.cache.built) || (buildTests && dep.cache.test.built)) && !parse.force()
    return Promise.resolve() unless buildSettings
    parse.iterate buildSettings, commandBlock, ['cFlags', 'sources', 'headers', 'outputFile']
    .then ->
      db.update {name: dep.name}, {$set: {"#{cachePath}": true}}, {}
