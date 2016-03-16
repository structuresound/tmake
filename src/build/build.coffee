_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
colors = require ('chalk')

module.exports = (dep, argv, db, configure) ->
  graph = require('../graph')(db)

  if typeof dep.build == 'string'
    task = with: dep.build
  else
    task = dep.build || {}

  buildWith = (system) ->
    runner = build: -> Promise.reject "build system not found"
    fs.existsAsync dep.buildFile
    .then (exists) ->
      if exists
        switch system
          when 'ninja'
            runner = require('./ninja')(dep, argv)
          when 'cmake'
            runner = require('./cmake')(dep, argv)
          when 'gyp'
            runner = require('./gyp')(task, dep, argv)
          when 'make'
            runner = require('./make')(configure.getContext())
      runner.build()

  build = ->
    console.log colors.green '[   build   ]'
    if argv.verbose then console.log 'with:', configure.resolveBuildSystem()
    buildWith configure.resolveBuildSystem()

  execute: ->
    build()
    .then ->
      db.update {name: dep.name}, {$set: {built: true}}, {}
