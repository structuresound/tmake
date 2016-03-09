`require('source-map-support').install()`
_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
ps = require('promise-streams')
path = require('path')
platform = require '../platform'
colors = require ('chalk')

module.exports = (dep, argv, db, npmDir) ->
  graph = require('../graph')(db)

  if dep.configure
    if typeof dep.configure == 'string'
      task = with: dep.configure
    else
      task = dep.configure || {}
  else if dep.build
    if typeof dep.build == 'string'
      task = with: dep.build
    else
      task = dep.build || {}

  dep.target ?= 'static'

  reduceGlobs = (base, defaults) ->
    crossPlatform = task[base]?.matching || defaults
    if task[platform.name()]?[base]?.matching then ptr = _.union crossPlatform, task[platform.name()].sources.matching
    else crossPlatform

  platformSources = ->
    if task[platform.name()]?.sources?.matching then _.union task.sources.matching, task[platform.name()].sources.matching
    else task.sources.matching

  globHeaders = ->
    ptr = reduceGlobs 'headers', ['**/*.h','**/*.hpp', '!test/**', '!tests/**', '!build/**']
    fs.glob ptr, dep.d.root, dep.d.source

  globSources = ->
    ptr = reduceGlobs 'sources', ['**/*.cpp', '**/*.cc', '**/*.c', '!**/*.test.cpp', '!build/**', '!test/**', '!tests/**']
    if argv.verbose then console.log 'glob src:', dep.d.source, ":/", ptr
    fs.glob ptr, dep.d.root, dep.d.source

  globDeps = ->
    graph.deps dep

  stdCFlags =
    O2: 1
    std: "c++11"
    stdlib: "libc++"

  jsonToCFlags = (options) ->
    if options.O3
      options.O2 = false
    if options.O3 or options.O2
      options.O1 = false
    if options.O3 or options.O2 or options.O1
      options.Os = false
    if options.O3 or options.O2 or options.O1 or options.Os
      options.O0 = false

    jsonToFlags options

  jsonToLDFlags = (pkgOptions) ->
    options = pkgOptions || {}
    jsonToFlags options

  jsonToFlags = (json) ->
    flags = ""
    _.each json, (opt, key) ->
      if typeof opt == 'string'
        flags += " -#{key}=#{opt}"
      else if opt
        flags += " -#{key}"
    flags

  resolveBuildSystem = ->
    switch task.with
      when "ninja" then "ninja"
      when "cmake" then "cmake"
      when "gyp" then "gyp"
      when "make" then "make"
      else
        if task.ninja then "ninja"
        else if task.cmake then "cmake"
        else if task.gyp then "gyp"
        else if task.make then "make"
        else if fs.existsSync dep.d.clone + '/build.ninja' then "ninja"
        else if fs.existsSync dep.d.clone + '/CMakeLists.txt' then "cmake"
        else if fs.existsSync dep.d.clone + '/binding.gyp' then "gyp"
        else if fs.existsSync dep.d.clone + '/Makefile' then "make"
        else Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"

  createContext = ->
    new Promise (resolve) ->
      context =
        name: dep.name
        npmDir: npmDir
        cflags: jsonToCFlags task.cflags || stdCFlags
        ldflags: jsonToLDFlags task.ldflags
      globHeaders()
      .then (headers) ->
        context.headers = headers
        globSources()
      .then (sources) ->
        context.sources = sources
        globDeps()
      .then (depGraph) ->
        context.includeDirs = _.map depGraph, (subDep) -> subDep.d.install.headers.to
        context.includeDirs.push dep.d.include
        context.libs = _.chain depGraph
        .map (d) -> _.map d.libs, (lib) -> d.d.root + '/' + lib
        .flatten()
        .value()
        resolve context

  configureFor = (systemName) ->
    configure = (context) -> console.log colors.red context; Promise.reject "no build system specified or found"

    switch systemName
      when 'ninja'
        dep.buildFile = path.join dep.d.project, 'build.ninja'
        configure = (context) ->
          file = fs.createWriteStream(dep.buildFile)
          require('./ninja')(task, dep,argv).generate context, file
          file.end()
          ps.wait file
      when 'cmake'
        dep.buildFile = path.join dep.d.project, 'CMakeLists.txt'
        configure = (context) ->
          require('./cmake')(task, dep, argv).generate context
          .then (CMakeLists) ->
            fs.writeFileAsync dep.buildFile, CMakeLists
      when 'gyp'
        dep.buildFile = path.join dep.d.project, 'binding.gyp'
        configure = (context) ->
          require('./gyp')(task, dep, argv).generate context
          .then (binding) ->
            if argv.verbose then console.log 'node-gyp:', dep.buildFile, JSON.stringify(binding, 0, 2)
            fs.writeFileAsync dep.buildFile, JSON.stringify(binding, 0, 2)
      when 'make'
        dep.buildFile = path.join dep.d.project, 'Makefile'
        configure = (context) ->
          require('./make')(context).generate context

    fs.existsAsync dep.buildFile
    .then (exists) ->
      if !exists || argv.force
        createContext()
        .then (context) ->
          configure context
        .then ->
          db.update {name: dep.name}, {$set: {buildFile: dep.buildFile}}, {}

  resolveBuildSystem: resolveBuildSystem
  getContext: -> createContext()
  execute: ->
    console.log colors.green '[   configure   ]'
    if argv.verbose then console.log 'task:', task
    libsPattern = ['**/*.a']
    if dep.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
    if argv.verbose then console.log 'configure for:', resolveBuildSystem()
    configureFor resolveBuildSystem()
