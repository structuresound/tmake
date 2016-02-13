_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")
path = require('path')

module.exports = (dep, argv) ->
  task = dep.install || {}
  task.srcDir ?= dep.buildDir
  task.objDir ?= dep.objDir
  task.libDir ?= dep.libDir
  task.includeDir ?= dep.includeDir

  context =
    src: (glob, opt) ->
      opt ?= {}
      opt.cwd ?= task.srcDir
      patterns = _.map glob, (string) ->
        if string.startsWith '/'
          return string.slice(1)
        string
      fs.src patterns, opt
    dest: fs.dest
    map: require 'map-stream'

  if task.config
    _.extend context, task.config()

  streamPromise = (stream) ->
    new Promise (resolve, reject) ->
      stream.bind(context)()
      .on 'finish', resolve
      .on 'end', resolve
      .on 'error', reject

  execute = ->
    installLibs = task.pipeline || ->
      patterns = ['**/*.a']
      if task.type == 'dynamic' then patterns = ['**/*.dylib', '**/*.so', '**/*.dll']
      @src(patterns, cwd: task.srcDir)
      .pipe @map (file, emit) ->
        unless argv.quiet then console.log 'install static lib', path.relative file.cwd, file.path
        file.base = path.dirname file.path
        emit(null, file)
      .pipe @dest task.libDir
    installHeaders = ->
      patterns = ["**/*.h", "**/*.hpp"]
      @src patterns, cwd: task.srcDir
      .pipe @map (file, emit) ->
        unless argv.quiet then console.log 'install header', path.relative file.cwd, file.path
        emit(null, file)
      .pipe @dest task.includeDir

    console.log '[ install libs ]'
    if argv.verbose then console.log '[ install ] from', task.srcDir, 'to', task.libDir

    streamPromise installLibs
    .then ->
      console.log '[ install headers ]'
      if argv.verbose then console.log '[ install ] from', task.srcDir, 'to', task.includeDir
      streamPromise installHeaders
    .then ->
      console.log "finished headers"
      Promise.resolve "finished headers"

  execute: execute
