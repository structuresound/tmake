gyp = require('node-gyp')()
_ = require 'underscore'
Promise = require 'bluebird'
fs = require './fs'
ps = require('promise-streams')
numCPUs = require('os').cpus().length
path = require('path')

# It is necessary to execute rebuild manually as calling node-gyp’s rebuild
# programmatically fires the callback function too early.
streamPromise = (stream, context) ->
  new Promise (resolve, reject) ->
    stream.bind(context)()
    .on 'finish', resolve
    .on 'end', resolve
    .on 'error', reject

manualRebuild = ->
  new Promise (resolve, reject) ->
    gyp.commands.clean [], (error) ->
      return reject(error) if error
      gyp.commands.configure [], (error) ->
        return reject(error) if error
        gyp.commands.build [], resolve

module.exports = (dep, argv, db, npmDir) ->
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

  nodeGyp = (step) ->
    defaultArgv = ['node', step.rootDir, '--loglevel=silent']
    gyp_argv = defaultArgv.slice()
    applyArgv gyp_argv
    if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
    gyp.parseArgv gyp_argv
    process.chdir step.rootDir
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
    if argv.verbose then console.log 'glob src:', task.srcDir, ":/", sourcesPattern
    fs.glob sourcesPattern, buildRoot, task.srcDir

  globLibsRecursive = (root, stack) ->
    if root.deps
      console.log "search deps for", root.deps
      db.deps.findAsync
        name:
          $in: _.map root.deps, (dep) -> dep.name
      .then (deps) ->
        Promise.each deps, (step) ->
          stack.push deps
          globLibsRecursive step, stack
    else Promise.resolve stack

  globLibs = ->
    stack = []
    globLibsRecursive dep, stack
    .then () -> Promise.resolve _.map _.flatten(stack), (step) -> step.libs

  buildContext = ->
    new Promise (resolve) ->
      context =
        includeDirs: [dep.includeDir]
        npmDir: npmDir
      globHeaders()
      .then (headers) ->
        context.headers = headers
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
        else if fs.existsSync step.rootDir + '/build.ninja' then "ninja"
        else if fs.existsSync step.rootDir + '/binding.gyp' then "gyp"
        else if fs.existsSync step.rootDir + '/CMakeLists.txt' then "cmake"
        else if fs.existsSync step.rootDir + '/Makefile' then "make"
        else Promise.reject "bbt can't find any meta-build scripts: i.e. CMakeLists.txt or binding.gyp"

  buildWith =
    gyp: (step) ->
      dep.objDir = step.buildDir = "#{buildRoot}/build"
      if fs.existsSync step.rootDir + '/binding.gyp' then nodeGyp()
      else
        buildContext()
        .then (context) -> generateGypBindings context
        .then -> nodeGyp step

    cmake: (step) ->
      dep.objDir = step.buildDir = "#{buildRoot}/build"
      cmake = require('./cmake')(dep, step, argv)
      if fs.existsSync buildRoot + '/CMakeLists.txt' then cmake.cmake()
      else
        buildContext()
        .then (context) ->
          cmake.configure context
          .then (CMakeLists) ->
            bindingPath = step.rootDir + '/CMakeLists.txt'
            fs.writeFileAsync bindingPath, CMakeLists
            .then ->
              db.deps.update {name: dep.name}, $set: cMakeFile: bindingPath
          cmake.cmake()

    make: (step) ->
      step.buildDir = buildRoot
      dep.objDir = "#{buildRoot}/obj"
      command = step.make?.command || "make"
      if fs.existsSync step.rootDir + '/Makefile'
        process.chdir step.buildDir
        require('./sh')(step, argv).exec "CXXFLAGS=\"#{step.CXXFLAGS}\" #{command} -j#{numCPUs}"
      else
        Promise.reject "bbt doesn't support autogen for make yet"

    ninja: (step) ->
      ninja = require('./ninja')(step,argv)
      bindingPath = step.rootDir + '/build.ninja'
      buildContext()
      .then (context) ->
        if step.cxxFlags then context.cxxFlags = step.cxxFlags
        if argv.verbose then console.log 'write ninja file @', bindingPath
        file = fs.createWriteStream(bindingPath)
        ninja.configure context, file
        file.end()
        ps.wait file
      .then ->
        #if argv.verbose then console.log fs.readFileSync bindingPath, 'utf8'
        db.deps.update {name: dep.name}, $set: ninjaFile: bindingPath
        ninja.build(path.dirname bindingPath)

  buildStep = (step) ->
    ### GATHER PROJECT FILES ###
    libsPattern = ['**/*.a']
    if step.target == 'dynamic' then libsPattern = ['**/*.dylib', '**/*.so', '**/*.dll']
    ### WHICH BUILD SYSTEM ###
    buildWith[resolveBuildType step] step

  build = ->
    if task.pipeline
      new Promise (resolve, reject) ->
        task.pipeline.bind(vinylContext)()
        .on 'error', reject
        .on 'finish', resolve
    else if task.steps
      Promise.each task.steps, (step) -> buildStep step
    else buildStep task

  execute: -> build().then -> db.deps.update {name: dep.name}, $set: built: true
