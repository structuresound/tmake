_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
path = require('path')
platform = require '../platform'
colors = require ('chalk')

module.exports = (dep, argv, db, graph, npmDir) ->
  if dep.configure
    if typeof dep.configure == 'string'
      build = with: dep.configure
    else
      build = dep.configure || {}
  else if dep.build
    if typeof dep.build == 'string'
      build = with: dep.build
    else
      build = dep.build || {}

  reduceGlobs = (base, defaults) ->
    crossPlatform = build[base]?.matching || defaults
    if build[platform.name()]?[base]?.matching
      _.union crossPlatform, build[platform.name()][base].matching
    else crossPlatform

  globHeaders = ->
    patterns = reduceGlobs 'headers', ['**/*.h','**/*.hpp', '!test/**', '!tests/**', '!build/**']
    fs.glob patterns, dep.d.project, dep.d.source

  globSources = ->
    patterns = reduceGlobs 'sources', ['*.cpp', '*.cc', '*.c']
    if argv.dev then console.log 'glob src:', dep.d.source, ":/", patterns
    fs.glob patterns, dep.d.project, dep.d.source

  globDeps = -> graph.deps dep

  stdCFlags =
    O: 2

  stdCxxFlags =
    O: 2
    std: "c++11"
    stdlib: "libc++"

  jsonToCFlags = (options) ->
    jsonToCxxFlags _.omit options, ['std','stdlib']

  jsonToCxxFlags = (options) ->
    opt = _.copy options
    if opt.O
      switch opt.O
        when 3, "3" then options.O3 = true
        when 2, "2" then options.O2 = true
        when 1, "1" then options.O1 = true
        when 0, "0" then options.O0 = true
        when "s" then options.Os = true
      delete opt.O
    if options.O3
      delete opt.O2
    if opt.O3 or opt.O2
      delete opt.O1
    if opt.O3 or opt.O2 or opt.O1
      delete options.Os
    if opt.O3 or opt.O2 or opt.O1 or opt.Os
      delete opt.O0

    jsonToFlags opt

  jsonToLDFlags = (options) ->
    opt = _.copy options
    jsonToFlags opt

  jsonToFlags = (json) ->
    flags = ""
    _.each json, (opt, key) ->
      if typeof opt == 'string'
        flags += " -#{key}=#{opt}"
      else if opt
        flags += " -#{key}"
    flags

  resolveBuildSystem = ->
    switch build.with
      when "ninja" then "ninja"
      when "cmake" then "cmake"
      when "gyp" then "gyp"
      when "make" then "make"
      else
        if build.ninja then "ninja"
        else if build.cmake then "cmake"
        else if build.gyp then "gyp"
        else if build.make then "make"
        else if fs.existsSync dep.d.project + '/build.ninja' then "ninja"
        else if fs.existsSync dep.d.project + '/CMakeLists.txt' then "cmake"
        else if fs.existsSync dep.d.project + '/binding.gyp' then "gyp"
        else if fs.existsSync dep.d.project + '/Makefile' then "make"
        else Promise.reject "can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"

  createContext = ->
    new Promise (resolve) ->
      context =
        name: dep.name
        target: dep.target
        npmDir: npmDir
        boost: build.boost
        cFlags: jsonToCFlags build.cFlags || stdCFlags
        cxxFlags: jsonToCxxFlags build.cxxFlags || stdCxxFlags
        ldFlags: jsonToLDFlags build.ldFlags || {}
      globHeaders()
      .then (headers) ->
        context.headers = headers
        globSources()
      .then (sources) ->
        context.sources = sources
        globDeps()
      .then (depGraph) ->
        if depGraph.length
          context.includeDirs = _.map depGraph, (subDep) -> subDep.d.install.headers.to
          context.libs = _.chain depGraph
          .map (d) -> _.map d.libs, (lib) -> d.d.root + '/' + lib
          .flatten()
          .value()
        context.includeDirs = _.union context.includeDirs, dep.d.include.dirs
        resolve context

  buildFilePath = (systemName) ->
    buildFileNames =
      ninja: 'build.ninja'
      cmake: 'CMakeLists.txt'
      gyp: 'binding.gyp'
      make: 'Makefile'
    path.join dep.d.project, buildFileNames[systemName]

  configureFor = (systemName) ->
    dep.buildFile ?= buildFilePath systemName
    fs.existsAsync dep.buildFile
    .then (exists) ->
      if (!exists || argv.force)
        createContext()
        .then (context) ->
          switch systemName
            when 'ninja'
              file = fs.createWriteStream(dep.buildFile)
              require('./ninja')(dep,argv).generate context, file
              file.end()
              fs.wait file, true
            when 'cmake'
              require('./cmake')(dep, argv).generate context
              .then (CMakeLists) ->
                fs.writeFileAsync dep.buildFile, CMakeLists
            when 'gyp'
              require('./gyp')(build, dep, argv).generate context
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
    if argv.verbose then console.log 'build configuration:', build
    libsPattern = ['**/*.a']
    if dep.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
    if argv.verbose then console.log 'configure for:', resolveBuildSystem()
    configureFor resolveBuildSystem()
