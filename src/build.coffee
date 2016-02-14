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

module.exports = (module, argv) ->
  if argv.verbose then console.log('[   build   ]')

  if typeof module.build == 'string'
    task = with: module.build
  else
    task = module.build || {}

  task.bbtDir ?= module.bbtDir
  task.name ?= module.name
  task.target ?= module.target || 'static'
  task.srcDir ?= module.buildDir
  task.libDir ?= module.libDir
  buildDir = task.srcDir
  if argv.verbose then console.log 'buildDir', buildDir
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

  context =
    src: (glob, opt) ->
      options = opt or {}
      options.cwd = buildDir
      patterns = _.map glob, (string) ->
        if string.startsWith '/'
          return string.slice(1)
        string
      fs.vinyl.src patterns, options
    map: fs.map
    fs: fs
    gyp: gyp
    sources: []
    headers: []
    includeDirectories: []
    nodeGyp: ->
      defaultArgv = ['node', buildDir, '--loglevel=silent']
      gyp_argv = defaultArgv.slice()
      applyArgv gyp_argv
      if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
      gyp.parseArgv gyp_argv
      process.chdir buildDir
      manualRebuild()

  _.extend(context, config)

  generateGypBindings = ->
    defaultGyp =
      includes: @headers
      targets: [
        target_name: task.name
        type: 'static_library'
        sources: @sources
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
    bindingPath = buildDir + '/binding.gyp'
    if argv.verbose then console.log 'node-gyp:', bindingPath, JSON.stringify(binding, 0, 2)
    fs.writeFileAsync bindingPath, JSON.stringify(binding, 0, 2)

  execute: ->
    if task.pipeline
      new Promise (resolve, reject) ->
        task.pipeline.bind(context)()
        .on 'error', reject
        .on 'finish', resolve
    else
      console.log 'build base dir ', buildDir
      headersPattern = task.headers || ['**/*.h','**/*.hpp', '!test/**', '!tests/**', '!build/**']
      sourcesPattern = task.sources || ['**/*.cpp', '**/*.cc', '**/*.c', '!build/**', '!test/**', '!tests/**']
      libsPattern = ['**/*.a']
      if task.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
      gypPresent = fs.existsSync(buildDir + '/binding.gyp')
      cmakePresent = fs.existsSync buildDir + '/CMakeLists.txt'
      makefilePresent = fs.existsSync(buildDir + '/Makefile')
      if task.with == "gyp" || task.gyp || (!task.with && gypPresent)
        module.objDir = "#{buildDir}/build"
        if gypPresent
          return context.nodeGyp()
        fs.gather headersPattern, context.headers, buildDir
        .then -> fs.gather sourcesPattern, context.sources, buildDir
        .then -> generateGypBindings.apply context
        .then -> context.nodeGyp()
      else if task.with == "cmake" || task.cmake || (!task.with && cmakePresent)
        module.objDir = "#{buildDir}/build"
        cmake = require('./cmake')(module, task, context, argv)
        if cmakePresent
          cmake.cmake()
        else
          fs.gatherDirectories headersPattern, context.includeDirectories, buildDir, module.includeDir
          .then -> fs.gather headersPattern, context.headers, buildDir
          .then -> fs.gather sourcesPattern, context.sources, buildDir
          .then -> fs.gather libsPattern, context.libraries, buildDir, module.libDir
          .then -> cmake.generateLists()
          .then -> cmake.cmake()
      else if task.with == "make" || task.make || (!task.with && makefilePresent)
        module.objDir = "#{buildDir}/obj"
        sh = require('./sh')(task, context)
        if makefilePresent
          sh.exec "make -j#{numCPUs}"
        else
          Promise.reject "bbt doesn't support autogen for make yet"
      else
        Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"
