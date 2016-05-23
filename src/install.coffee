_ = require('underscore')
_vinyl = require('vinyl-fs')
_p = require("bluebird")
path = require('path')
fs = require('./fs')
sh = require "shelljs"
colors = require ('chalk')
map = require('map-stream')

vinyl =
  dest: _vinyl.dest
  src: (glob, opt) ->
    patterns = _.map glob, (string) ->
      if string.startsWith '/'
        return string.slice(1)
      string
    _vinyl.src patterns, opt

module.exports = (dep, argv, db) ->

  task = dep.install || {}

  copy = (patterns, from, to, flatten) ->
    filePaths = []
    fs.wait(vinyl.src(patterns, cwd: from)
    .pipe(map (file, emit) ->
      if argv.verbose then console.log '+ ', path.relative file.cwd, file.path
      if flatten then file.base = path.dirname file.path
      newPath = to + '/' + path.relative file.base, file.path
      filePaths.push path.relative dep.d.root, newPath
      emit(null, file)
    ).pipe(vinyl.dest to)
    ).then ->
      _p.resolve filePaths

  installBin = ->
    if _.contains ['bin'], dep.target
      _.each dep.d.install.binaries, (ft) ->
        from = path.join(ft.from, dep.name)
        to = path.join(ft.to, dep.name)
        if argv.verbose then console.log colors.green '[ install bin ] from', from, 'to', to
        sh.mv from, to
    else _p.resolve('bin')

  installLibs = ->
    if _.contains ['static','dynamic'], dep.target
      patterns = task.libraries?.matching || ['*.a']
      if dep.target == 'dynamic' then patterns = task.libraries.matching || ['*.dylib', '*.so', '*.dll']
      _p.each dep.d.install.libraries, (ft) ->
        if argv.verbose then console.log colors.green '[ install libs ] from', ft.from, 'to', ft.to
        copy patterns, ft.from, ft.to, true
        .then (libPaths) ->
          db.update name: dep.name,
            $set: libs: libPaths
          , {}
    else _p.resolve('libs')

  installHeaders = ->
    if _.contains ['static','dynamic'], dep.target
      patterns = task.headers?.matching || ["**/*.h", "**/*.hpp"]
      _p.each dep.d.install.headers, (ft) ->
        if argv.verbose then console.log colors.yellow '[ install headers ] from', ft.from, 'to', ft.to
        copy patterns, ft.from, ft.to, false
        .then (headerPaths) ->
          db.update name: dep.name,
            $set: headers: headerPaths
          , {}
    else _p.resolve('headers')

  execute = ->
    installHeaders()
    .then ->
      installLibs()
    .then ->
      if argv.verbose then console.log colors.green "libs"
      installBin()
    .then ->
      if argv.verbose then console.log colors.green "installed"
      db.update {name: dep.name}, {$set: {installed: true}}, {}

  execute: execute
