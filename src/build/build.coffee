`require('source-map-support').install()`
_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
ps = require('promise-streams')
path = require('path')
platform = require '../platform'

module.exports = (dep, argv, db, npmDir) ->
  graph = require('../graph')(db)

  if typeof dep.build == 'string'
    task = with: dep.build
  else
    task = dep.build || {}

  task.target ?= task.target || 'static'

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

  buildContext = ->
    new Promise (resolve) ->
      context =
        npmDir: npmDir
        cflags: task.cflags || std: "c++11",
        ldflags: task.ldflags
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
        .map (d) -> d.libs || []
        .flatten()
        .map (lib) -> dep.d.home + '/' + lib
        .value()
        resolve context

  resolveBuildType = (step) ->
    switch step.with
      when "ninja" then "ninja"
      when "cmake" then "cmake"
      when "gyp" then "gyp"
      when "make" then "make"
      else
        if step.ninja then "ninja"
        else if step.cmake then "cmake"
        else if step.gyp then "gyp"
        else if step.make then "make"
        else if fs.existsSync dep.d.clone + '/build.ninja' then "ninja"
        else if fs.existsSync dep.d.clone + '/CMakeLists.txt' then "cmake"
        else if fs.existsSync dep.d.clone + '/binding.gyp' then "gyp"
        else if fs.existsSync dep.d.clone + '/Makefile' then "make"
        else Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"

  buildWith =
    ninja: (step) ->
      dep.projectFile = path.join dep.d.project, 'build.ninja'
      fs.existsAsync dep.projectFile
      .then (exists) ->
        ninja = require('./ninja')(step,dep,argv)
        if exists
          console.log 'existing file @', dep.projectFile
          ninja.build(path.dirname dep.projectFile)
        else
          buildContext()
          .then (context) ->
            file = fs.createWriteStream(dep.projectFile)
            ninja.generate context, file
            file.end()
            ps.wait file
          .then ->
            db.update {name: dep.name}, {$set: {ninjaFile: dep.projectFile}}, {}
            if argv.verbose then console.log 'build ninja @', dep.projectFile
            ninja.build(path.dirname dep.projectFile)

    cmake: (step) ->
      dep.projectFile = path.join dep.d.project, 'CMakeLists.txt'
      fs.existsAsync dep.projectFile
      .then (exists) ->
        cmake = require('./cmake')(step, dep, argv)
        if exists
          console.log 'existing file @', dep.projectFile
          cmake.build()
        else
          buildContext()
          .then (context) ->
            cmake.generate context
          .then (CMakeLists) ->
            fs.writeFileAsync dep.projectFile, CMakeLists
            .then ->
              console.log 'wrote file', dep.projectFile
              db.update {name: dep.name}, {$set: {cMakeFile: dep.projectFile}}, {}
            .then ->
              cmake.build()

    gyp: (step) ->
      dep.projectFile = path.join dep.d.project, 'binding.gyp'
      fs.existsAsync dep.projectFile
      .then (exists) ->
        gyp = require('./gyp')(step, dep, argv)
        if exists then gyp.build()
        else
          buildContext()
          .then (context) ->
            gyp.generate context
          .then (binding) ->
            if argv.verbose then console.log 'node-gyp:', dep.projectFile, JSON.stringify(binding, 0, 2)
            fs.writeFileAsync dep.projectFile, JSON.stringify(binding, 0, 2)
          .then -> gyp.build

    make: (step) ->
      command = step.make?.command || "make"
      if fs.existsSync dep.d.clone + '/Makefile'
        process.chdir dep.d.clone
        require('./sh')(step, argv).exec "CXXFLAGS=\"#{step.CXXFLAGS}\" #{command} -j#{platform.j()}"
      else
        Promise.reject "bbt doesn't support autogen for make yet"

  buildStep = (step) ->
    ### GATHER PROJECT FILES ###
    libsPattern = ['**/*.a']
    if step.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
    ### WHICH BUILD SYSTEM ###
    if argv.verbose then console.log 'build with:', resolveBuildType step
    buildWith[resolveBuildType step] step

  build = ->
    if argv.verbose then console.log('[   build   ]')
    if argv.verbose then console.log 'task:', task
    if task.steps then Promise.each task.steps, (step) -> buildStep step
    else buildStep task

  execute: -> build().then -> db.update {name: dep.name}, {$set: {built: true}}, {}
