_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")
path = require('path')

module.exports = (dep, argv, db) ->
  task = dep.install || {}
  task.rootDir ?= dep.buildDir
  task.libDir ?= dep.objDir
  task.includeDir ?= dep.buildDir

  if task.headersPath
    console.log 'using specified public headers', "#{task.rootDir}/#{task.headersPath}"
    task.headersDir = "#{task.rootDir}/#{task.headersPath}"
  if task.libsPath then task.libsDir = "#{task.rootDir}/#{task.libsPath}"

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
      if task.libPath then task.libDir = "#{task.rootDir}/#{task.libPath}"
      if argv.verbose then console.log '[ install libs ] from', task.libDir, 'to', dep.libDir
      patterns = task.libs || ['**/*.a']
      if task.type == 'dynamic' then patterns = task.libs || ['**/*.dylib', '**/*.so', '**/*.dll']
      @src patterns, cwd: task.libDir
      .pipe @map (file, emit) ->
        unless argv.quiet then console.log 'install static lib', path.relative file.cwd, file.path
        file.base = path.dirname file.path
        console.log file.base
        db.deps.updateAsync name: dep.name,
          $addToSet: libs: dep.libDir + '/' + path.relative file.base, file.path
        .then -> emit(null, file)
      .pipe @dest dep.libDir
    installHeaders = ->
      if task.headersPath then task.includeDir = "#{task.rootDir}/#{task.headersPath}"
      patterns = task.headers || ["**/*.h", "**/*.hpp"]
      if argv.verbose then console.log '[ install headers ] from', task.includeDir, 'to', dep.includeDir
      @src patterns, cwd: task.includeDir
      .pipe @map (file, emit) ->
        unless argv.quiet then console.log 'install header', path.relative file.cwd, file.path
        db.deps.updateAsync name: dep.name,
          $addToSet: headers: dep.includeDir + '/' + path.relative file.base, file.path
        .then -> emit(null, file)
      .pipe @dest dep.includeDir
    streamPromise installLibs
    .then ->
      streamPromise installHeaders

  execute: execute
