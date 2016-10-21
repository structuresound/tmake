Promise = require 'bluebird'
fs = require '../util/fs'
check = require('../util/check')
sh = require('../util/sh')
path = require('path')
# _toolchain = require './toolchain'
_log = require('../util/log')

module.exports = (argv, dep, platform, db, buildTests) ->
  settings = ['linkerFlags', 'cFlags', 'cxxFlags', 'compilerFlags', 'defines', 'frameworks', 'sources', 'headers', 'outputFile']
  buildSettings = dep.build
  log = _log argv

  buildFolder = ->
    if buildTests then dep.d.test
    else dep.d.build

  buildFile = ->
    if buildTests then path.join dep.d.project, dep.test.buildFile
    else path.join dep.d.project, dep.cache.buildFile

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
    unless fs.existsSync buildFolder() then fs.mkdirSync buildFolder()

  ensureBuildFile = ->
    throw new Error "no build file specified" unless check buildFile(), "String"
    throw new Error "no build file @ #{buildFile()}" unless fs.existsSync buildFile()

  buildWith = (system) ->
    ensureBuildFolder()
    ensureBuildFile()
    switch system
      when 'ninja'
        runner = require('./ninja')(argv, dep, platform, db)
      when 'cmake'
        runner = require('./cmake')(argv, dep, platform, db)
      when 'gyp'
        runner = require('./gyp')(argv, dep, platform, db)
      when 'make'
        runner = require('./make')(argv, dep, platform, db)
      when 'xcode'
        runner = require('./xcode')(argv, dep, platform, db)
    runner.build()

  # hashSourceFolder = ->
  #   cumulativeHash = dep.cache.url
  #   globHeaders()
  #   .then (headers) ->
  #     Promise.each headers, (header) ->
  #       fileHash path.join dep.d.project, header
  #       .then (hash) ->
  #         cumulativeHash = stringHash(cumulativeHash + hash)
  #     globSources()
  #   .then (sources) ->
  #     Promise.each sources, (source) ->
  #       fileHash path.join dep.d.project, source
  #       .then (hash) ->
  #         cumulativeHash = stringHash(cumulativeHash + hash)
  #   .then ->
  #     Promise.resolve cumulativeHash

  execute: ->
    return Promise.resolve() unless buildSettings
    platform.iterate buildSettings, commandBlock, settings
