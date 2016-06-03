Promise = require 'bluebird'
fs = require '../fs'
check = require('../check')
sh = require('../sh')

module.exports = (dep, argv, db) ->
  parse = require('../parse')(dep, argv)

  settings = ['cFlags', 'sources', 'headers', 'outputFile']
  commands =
    any: (obj) -> commands.shell obj
    ninja: -> commands.with 'ninja'
    cmake: -> commands.with 'cmake'
    make: -> commands.with 'make'
    shell: (obj) ->
      Promise.each parse.iterable(obj), (c) ->
        if check c, String then c = cmd: c
        sh.Promise parse.configSetting(c.cmd), parse.pathSetting(c.cwd || dep.d.source, dep), true
    with: (name) ->
      buildWith name

  ensureBuildFolder = ->
    unless fs.existsSync dep.d.build then fs.mkdirSync dep.d.build

  buildWith = (system) ->
    runner = build: -> Promise.reject "build file not found for #{system} @ #{dep.cache?.buildFile}"
    ensureBuildFolder()
    fs.existsAsync dep.cache?.buildFile
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
    return Promise.resolve() if (dep.cache?.built && !argv.force)
    parse.iterate dep.build, commands, settings
    .then ->
      db.update {name: dep.name}, {$set: {"cache.built": true}}, {}
