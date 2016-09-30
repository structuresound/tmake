Promise = require 'bluebird'
fs = require '../util/fs'
check = require('../util/check')
sh = require('../util/sh')

module.exports = (argv, dep, platform, db, buildTests) ->
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
    xcode: -> commandBlock.with 'xcode'
    shell: (obj) ->
      Promise.each platform.iterable(obj), (c) ->
        if check c, String then c = cmd: c
        sh.Promise platform.parse(c.cmd, dep), platform.pathSetting(c.cwd || dep.d.source, dep), true
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
            runner = require('./ninja')(argv, dep, platform)
          when 'cmake'
            runner = require('./cmake')(argv, dep, platform)
          when 'gyp'
            runner = require('./gyp')(argv, dep, platform)
          when 'make'
            runner = require('./make')(argv, dep, platform)
          when 'xcode'
            runner = require('./xcode')(argv, dep, platform)
      runner.build()

  execute: ->
    return Promise.resolve() unless buildSettings
    platform.iterate buildSettings, commandBlock, ['cFlags', 'cxxFlags', 'frameworks', 'ldFlags', 'sources', 'headers', 'outputFile']
    .then ->
      db.update {name: dep.name}, {$set: {"#{cachePath}": true}}, {}
