gyp = require('node-gyp')()
_ = require 'underscore'
Promise = require 'bluebird'
fs = require './fs'
numCPUs = require('os').cpus().length

# It is necessary to execute rebuild manually as calling node-gyp’s rebuild
# programmatically fires the callback function too early.
manualRebuild = ->
  new Promise (resolve, reject) ->
    gyp.commands.clean [], (error) ->
      return reject(error) if error
      gyp.commands.configure [], (error) ->
        return reject(error) if error
        gyp.commands.build [], resolve

module.exports = (dep, argv, db) ->
  if argv.verbose then console.log('[   build   ]')

  if typeof dep.build == 'string'
    task = with: dep.build
  else
    task = dep.build || {}

  buildRoot = dep.buildDir

  task.rootDir ?= buildRoot
  task.srcDir ?= buildRoot + '/src'
  task.includeDir ?= buildRoot + '/include'

  task.name ?= dep.name
  task.target ?= task.target || 'static'

  if argv.verbose then console.log 'build task:', task
  config = task.options || {}

  applyArgv = (dest) ->
    dest ?= []
    _.each config.flags, (value, key) ->
      dest.push "--#{key}=#{value}"
    _.each argv, (value, key) ->
      return if key == '_'
      unless _.contains dest, key
        dest.push "--#{key}=#{value}"
    if !config.flags?.debug then dest.push '--no-debug'
    dest

  nodeGyp = ->
    defaultArgv = ['node', buildRoot, '--loglevel=silent']
    gyp_argv = defaultArgv.slice()
    applyArgv gyp_argv
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
    fs.glob headersPattern, buildRoot, task.includeDir

  globSources = ->
    sourcesPattern = task.sources || ['**/*.cpp', '**/*.cc', '**/*.c', '!build/**', '!test/**', '!tests/**']
    fs.glob sourcesPattern, buildRoot, task.srcDir

  globLibsRecursive = (root, stack) ->
    console.log "search deps for", root.name
    db.deps.findAsync
      name:
        $in: _.map root.deps, (dep) -> dep.name
    .then (deps) ->
      Promise.each deps, (step) ->
        stack.push deps
        globLibsRecursive step, stack

  globLibs = ->
    stack = []
    globLibsRecursive dep, stack
    .then () ->
      #console.log 'deps tree', stack
      Promise.resolve _.map _.flatten(stack), (step) -> step.libs

  buildContext = ->
    context =
      includeDirs: [dep.includeDir]
      npmDir: dep.npmDir
    globHeaders()
    .then (headers) ->
      context.headers = headers
      globSources()
    .then (sources) ->
      context.sources = sources
      globLibs()
    .then (libs) ->
      #console.log 'libs', libs
      context.libs = libs
      Promise.resolve context

  execute: ->
    if task.pipeline
      new Promise (resolve, reject) ->
        task.pipeline.bind(vinylContext)()
        .on 'error', reject
        .on 'finish', resolve
    else
      ### GATHER PROJECT FILES ###
      libsPattern = ['**/*.a']
      if task.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
      ### WHICH BUILD SYSTEM ###
      gypPresent = fs.existsSync buildRoot + '/binding.gyp'
      cmakePresent = fs.existsSync buildRoot + '/CMakeLists.txt'
      makefilePresent = fs.existsSync buildRoot + '/Makefile'
      if task.with == "gyp" || task.gyp || (!task.with && gypPresent)
        dep.objDir = task.buildDir = "#{buildRoot}/build"
        if gypPresent then nodeGyp()
        else
          buildContext()
          .then (context) -> generateGypBindings context
          .then -> nodeGyp()
      else if task.with == "cmake" || task.cmake || (!task.with && cmakePresent)
        dep.objDir = task.buildDir = "#{buildRoot}/build"
        cmake = require('./cmake')(dep, task, argv)
        if cmakePresent then cmake.cmake()
        else
          buildContext()
          .then (context) ->
            cmake.generateLists context
            .then (CMakeLists) ->
              bindingPath = task.rootDir + '/CMakeLists.txt'
              fs.writeFileAsync bindingPath, CMakeLists
              .then ->
                db.deps.update {name: dep.name}, $set: cMakeFile: bindingPath
            cmake.cmake()
      else if task.with == "make" || task.make || (!task.with && makefilePresent)
        task.buildDir = buildRoot
        dep.objDir = "#{buildRoot}/obj"
        sh = require('./sh')(task, argv)
        if makefilePresent
          process.chdir task.buildDir
          sh.exec "make -j#{numCPUs}"
        else
          Promise.reject "bbt doesn't support autogen for make yet"
      else
        Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"
