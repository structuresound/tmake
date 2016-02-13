gyp = require('node-gyp')()
_ = require 'underscore'
Promise = require 'bluebird'
vinyl = require 'vinyl-fs'
fs = require './fs'
map = require 'map-stream'
path = require('path')
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

module.exports = (dep, argv) ->
  if argv.verbose then console.log('[   build   ]')

  if typeof dep.build == 'string'
    task = with: dep.build
  else
    task = dep.build || {}

  task.bbtDir ?= dep.bbtDir
  task.name ?= dep.name
  task.target ?= 'staticLibrary'
  task.srcDir ?= dep.buildDir
  task.libDir ?= dep.libDir
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
      vinyl.src patterns, options
    map: map
    fs: fs
    gyp: gyp
    sources: []
    headers: []
    nodeGyp: ->
      defaultArgv = ['node', buildDir, '--loglevel=silent']
      gyp_argv = defaultArgv.slice()
      applyArgv gyp_argv
      if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
      gyp.parseArgv gyp_argv

      # typeString = '[c  ]'
      # if (file.path.endsWith('.cpp') || file.path.endsWith('.cc')) then typeString = '[c++]'
      # if argv.verbose then console.log typeString, file.path, gyp_argv
      # else console.log typeString, file.path
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


  gather = (srcPattern, destList) ->
    new Promise (resolve, reject) ->
      context.src srcPattern
      .pipe context.map (file, cb) ->
        destList.push path.relative buildDir, file.path
        cb null, file
      .on 'error', reject
      .on 'finish', resolve
      .on 'end', resolve

  includeDirectories = (headers) ->
    _.uniq _.reduce(headers, (memo, header) ->
      memo.concat path.dirname(path.relative buildDir, header)
    , [])

  execute: ->
    if task.pipeline
      new Promise (resolve, reject) ->
        task.pipeline.bind(context)()
        .on 'error', reject
        .on 'finish', resolve
    else
      headers = task.headers || ['**/*.h','**/*.hpp', '!test/**', '!tests/**']
      sources = task.sources || ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**']
      gypPresent = fs.existsSync(buildDir + '/binding.gyp')
      cmakePresent = fs.existsSync(buildDir + '/CMakeLists.txt')
      makefilePresent = fs.existsSync(buildDir + '/Makefile')
      if task.with == "gyp" || task.gyp || (!task.with && gypPresent)
        dep.objDir = "#{buildDir}/build"
        if gypPresent
          return context.nodeGyp()
        gather headers, context.headers
        .then -> gather sources, context.sources
        .then -> generateGypBindings.apply context
        .then -> context.nodeGyp()
      else if task.with == "cmake" || task.cmake || (!task.with && cmakePresent)
        dep.objDir = "#{buildDir}/build"
        cmake = require('./cmake')(dep, task, context, argv)
        if cmakePresent
          cmake.cmake()
        else
          gather headers, context.headers
          .then -> gather sources, context.sources
          .then -> cmake.generateLists()
          .then -> cmake.cmake()
      else if task.with == "make" || task.make || (!task.with && makefilePresent)
        dep.objDir = "#{buildDir}/obj"
        sh = require('./sh')(task, context)
        if makefilePresent
          sh.exec "make -j#{numCPUs}"
        else
          Promise.reject "bbt doesn't support autogen for make yet"
      else
        Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"
