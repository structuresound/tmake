_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../util/fs'
path = require('path')
check = require('../util/check')
sh = require('../util/sh')
_log = require('../util/log')
{ jsonStableHash } = require '../util/hash'
{ stringHash } = require '../util/hash'
{ fileHash } = require '../util/hash'
_toolchain = require './toolchain'
_graph = require '../graph'
_fetch = require '../util/fetch'

module.exports = (argv, dep, platform, db, configureTests) ->
  toolchain = _toolchain(argv, dep, platform, db)
  graph = _graph(argv, dep, platform, db)
  fetch = _fetch(argv, dep, platform, db)

  log = _log argv
  commands =
    any: (obj) -> commands.shell(obj)
    ninja: -> commands.with 'ninja'
    cmake: -> commands.with 'cmake'
    make: -> commands.with 'make'
    xcode: -> commands.with 'xcode'
    replace: (obj) ->
      Promise.each platform.iterable(obj), (replEntry) ->
        fs.glob platform.globArray(replEntry.matching, dep), undefined, dep.d.source
        .then (files) ->
          Promise.each files, (file) ->
            platform.replaceInFile file, replEntry, dep

    shell: (obj) ->
      Promise.each platform.iterable(obj), (c) ->
        if check c, String then c = cmd: c
        sh.Promise platform.parse(c.cmd, dep), platform.pathSetting(c.cwd || dep.d.source, dep), !argv.quiet

    create: (obj) ->
      Promise.each platform.iterable(obj), (e) ->
        filePath = path.join dep.d.source, e.path
        existing = fs.readIfExists filePath
        if existing != e.string
          log.verbose "create file #{filePath}"
          fs.writeFileAsync filePath, e.string, encoding: 'utf8'

    with: (system) ->
      log.verbose "configure for: #{system}"
      createBuildFileFor system

    copy: (obj) ->
      Promise.each platform.iterable(obj), (e) ->
        log.quiet "copy #{e}"
        copy e.matching, platform.pathSetting(e.from, dep), platform.pathSetting(e.to, dep), false

  settings = ['linkerFlags', 'cFlags', 'cxxFlags', 'compilerFlags', 'defines', 'frameworks', 'sources', 'headers', 'outputFile']
  filter = [ 'with', 'ninja', 'xcode', 'cmake', 'make' ].concat settings

  _build = _.pick(dep.build, filter)
  _configuration = dep.configure

  if configureTests && dep.test
    _build = _.pick(dep.test.build, filter)
    _configuration = dep.test.configure

  configuration = _.extend _build, _configuration
  copy = (patterns, from, to, flatten) ->
    filePaths = []
    fs.wait(fs.src(patterns,
      cwd: from
      followSymlinks: false
    ).pipe(fs.map (file, emit) ->
      log.verbose "+ #{path.relative file.cwd, file.path}"
      if flatten then file.base = path.dirname file.path
      newPath = to + '/' + path.relative file.base, file.path
      filePaths.push path.relative dep.d.home, newPath
      emit(null, file)
    ).pipe(fs.dest to)
    ).then ->
      Promise.resolve filePaths

  globHeaders = ->
    patterns = platform.globArray(configuration.headers?.matching || ['**/*.h','**/*.hpp', '**/*.ipp', '!test/**', '!tests/**', '!build/**'], dep)
    Promise.map dep.d.includeDirs, (path) ->
      fs.glob patterns, dep.d.project, path
    .then (stack) ->
      Promise.resolve _.flatten stack

  globSources = ->
    patterns = platform.globArray(configuration.sources?.matching || ['**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**'], dep)
    fs.glob patterns, dep.d.project, dep.d.source

  globDeps = -> graph.deps dep

  flags = require './flags'

  stdCompilerFlags =
    clang:
      ios:
        arch: "arm64"
        isysroot: "{CROSS_TOP}/SDKs/{CROSS_SDK}"
        "miphoneos-version-min": "={SDK_VERSION}"
        simulator:
          "mios-simulator-version-min": "=6.1"
          isysroot: "{CROSS_TOP}/SDKs/{CROSS_SDK}"
      # arch: "{ARCH}"

  # stdMmFlags =
  #   "fobjc-abi-version": 2

  stdCxxFlags =
    O: 2
    mac:
      std: "c++11"
      stdlib: "libc++"
    linux:
      std: "c++0x"
      pthread: true

  stdFrameworks =
    mac:
      CoreFoundation: true

  stdLinkerFlags =
    # static: true
    linux:
      "lstdc++": true
      "lpthread": true
    mac:
      "lc++": true

  jsonFlags =
    frameworks: platform.select(configuration.frameworks || stdFrameworks)
    cFlags: _.omit(_.extend(platform.select(stdCxxFlags), platform.select(configuration.cFlags || configuration.cxxFlags)), ['std','stdlib'])
    cxxFlags: _.extend(platform.select(stdCxxFlags), platform.select(configuration.cxxFlags || configuration.cFlags))
    linkerFlags: _.extend(platform.select(stdLinkerFlags), platform.select(configuration.linkerFlags))
    compilerFlags: _.extend(platform.select(stdCompilerFlags), platform.select(configuration.compilerFlags))

  selectHostToolchain = ->
    compiler = argv.compiler
    if dep.build then compiler ?= dep.build.cc
    if dep.configure then compiler ?= dep.configure.cc

    hostToolchain = toolchain.select(dep.toolchain)
    log.verbose hostToolchain
    log.verbose "look for compiler #{compiler}"
    cc = toolchain.pathForTool hostToolchain[compiler]
    hostToolchain: hostToolchain
    compiler: compiler
    cc: cc

  createContext = ->
    dep.toolchainConfiguration =
      target: dep.target
      frameworks: flags.parseFrameworks jsonFlags.frameworks
      cFlags: flags.parseC jsonFlags.cFlags
      cxxFlags: flags.parseC jsonFlags.cxxFlags
      linkerFlags: flags.parse jsonFlags.linkerFlags
      compilerFlags: flags.parse jsonFlags.compilerFlags, join: " "
    _.extend dep.toolchainConfiguration, selectHostToolchain()
    dep.configuration = _.clone dep.toolchainConfiguration

  globFiles = ->
    globHeaders()
    .then (headers) ->
      dep.configuration.headers = headers
      globSources()
    .then (sources) ->
      dep.configuration.sources = sources
      globDeps()
    .then (depGraph) ->
      if depGraph.length
        dep.configuration.libs = _.chain depGraph
        .map (d) -> _.map d.libs, (lib) -> path.join(d.d.home, lib)
        .flatten()
        .value()
        .reverse()
      dep.configuration.includeDirs = _.union ["#{dep.d.home}/include"], dep.d.includeDirs
      Promise.resolve()

  getBuildFile = (systemName) ->
    buildFileNames =
      ninja: 'build.ninja'
      cmake: 'CMakeLists.txt'
      gyp: 'binding.gyp'
      make: 'Makefile'
      xcode: "#{dep.name}.xcodeproj"
    buildFileNames[systemName]

  getBuildFilePath = (systemName) ->
    path.join dep.d.project, getBuildFile(systemName)

  createBuildFileFor = (systemName) ->
    fs.existsAsync getBuildFilePath(systemName)
    .then (exists) ->
      if exists
        buildFileName = getBuildFile systemName
        log.quiet "using pre-existing build file #{buildFileName}"
        dep.cache.buildFile = buildFileName
        db.update {name: dep.name}, {$set: {"cache.buildFile": dep.cache.buildFile}}
      else
        generateConfig systemName

  generateConfig = (systemName) ->
    buildFileName = getBuildFile systemName
    buildFile = getBuildFilePath systemName
    globFiles()
    .then ->
      switch systemName
        when 'ninja'
          require('./ninja')(argv, dep, platform, db).generate buildFile
        when 'cmake'
          require('./cmake')(argv, dep, platform, db).generate()
          .then (CMakeLists) ->
            fs.writeFileAsync buildFile, CMakeLists
        when 'gyp'
          require('./gyp')(argv, dep, platform, db).generate()
          .then (binding) ->
            fs.writeFileAsync buildFile, JSON.stringify(binding, 0, 2)
        when 'make'
          require('./make')(dep.configuration).generate()
          .then (Makefile) ->
            fs.writeFileAsync buildFile, JSON.stringify(Makefile, 0, 2)
        when 'xcode'
          require('./xcode')(argv, dep, platform, db).generate buildFile
    .then ->
      dep.cache.buildFile = buildFileName
      db.update {name: dep.name}, {$set: {"cache.buildFile": dep.cache.buildFile, "cache.generatedBuildFile": dep.cache.buildFile}}

  hashMetaConfiguration = ->
    urlHash = stringHash(fetch.resolveUrl())
    stringHash(urlHash + jsonStableHash(configuration))

  needsReconfigure = (cumulativeHash) ->
    if dep.cache.metaConfiguration
      if (cumulativeHash != dep.cache.metaConfiguration)
        url = fetch.resolveUrl()
        if dep.cache.url != stringHash(url)
          log.error "url is stale, now #{url}"
        else
          log.error "#{dep.name} configuration is stale #{dep.cache.metaConfiguration}, now #{cumulativeHash}"
          log.error configuration
        true
    else
      true

  hashMetaConfiguration: hashMetaConfiguration
  commands: commands
  execute: ->
    createContext()
    configHash = hashMetaConfiguration()
    if (platform.force(dep) || needsReconfigure(configHash))
      platform.iterate configuration, commands, settings
      .then ->
        db.update {name: dep.name}, {$set: {"cache.metaConfiguration": configHash}}
    else
      log.verbose "configuration #{configHash} is current, use --force=#{dep.name} if you suspect the cache is stale"
      Promise.resolve()
