_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
path = require('path')
colors = require ('chalk')
check = require('../check')
cascade = require('../cascade')
sh = require('../sh')

module.exports = (dep, argv, db, graph, parse, configureTests) ->
  commands =
    any: (obj) -> commands.shell(obj)
    ninja: -> commands.with 'ninja'
    cmake: -> commands.with 'cmake'
    make: -> commands.with 'make'
    replace: (obj) ->
      Promise.each parse.iterable(obj), (replEntry) ->
        fs.glob parse.globArray(replEntry.matching, dep), undefined, dep.d.source
        .then (files) ->
          Promise.each files, (file) ->
            parse.replaceInFile file, replEntry, dep

    shell: (obj) ->
      Promise.each parse.iterable(obj), (c) ->
        if check c, String then c = cmd: c
        sh.Promise parse.configSetting(c.cmd), parse.pathSetting(c.cwd || dep.d.source, dep), !argv.quiet

    create: (obj) ->
      Promise.each parse.iterable(obj), (e) ->
        filePath = path.join dep.d.source, e.path
        if argv.verbose then console.log 'create file', filePath
        fs.writeFileAsync filePath, e.string, encoding: 'utf8'

    with: (system) ->
      if argv.verbose then console.log 'configure for:', system
      configureFor system

    copy: (obj) ->
      Promise.each parse.iterable(obj), (e) ->
        console.log 'copy', e
        copy e.matching, parse.pathSetting(e.from, dep), parse.pathSetting(e.to, dep), false

  platform = require('../platform')(argv, dep)
  settings = ['ldFlags', 'cFlags', 'cxxFlags', 'frameworks', 'sources', 'headers', 'outputFile']
  filter = [ 'with', 'ninja', 'cmake', 'make' ].concat settings

  _build = _.pick(dep.build, filter)
  _configuration = dep.configure

  if configureTests && dep.test
    _build = _.pick(dep.test.build, filter)
    _configuration = dep.test.configure

  configuration = _.extend _build, dep.configure

  copy = (patterns, from, to, flatten) ->
    filePaths = []
    fs.wait(fs.src(patterns,
      cwd: from
      followSymlinks: false
    ).pipe(fs.map (file, emit) ->
      if argv.verbose then console.log '+ ', path.relative file.cwd, file.path
      if flatten then file.base = path.dirname file.path
      newPath = to + '/' + path.relative file.base, file.path
      filePaths.push path.relative dep.d.home, newPath
      emit(null, file)
    ).pipe(fs.dest to)
    ).then ->
      Promise.resolve filePaths

  globHeaders = ->
    patterns = parse.globArray(configuration.headers?.matching || ['**/*.h','**/*.hpp', '**/*.ipp', '!test/**', '!tests/**', '!build/**'], dep)
    Promise.map dep.d.includeDirs, (path) ->
      fs.glob patterns, dep.d.project, path
    .then (stack) ->
      Promise.resolve _.flatten stack

  globSources = ->
    patterns = parse.globArray(configuration.sources?.matching || ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**'], dep)
    if argv.dev then console.log 'glob src:', dep.d.source, ":/", patterns
    fs.glob patterns, dep.d.project, dep.d.source

  linkNames = ->
    patterns = parse.globArray(configuration.sources?.matching || ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**'], dep)
    if argv.dev then console.log 'glob src:', dep.d.source, ":/", patterns
    fs.glob patterns, dep.d.source, dep.d.source

  globDeps = -> graph.deps dep

  cascadingPlatformArgs = (base) ->
    return unless base
    cascade.deep _.clone(base), platform.keywords(), [platform.name()]

  stdCFlags =
    O: 2
    linux:
      pthread: 1

  stdCxxFlags =
    O: 2
    mac:
      std: "c++11"
      stdlib: "libc++"
    linux:
      std: "c++0x"
      pthread: 1

  stdFrameworks =
    mac:
      CoreFoundation: 1

  stdLdFlags =
    # static: true
    linux:
      "lstdc++": 1
      "lpthread": 1
    mac:
      "lc++": 1

  jsonToCFlags = (options) ->
    jsonToCxxFlags _.omit options, ['std','stdlib']

  jsonToCxxFlags = (options) ->
    opt = options
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

  jsonToFrameworks = (options) ->
    opt = cascadingPlatformArgs options
    flags = []
    for i of opt
      if opt[i]
        if fs.existsSync "/System/Library/Frameworks/#{i}.framework"
          flags.push "/System/Library/Frameworks/#{i}.framework/#{i}"
        else throw new Error "can't find framework #{i}.framework in /System/Library/Frameworks"
    flags

  jsonToLDFlags = (options) ->
    opt = cascadingPlatformArgs options
    jsonToFlags opt

  _jsonToFlags = (prefix, json) ->
    flags = []
    _.each json, (opt, key) ->
      if typeof opt == 'string'
        flags.push "#{prefix}#{key}=#{opt}"
      else if opt
        flags.push "#{prefix}#{key}"
    if flags.length then flags.join ' '
    else ''

  jsonToFlags = (json) ->
    _jsonToFlags '-', json

  createContext = ->
    new Promise (resolve) ->
      context =
        name: dep.name
        target: dep.target
        npmDir: argv.npmDir
        frameworks: jsonToFrameworks configuration.frameworks || stdFrameworks
        cFlags: jsonToCFlags _.extend cascadingPlatformArgs(stdCFlags), cascadingPlatformArgs(configuration.cFlags || configuration.cxxFlags)
        cxxFlags: jsonToCxxFlags _.extend(cascadingPlatformArgs(stdCxxFlags), cascadingPlatformArgs(configuration.cxxFlags || configuration.cFlags))
        ldFlags: jsonToLDFlags configuration.ldFlags || stdLdFlags
      globHeaders()
      .then (headers) ->
        context.headers = headers
        globSources()
      .then (sources) ->
        context.sources = sources
        linkNames()
      .then (linkNames) ->
        context.linkNames = linkNames
        globDeps()
      .then (depGraph) ->
        if depGraph.length
          # gather = []
          # _.each depGraph, (subDep) ->
          #   _.each subDep.d.install.headers, (ft) ->
          #     gather.push ft.includeFrom || ft.to
          # context.includeDirs = _.uniq gather
          context.libs = _.chain depGraph
          .map (d) -> _.map d.libs, (lib) -> path.join(d.d.home, lib)
          .flatten()
          .value()
          .reverse()
        context.includeDirs = _.union ["#{dep.d.home}/include"], dep.d.includeDirs
        if argv.verbose then console.log colors.yellow JSON.stringify context.includeDirs, 0, 2
        resolve context

  buildFilePath = (systemName) ->
    buildFileNames =
      ninja: 'build.ninja'
      cmake: 'CMakeLists.txt'
      gyp: 'binding.gyp'
      make: 'Makefile'
    path.join dep.d.project, buildFileNames[systemName]

  configureFor = (systemName) ->
    dep.cache.buildFile = buildFilePath systemName
    fs.existsAsync dep.cache.buildFile
    .then (exists) ->
      if (!exists || (parse.force() && dep.cache.generatedBuildFile))
        createContext()
        .then (context) ->
          switch systemName
            when 'ninja'
              file = fs.createWriteStream(dep.cache.buildFile)
              require('./ninja')(dep,argv).generate context, file
              file.end()
              fs.wait file, true
            when 'cmake'
              require('./cmake')(dep, argv).generate context
              .then (CMakeLists) ->
                fs.writeFileAsync dep.cache.buildFile, CMakeLists
            when 'gyp'
              require('./gyp')(configuration, dep, argv).generate context
              .then (binding) ->
                if argv.verbose then console.log 'node-gyp:', dep.cache.buildFile, JSON.stringify(binding, 0, 2)
                fs.writeFileAsync dep.cache.buildFile, JSON.stringify(binding, 0, 2)
            when 'make'
              require('./make')(context).generate context
              .then (Makefile) ->
                fs.writeFileAsync dep.cache.buildFile, JSON.stringify(Makefile, 0, 2)
        .then ->
          db.update {name: dep.name}, {$set: {"cache.buildFile": dep.cache.buildFile, "cache.generatedBuildFile": dep.cache.buildFile}}, {}
      else if exists
        db.update {name: dep.name}, {$set: {"cache.buildFile": dep.cache.buildFile}}, {}
      else
        Promise.resolve dep.cache.buildFile

  buildType = (obj) ->
    return unless obj
    if obj.with then obj.with
    else if obj.ninja then 'ninja'
    else if obj.cmake then 'cmake'
    else if obj.make then 'make'

  getContext: -> createContext()
  commands: commands
  execute: ->
    return Promise.resolve() if (dep.cache?.configured && !parse.force())
    parse.iterate configuration, commands, settings
    .then ->
      db.update {name: dep.name}, {$set: {"cache.configured": true}}, {}
