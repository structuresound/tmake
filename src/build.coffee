require('source-map-support').install();
gyp = require('node-gyp')()
_ = require 'underscore'
Promise = require 'bluebird'
fs = require './fs'
ps = require('promise-streams')
numCPUs = require('os').cpus().length
path = require('path')
platform = require './platform'

manualRebuild = ->
  new Promise (resolve, reject) ->
    gyp.commands.clean [], (error) ->
      return reject(error) if error
      gyp.commands.configure [], (error) ->
        return reject(error) if error
        gyp.commands.build [], resolve

module.exports = (dep, argv, db, npmDir) ->
  if typeof dep.build == 'string'
    task = with: dep.build
  else
    task = dep.build || {}

  buildRoot = dep.d.root
  task.target ?= task.target || 'static'

  nodeGyp = ->
    defaultArgv = ['node', buildRoot, '--loglevel=silent']
    gyp_argv = defaultArgv.slice()
    if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
    gyp.parseArgv gyp_argv
    process.chdir buildRoot
    manualRebuild()

  vinylContext =
    src: (glob, opt) ->
      options = opt or {}
      options.cwd ?= buildRoot
      patterns = _.map glob, (string) ->
        if string.startsWith '/'
          return string.slice(1)
        string
      fs.vinyl.src patterns, options
    map: fs.map
    fs: fs

  generateGypBindings = (context) ->
    defaultGyp =
      includes: context.headers
      targets: [
        target_name: task.name
        type: 'static_library'
        sources: context.sources
        include_dirs: []
        libraries: []
        dependencies: []
        cflags: [
          '-fPIC',
          '-Wall',
          '-Wno-c++11-extensions',
          '-std=c++0x'
        ]
      ]
    binding = task.gyp || defaultGyp
    bindingPath = buildRoot + '/binding.gyp'
    if argv.verbose then console.log 'node-gyp:', bindingPath, JSON.stringify(binding, 0, 2)
    fs.writeFileAsync bindingPath, JSON.stringify(binding, 0, 2)

  globHeaders = ->
    headersPattern = task.headers || ['**/*.h','**/*.hpp', '!test/**', '!tests/**', '!build/**']
    fs.glob headersPattern, buildRoot, dep.d.source

  platformSources = ->
    if task[platform.name()] then _.union task.sources, task[platform.name()].sources
    else task.sources

  globSources = ->
    sourcesPattern = platformSources() || ['**/*.cpp', '**/*.cc', '**/*.c', '!**/*.test.cpp', '!build/**', '!test/**', '!tests/**']
    if argv.verbose then console.log 'glob src:', dep.d.source, ":/", sourcesPattern
    fs.glob sourcesPattern, buildRoot, dep.d.source

  globDeps = (root, stack) ->
    if root.deps
      db.find
        name:
          $in: _.map root.deps, (dep) -> dep.name
      .then (deps) ->
        Promise.each deps, (step) ->
          stack.push deps
          globDeps step, stack
    else Promise.resolve stack

  globIncludeDirs = ->
    stack = [dep]
    globDeps dep, stack
    .then () -> Promise.resolve _.map _.flatten(stack), (step) -> step.includeDirs || step.d.source

  globLibs = ->
    stack = []
    globDeps dep, stack
    .then () -> Promise.resolve _.map _.flatten(stack), (step) -> step.libs

  buildContext = ->
    new Promise (resolve) ->
      context = npmDir: npmDir
      globIncludeDirs()
      .then (includeDirs) ->
        context.includeDirs = includeDirs #_.map (includeDirs), (rel) -> path.relative(dep.d.source,rel) || './'
        #console.log context.includeDirs
        globHeaders()
      .then (headers) ->
        context.headers = headers
        # _.each headers, (header) ->
        #   fullPath = buildRoot + '/' + header
        #   unless _.contains context.includeDirs, path.dirname fullPath
        #     context.includeDirs.push path.dirname fullPath
        globSources()
      .then (sources) ->
        context.sources = sources
        globLibs()
      .then (libs) ->
        context.libs = libs
        resolve context

  resolveBuildType = (step) ->
    switch step.with
      when "ninja" then "ninja"
      when "gyp" then "gyp"
      when "cmake" then "cmake"
      when "make" then "make"
      else
        if step.ninja then "ninja"
        else if step.gyp then "gyp"
        else if step.cmake then "cmake"
        else if step.make then "make"
        else if fs.existsSync buildRoot + '/build.ninja' then "ninja"
        else if fs.existsSync buildRoot + '/binding.gyp' then "gyp"
        else if fs.existsSync buildRoot + '/CMakeLists.txt' then "cmake"
        else if fs.existsSync buildRoot + '/Makefile' then "make"
        else Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"

  buildWith =
    gyp: (step) ->
      dep.d.object = dep.d.build = "#{buildRoot}/build"
      if fs.existsSync buildRoot + '/binding.gyp' then nodeGyp()
      else
        buildContext()
        .then (context) -> generateGypBindings context
        .then -> nodeGyp step

    cmake: (step) ->
      dep.d.project = path.join dep.d.source, step.path?.CMakeLists || ""
      dep.projectFile = path.join dep.d.project, 'CMakeLists.txt'
      cmake = require('./cmake')(step, dep, argv)
      if fs.existsSync dep.projectFile
        cmake.build()
      else
        buildContext()
        .then (context) ->
          cmake.gen context
        .then (CMakeLists) ->
          fs.writeFileAsync dep.projectFile, CMakeLists
          .then ->
            db.update {name: dep.name}, $set: cMakeFile: dep.projectFile
        .then ->
          cmake.build()

    make: (step) ->
      dep.d.object = "#{buildRoot}/obj"
      command = step.make?.command || "make"
      if fs.existsSync buildRoot + '/Makefile'
        process.chdir dep.d.build
        require('./sh')(step, argv).exec "CXXFLAGS=\"#{step.CXXFLAGS}\" #{command} -j#{numCPUs}"
      else
        Promise.reject "bbt doesn't support autogen for make yet"

    ninja: (step) ->
      ninja = require('./ninja')(step,dep,argv)
      bindingPath = buildRoot + '/build.ninja'
      buildContext()
      .then (context) ->
        if step.cxxFlags then context.cxxFlags = step.cxxFlags
        if argv.verbose then console.log 'write ninja file @', bindingPath
        file = fs.createWriteStream(bindingPath)
        ninja.configure context, file
        file.end()
        ps.wait file
      .then ->
        db.update {name: dep.name}, $set: ninjaFile: bindingPath
        if argv.verbose then console.log 'build ninja @', bindingPath
        ninja.build(path.dirname bindingPath)

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

    if task.pipeline
      new Promise (resolve, reject) ->
        task.pipeline.bind(vinylContext)()
        .on 'error', reject
        .on 'finish', resolve
    else if task.steps then Promise.each task.steps, (step) -> buildStep step
    else buildStep task

  execute: -> build().then -> db.update {name: dep.name}, $set: built: true
