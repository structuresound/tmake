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
    if task[platform.name()]?[base]?.matching then ptr = _.union crossPlatform, task[platform.name()][base].matching
    else crossPlatform

  globHeaders = ->
    patterns = reduceGlobs 'headers', ['**/*.h','**/*.hpp', '!test/**', '!tests/**', '!build/**']
    fs.glob patterns, dep.d.root, dep.d.source

  globSources = ->
    patterns = reduceGlobs 'sources', ['**/*.cpp', '**/*.cc', '**/*.c', '!**/*.test.cpp', '!build/**', '!test/**', '!tests/**']
    if argv.verbose then console.log 'glob src:', dep.d.source, ":/", patterns
    fs.glob patterns, dep.d.root, dep.d.source

  globDeps = ->
    graph.deps dep

  stdCFlags =
    O: 2

  stdCxxFlags =
    O: 2
    std: "c++11"
    stdlib: "libc++"

  jsonToCFlags = (options) ->
    jsonToCxxFlags _.omit options, ['std','stdlib']

  jsonToCxxFlags = (options) ->
    if options.O
      switch options.O
        when 3, "3" then options.O3 = true
        when 2, "2" then options.O2 = true
        when 2, "1" then options.O1 = true
        when 2, "0" then options.O0 = true
        when 2, "s" then options.Os = true
      delete options.O
    if options.O3
      delete options.O2
    if options.O3 or options.O2
      delete options.O1
    if options.O3 or options.O2 or options.O1
      delete options.Os
    if options.O3 or options.O2 or options.O1 or options.Os
      delete options.O0

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
        else if fs.existsSync dep.d.project + '/build.ninja' then "ninja"
        else if fs.existsSync dep.d.project + '/CMakeLists.txt' then "cmake"
        else if fs.existsSync dep.d.project + '/binding.gyp' then "gyp"
        else if fs.existsSync dep.d.project + '/Makefile' then "make"
        else Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"

  createContext = ->
    new Promise (resolve) ->
      context =
        name: dep.name
        npmDir: npmDir
        cFlags: jsonToCFlags task.cFlags || stdCFlags
        cxxFlags: jsonToCxxFlags task.cxxFlags || stdCxxFlags
        ldFlags: jsonToLDFlags task.ldFlags
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

  buildFilePath = (systemName) ->
    buildFileNames =
      ninja: 'build.ninja'
      cmake: 'CMakeLists.txt'
      gyp: 'binding.gyp'
      make: 'Makefile'
    path.join dep.d.project, buildFileNames[systemName]

  configureFor = (systemName) ->
    configure = (context) -> console.log colors.red context; Promise.reject "no build system specified or found"

    dep.buildFile ?= buildFilePath systemName
    fs.existsAsync dep.buildFile
    .then (exists) ->
      if (!exists || argv.force)
        createContext()
        .then (context) ->
          switch systemName
            when 'ninja'
              file = fs.createWriteStream(dep.buildFile)
              require('./ninja')(task, dep,argv).generate context, file
              file.end()
              ps.wait file
            when 'cmake'
              require('./cmake')(task, dep, argv).generate context
              .then (CMakeLists) ->
                fs.writeFileAsync dep.buildFile, CMakeLists
            when 'gyp'
              require('./gyp')(task, dep, argv).generate context
              .then (binding) ->
                if argv.verbose then console.log 'node-gyp:', dep.buildFile, JSON.stringify(binding, 0, 2)
                fs.writeFileAsync dep.buildFile, JSON.stringify(binding, 0, 2)
            when 'make'
              require('./make')(context).generate context
              .then (Makefile) ->
                fs.writeFileAsync dep.buildFile, JSON.stringify(Makefile, 0, 2)
        .then ->
          db.update {name: dep.name}, {$set: {buildFile: dep.buildFile}}, {}
      else Promise.resolve dep.buildFile

  resolveBuildSystem: resolveBuildSystem
  getContext: -> createContext()
  execute: ->
    console.log colors.green '[   configure   ]'
    if argv.verbose then console.log 'task:', task
    libsPattern = ['**/*.a']
    if dep.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
    if argv.verbose then console.log 'configure for:', resolveBuildSystem()
    configureFor resolveBuildSystem()
