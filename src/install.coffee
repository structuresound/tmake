_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")
path = require('path')

module.exports = (dep, argv, db) ->
  task = dep.install || {}

  if task.path?.headers
    console.log 'using specified public headers install dir', "#{dep.d.root}/#{task.path.headers}"
    task.headersDir = "#{dep.d.root}/#{task.path.headers}"
  if task.path?.libs then task.libsDir = "#{dep.d.root}/#{task.path.libs}"

  context =
    src: (glob, opt) ->
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
      libPath = dep.d.build
      if task.path?.libs then libPath = "#{dep.d.root}/#{task.path.libs}"
      if argv.verbose then console.log '[ install libs ] from', libPath, 'to', dep.d.lib
      patterns = task.libs || ['**/*.a']
      if task.type == 'dynamic' then patterns = task.libs || ['**/*.dylib', '**/*.so', '**/*.dll']
      @src patterns, cwd: libPath
      .pipe @map (file, emit) ->
        unless argv.quiet then console.log 'install static lib', path.relative file.cwd, file.path
        file.base = path.dirname file.path
        console.log file.base
        db.deps.updateAsync name: dep.name,
          $addToSet: libs: dep.d.lib + '/' + path.relative file.base, file.path
        .then -> emit(null, file)
      .pipe @dest dep.d.lib
    installHeaders = ->
      if task.path?.headers then dep.d.include = "#{dep.d.source}/#{task.path.headers}"
      patterns = task.headers || ["**/*.h", "**/*.hpp"]
      if argv.verbose then console.log '[ install headers ] from', dep.d.source, 'to', dep.d.include
      @src patterns, cwd: dep.d.source
      .pipe @map (file, emit) ->
        unless argv.quiet then console.log 'install header', path.relative file.cwd, file.path
        db.deps.updateAsync name: dep.name,
          $addToSet: headers: dep.d.include + '/' + path.relative file.base, file.path
        .then -> emit(null, file)
      .pipe @dest dep.d.include
    streamPromise installLibs
    .then ->
      streamPromise installHeaders

  execute: execute
