_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
path = require('path')
platform = require '../platform'
colors = require ('chalk')
sh = require('shelljs')
replace = new (require('task-replace'))()
check = require('../check')

module.exports = (dep, argv, db, graph) ->
  git = require('../git')(dep, db)

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

  createFiles = ->
    if !dep.create then return Promise.resolve()
    entries = cascadingPlatformArgs dep.create
    iterable = _.map entries, (v) -> v
    Promise.each iterable, (e) ->
      filePath = path.join dep.d.source, e.path
      if argv.verbose then console.log 'create file', filePath
      fs.writeFileAsync filePath, e.string, encoding: 'utf8'

  preprocessor = ->
    if !dep.replace then return Promise.resolve()
    repl = cascadingPlatformArgs dep.replace
    iterable = _.map repl, (v) -> v
    Promise.each iterable, (replEntry) ->
      fs.glob replEntry.matching, undefined, dep.d.source
      .then (files) ->
        Promise.each files, (file) ->
          if argv.verbose then console.log 'process file', file
          processStringWithReplEntry file, replEntry

  replaceMacro = (m) ->
    if check(m, String)
      platform.macros[m] || git.macros[m] || m
    else if check(m, Object)
      res = platform.macros[m.function] || git.macros[m.function]
      if m.map then m.map[res]
      else res
    else m

  replaceAll = (str, find, replace) ->
    str.replace new RegExp(find, 'g'), replace

  processStringWithReplEntry = (f, r) ->
    stringFile = fs.readFileSync f, 'utf8'
    inputs = cascadingPlatformArgs r.inputs
    _.each inputs, (v, k) ->
      if r.directive then k = "#{r.directive.prepost || r.directive.pre || ''}#{k}#{r.directive.prepost || r.directive.post || ''}"
      stringFile = replaceAll stringFile, k, replaceMacro(v)
    format =
      ext: path.extname f
      name: path.basename f, path.extname f
      dir: path.dirname f
      base: path.basename f
    if format.ext = '.in'
      parts = f.split('.')
      format.dir = path.dirname parts[0]
      format.name = path.basename parts[0]
      format.ext = parts.slice(1).join('.')
    editedFormat = _.extend format, _.pick r, Object.keys(format)
    editedFormat.base = format.name + format.ext
    newPath = path.format editedFormat
    fs.writeFileAsync newPath, stringFile, encoding: 'utf8'

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

  cascadingPlatformArgs = (base) ->
    clean = _.omit base, platform.keywords()
    _.extend clean, base[platform.name()]

  stdCFlags =
    O: 2
    linux:
      pthread: 1

  stdCxxFlags =
    O: 2
    std: "c++11"
    mac:
      stdlib: "libc++"
    linux:
      pthread: 1

  jsonToCFlags = (options) ->
    jsonToCxxFlags _.omit options, ['std','stdlib']

  jsonToCxxFlags = (options) ->
    opt = cascadingPlatformArgs options
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
    opt = cascadingPlatformArgs options
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
        npmDir: argv.npmDir
        boost: build.boost
        cFlags: jsonToCFlags build.cFlags || build.cxxFlags || stdCFlags
        cxxFlags: jsonToCxxFlags build.cxxFlags || build.cFlags || stdCxxFlags
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
          context.includeDirs = _.chain depGraph
          .map depGraph, (subDep) -> _.map subDep.d.install.headers, (ft) -> ft.to
          .flatten()
          .value()
          context.libs = _.chain depGraph
          .map (d) -> _.map d.libs, (lib) -> d.d.root + '/' + lib
          .flatten()
          .value()
        context.includeDirs = _.union context.includeDirs, dep.d.includeDirs
        console.log colors.yellow JSON.stringify context.includeDirs
        resolve context

  buildFilePath = (systemName) ->
    buildFileNames =
      ninja: 'build.ninja'
      cmake: 'CMakeLists.txt'
      gyp: 'binding.gyp'
      make: 'Makefile'
    path.join dep.d.project, buildFileNames[systemName]

  configureFor = (systemName) ->
    dep.buildFile = buildFilePath systemName
    fs.existsAsync dep.buildFile
    .then (exists) ->
      if (!exists || (argv.force && dep.generatedBuildFile))
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
          db.update {name: dep.name}, {$set: {buildFile: dep.buildFile, generatedBuildFile: dep.buildFile}}, {}
      else Promise.resolve dep.buildFile

  resolveBuildSystem: resolveBuildSystem
  getContext: -> createContext()
  execute: ->
    createFiles()
    .then ->
      preprocessor()
    .then ->
      if argv.verbose then console.log 'build configuration:', build
      libsPattern = ['**/*.a']
      if dep.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
      if argv.verbose then console.log 'configure for:', resolveBuildSystem()
      configureFor resolveBuildSystem()
