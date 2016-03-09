_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")
path = require('path')
ps = require('promise-streams')

vinyl =
  src: (glob, opt) ->
    patterns = _.map glob, (string) ->
      if string.startsWith '/'
        return string.slice(1)
      string
    fs.src patterns, opt
  dest: fs.dest
  map: require 'map-stream'

module.exports = (dep, argv, db) ->

  task = dep.install || {}

  installLibs = ->
    if argv.verbose then console.log '[ install libs ] from', dep.d.install.libraries.from, 'to', dep.d.install.libraries.to
    patterns = task.libraries?.matching || ['**/*.a']
    if task.type == 'dynamic' then patterns = task.libraries.matching || ['**/*.dylib', '**/*.so', '**/*.dll']
    vinyl.src patterns, cwd: dep.d.install.libraries.from
    .pipe vinyl.map (file, emit) ->
      if argv.verbose then console.log 'install static lib', path.relative file.cwd, file.path
      file.base = path.dirname file.path
      console.log file.base
      newPath = dep.d.install.libraries.to + '/' +  path.relative file.base, file.path
      db.update name: dep.name,
        $addToSet: libs: path.relative dep.d.root, newPath
      , {}
      .then -> emit(null, file)
    .pipe vinyl.dest dep.d.install.libraries.to

  installHeaders = ->
    patterns = task.headers?.matching || ["**/*.h", "**/*.hpp"]
    if argv.verbose then console.log '[ install headers ] from', dep.d.install.headers.from, 'to', dep.d.install.headers.to
    vinyl.src patterns, cwd: dep.d.install.headers.from
    .pipe vinyl.map (file, emit) ->
      if argv.verbose then console.log 'install header', path.relative file.cwd, file.path
      newPath = dep.d.install.headers.to + '/' + path.relative file.base, file.path
      db.update name: dep.name,
        $addToSet: headers: path.relative dep.d.root, newPath
      , {}
      .then -> emit(null, file)
    .pipe vinyl.dest dep.d.install.headers.to

  execute = ->
    ps.wait installLibs()
    .then -> ps.wait installHeaders()
    .then -> db.update {name: dep.name}, {$set: {installed: true}}, {}

  execute: execute
