_ = require('underscore')
_p = require("bluebird")
path = require('path')
colors = require ('chalk')
Datastore = require('nedb-promise')

require('./util/string')
fs = require('./util/fs')
cascade = require('./dsl/cascade')
_platform = require('./dsl/platform')
_prompt = require('./prompt')
_graph = require('./graph')
_cloud = require('./cloud')
_configure = require('./build/configure')
_build = require('./build/build')
_install = require('./install')
_fetch = require('./util/fetch')
_test = require './test'
_log = require('./util/log')

module.exports = (argv, rootConfig, cli, db, localRepo, settings) ->
  argv.runDir ?= process.cwd()
  runDir = argv.runDir
  log = _log argv
  unless db
    db = new Datastore
      filename: "#{runDir}/#{argv.cachePath}/.db"
      autoload: true

  unless localRepo
    localRepo = new Datastore
      filename: "#{argv.userCache}/packages.db"
      autoload: true

  unless settings
    settings = new Datastore
      filename: "#{argv.userCache}/cli.db"
      autoload: true

  prompt = _prompt(argv)
  platform = _platform(argv, rootConfig)
  graph = _graph(argv, undefined, platform, db)
  cloud = _cloud(argv, settings, prompt)

  buildPhase =
    fetch: (dep) ->
      if dep.fetch || dep.git || dep.link
        fetch = _fetch(argv, dep, platform, db)
        if dep.link
          fetch.linkSource()
        else
          fetch.validate()
      else
        _p.resolve()
    configure: (dep, tests) ->
      configure = _configure(argv, dep, platform, db, tests)
      if configure.hashMetaConfiguration() != dep.cache.metaConfiguration
        if dep.cache.url
          fs.nuke dep.d.clone
      buildPhase.fetch(dep)
      .then ->
        configure.execute()
        .then -> _install(argv, dep, platform, db, tests).installHeaders()
    build: (dep, tests) ->
      buildPhase.configure(dep, tests)
      .then ->
        _build(argv, dep, platform, db, tests).execute()
    install: (dep, phase, tests) ->
      buildPhase.build(dep, tests)
      .then ->
        _install(argv, dep, platform, db).execute()
    clean: (dep) ->
      cleanDep dep
    test: (dep) ->
      buildPhase.build(dep, true)
      .then ->
        _test(argv, dep, platform, db).execute()

  cleanDep = (dep) ->
    log.quiet "cleaning #{dep.name}"
    log.verbose dep.d
    log.verbose dep.libs
    if fs.existsSync(dep.d.build)
      log.quiet "rm -R #{dep.d.build}"
      fs.nuke dep.d.build
    _.each dep.libs, (libFile) ->
      log.quiet "rm #{libFile}"
      if fs.existsSync(libFile)
        fs.unlinkSync libFile
    fs.prune dep.d.root
    modifier =
      $unset:
        "cache.configuration": true
        "cache.metaConfiguration": true
        "cache.target": true
        "cache.libs": true
        "cache.bin": true
    preserve = ["_id", "cache", "name"]
    _.each dep, (v,k) ->
      unless _.contains preserve, k then modifier.$unset[k] = true
    db.update {name: dep.name}, modifier, {}
    .then ->
      if dep.cache.generatedBuildFile
        generatedBuildFile = path.join dep.d.project, dep.cache.buildFile
        modifier = $unset:
          "cache.buildFile": true
        try
          if fs.existsSync generatedBuildFile
            log.quiet "clean generatedBuildFile #{generatedBuildFile}"
            if fs.lstatSync(generatedBuildFile).isDirectory()
              fs.nuke generatedBuildFile
            else
              fs.unlinkSync generatedBuildFile
        catch err
          log.error err colors.yellow err.message || err
        db.update {name: dep.name}, modifier, {}

  findDepNamed = (name, root) ->
    if root?.name == name then return root
    found = undefined
    _.each root.deps || root.dependencies, (dep) ->
      unless found
        if dep.name == name then found = dep
        else if graph.resolveDepName(dep) == name then found = dep
        else found = findDepNamed name, dep
    found

  resolveRoot = (configFile) ->
    if argv._[1]
      dep = findDepNamed argv._[1], configFile
      if dep then graph.resolve dep
      else throw new Error "no dependency matching " + argv._[1]
    else
      graph.resolve _.extend configFile, d: root: runDir

  execute = (rawConfig, phase) ->
    resolveRoot rawConfig
    .then (deps) ->
      unless argv.quiet then console.log colors.green _.map(deps, (d) -> d.name).join(' >> ')
      if argv.nodeps
        processDep root, phase
      else
        _p.each deps, (dep) -> processDep dep, phase

  processDep = (dep, phase) ->
    unless argv.quiet then console.log colors.magenta "<< #{dep.name} >>"
    if (!dep.cached || argv._[0] == "clean" || platform.force(dep))
      if argv.verbose then console.log colors.gray ">> #{phase} >>"
      process.chdir runDir
      buildPhase[phase] dep
    else _p.resolve dep

  unlink = (config) ->
    query = {name: config.name, tag: config.tag || "master"}
    localRepo.findOne query
    .then (doc) ->
      if doc
        localRepo.remove query
      else _p.resolve()

  link = (config) ->
    prompt.ask colors.green "link will do a full build, test and if successful will link to the local db @ #{argv.userCache}\n#{colors.yellow "do that now?"} #{colors.gray "(yy = disable this warning)"}"
    .then (res) ->
      if res then execute config, "install"
      else _p.reject 'user abort'
    .then ->
      db.findOne name: config.name
    .then (json) ->
      if (json.cache.bin || json.cache.libs)
        unless argv.quiet then console.log colors.magenta "#{json.name} >> local repo"
        doc = _.omit json, '_id', 'cache'
        if argv.verbose then console.log JSON.stringify doc,0,2
        query = {name: doc.name, tag: doc.tag || "master"}
        localRepo.update query, {$set: doc}, {upsert: true}
      else _p.reject new Error "link failed because build or test failed"

  push = (config) ->
    prompt.ask colors.green "push will do a clean, full build, test and if successful will upload to the #{colors.yellow "public repository"}\n#{colors.yellow "do that now?"} #{colors.gray "(yy = disable this warning)"}"
    .then (res) ->
      if res then execute config, "install"
      else _p.reject 'user aborted push command'
    .then ->
      db.findOne name: config.name
    .then (json) ->
      if (json.cache.bin || json.cache.libs)
        cloud.post json
        .then (res) ->
          if argv.v then console.log colors.magenta "<< #{JSON.stringify res,0,2}"
          _p.resolve res
      else _p.reject new Error "link failed because build or test failed"

  execute: execute
  push: push
  link: link
  unlink: unlink
  platform: platform
  run: ->
    resolvedName = argv._[1] || rootConfig.name || graph.resolveDepName rootConfig
    switch argv._[0]
      when 'rm'
        db.remove name: resolvedName
        .then ->
          console.log "cleared cache for #{resolvedName}"
      when 'clean'
        findAndClean = (depName) ->
          db.findOne name: depName
          .then (dep) ->
            if dep
              graph.resolveDep dep
              .then cleanDep
              .then ->
                db.findOne name: depName
                .then (cleaned) ->
                  log.verbose cleaned
            else console.log colors.red 'didn\'t find dep for', depName

        if resolvedName == 'all' && rootConfig.deps
          _p.each rootConfig.deps, (dep) ->
            findAndClean dep.name
          .then ->
            findAndClean rootConfig.name
        else
          graph.resolveDep rootConfig
          .then cleanDep

      when 'reset', 'nuke'
        log.quiet "nuke cache #{path.join(runDir, argv.cachePath)}"
        fs.nuke path.join(runDir, argv.cachePath)
        fs.nuke path.join(runDir, 'bin')
        fs.nuke path.join(runDir, 'build')
        log.quiet 'post nuke freshness'
      when 'link'
        db.findOne name: resolvedName
        .then (dep) -> link dep || rootConfig
      when 'unlink'
        db.findOne name: resolvedName
        .then (dep) -> unlink dep || rootConfig
      when 'push'
        db.findOne name: resolvedName
        .then (dep) -> push dep || rootConfig
      when 'test'
        execute rootConfig, "test"
      when 'fetch'
        execute rootConfig, "fetch"
      when "parse"
        console.log "parsing with selectors:\n #{platform.selectors}"
        parsed = graph.resolve rootConfig
        log.quiet parsed, 'magenta'
      when 'configure'
        execute rootConfig, "configure"
      when 'build'
        execute rootConfig, "build"
      when 'install'
        execute rootConfig, "install"
      when 'all'
        execute rootConfig, "install"
      when 'example', 'init'
        console.log colors.red "there's already a #{argv.program} project file in this directory"
      when 'path'
        selector = {}
        if argv._[1]
          selector = name: argv._[1]
          db.find selector
          .then (deps) ->
            log.verbose _.map(deps, (dep) -> graph.resolvePaths dep)
      when 'ls', 'list'
        selector = {}
        repo = db
        if argv._[1] == 'local'
          repo = localRepo
          selector = name: argv._[2]
        else if argv._[1] then selector = name: argv._[1]
        repo.find selector
        .then (deps) -> console.log JSON.stringify deps,0,2
      else console.log cli.manual()
