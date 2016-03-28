`require('source-map-support').install()`
coffee = require('coffee-script')
_ = require('underscore')
_p = require("bluebird")
path = require('path')
request = require('request-promise')
fs = require('./fs')
require('./string')
colors = require ('chalk')
platform = require './platform'
Datastore = require('nedb-promise')

module.exports = (argv, binDir, npmDir) ->
  pgname = "tmake"
  runDir = process.cwd()

  argv.cachePath ?= "trie_modules"
  argv.program ?= pgname
  argv.userCache = "#{platform.homeDir()}/.#{pgname}"
  if argv.v then argv.verbose ?= argv.v

  db = new Datastore
    filename: "#{runDir}/#{argv.cachePath}/.db"
    autoload: true

  localRepo = new Datastore
    filename: "#{argv.userCache}/packages.db"
    autoload: true

  settings = new Datastore
    filename: "#{argv.userCache}/cli.db"
    autoload: true

  prompt = require('./prompt')(argv)
  cli = require('./cli')(pgname)
  graph = require('./graph')(argv, db, runDir)
  cloud = require('./cloud')(argv, settings, prompt)

  defaultConfig = 'package.cson'
  configPath = runDir + '/' + (argv.config || defaultConfig)

  init = ->
    unless fs.existsSync(configPath)
      cli.createPackage()
      .then (config) ->
        fs.writeFileSync defaultConfig, config
    else
      console.log "aborting init, this folder already has a package.cson file present"

  clone = (dep) ->
    return unless dep.git
    require('./git')(dep, db)
    .validate()

  BuildPhases =
    fetch: (dep) ->
      if dep.provider
        switch dep.provider
          when 'local' then console.log "copying", dep.name, 'from', dep.path
          when 'git' then clone(dep)
          else
            console.log "fetching", dep.provider, ':', dep.name, dep.version
      else
        if dep.git then clone(dep)

    transform: (dep) ->
      if dep.transform then require('./transform')(dep, argv, db).execute()
    configure: (dep) ->
      require('./build/configure')(dep, argv, db, graph, npmDir).execute()
    build: (dep) ->
      configure = require('./build/configure')(dep, argv, db, graph, npmDir)
      require('./build/build')(dep, argv, db, configure).execute()
    install: (dep) -> require('./install')(dep, argv, db).execute()
    clean: (dep) -> cleanDep dep
    test: (dep) -> _p.resolve "#{dep.name} is tested!"

  cleanDep = (dep) ->
    fs.nuke dep.d.build
    fs.nuke path.join dep.d.root, 'temp'
    _.each dep.libs, (libFile) ->
      if fs.existsSync(libFile) then fs.unlinkSync libFile
    _.each dep.headers, (headerFile) ->
      if fs.existsSync(headerFile) then fs.unlinkSync headerFile
    fs.prune dep.d.root
    modifier =
      $unset:
        libs: true
        headers: true
        sources: true
        built: true
        installed: true
        configured: true
    db.update {name: dep.name}, modifier, {}
    .then ->
      if !argv.force
        if dep.buildFile
          prompt.ask colors.green "remove auto generated Configuration file #{colors.yellow dep.buildFile}?"
          .then (approved) ->
            if approved
              modifier = $unset: buildFile: true
              fs.unlinkSync dep.buildFile
              db.update {name: dep.name}, modifier, {}

  recurDeps = (name, root) ->
    if root?.name == name then return root
    found = undefined
    _.each root.deps, (dep) ->
      unless found
        if dep.name == name then found = dep
        else if graph.resolveDepName(dep) == name then found = dep
        else found = recurDeps name, dep
    found

  resolveRoot = (configFile) ->
    if argv._[1]
      dep = recurDeps argv._[1], configFile
      if dep then graph.resolveDep dep
      else throw "no dependency matching " + argv._[1]
    else
      graph.resolveDep _.extend configFile, d: root: runDir

  execute = (config, steps) ->
    resolveRoot config
    .then (root) ->
      graph.all root
    .then (deps) ->
      unless argv.quiet then console.log colors.green _.map(deps, (d) -> d.name).join(' >> ')
      _p.each deps, (dep) -> processDep dep, steps

  processDep = (dep, steps) ->
    console.log colors.magenta "<< #{dep.name} >>"
    if (!dep.cached || argv._[0] == "clean" || argv.force)
      _p.each steps, (step) ->
        console.log colors.green ">> #{step} >>"
        process.chdir runDir
        BuildPhases[step](dep)
    else _p.resolve dep

  unlink = (config) ->
    query = {name: config.name, version: config.version}
    localRepo.findOne query
    .then (doc) ->
      if doc
        localRepo.remove query
      else _p.resolve()

  link = (config) ->
    prompt.ask colors.green "link will do a full build, test and if successful will link to the local db @ #{argv.userCache}\n#{colors.yellow "do that now?"} #{colors.gray "(yy = disable this warning)"}"
    .then (res) ->
      if res then execute config, ["fetch","transform","configure","build","install","test"]
      else _p.reject 'user abort'
    .then ->
      db.findOne name: config.name
    .then (json) ->
      if json.built
        console.log colors.magenta "#{json.name} >> local repo"
        doc = _.omit json, '_id', 'buildFile', 'built', 'installed'
        if argv.verbose then console.log JSON.stringify doc,0,2
        query = {name: doc.name, version: doc.version}
        localRepo.findOne query
        .then (existing) ->
          if existing
            localRepo.update query, {$set: doc}, {}
          else
            localRepo.insert doc
      else _p.reject "link failed because build or test failed"

  push = (config) ->
    location = 'localhost'
    prompt.ask colors.green "push will do a clean, full build, test and if successful will upload to the #{colors.yellow "public repository"}\n#{colors.yellow "do that now?"} #{colors.gray "(yy = disable this warning)"}"
    .then (res) ->
      if res then execute config, ["fetch","transform","configure","build","install","test"]
      else _p.reject 'user abort'
    .then ->
      db.findOne name: config.name
    .then (json) ->
      if json.built
        cloud.post json
        .then (res) ->
          if argv.v then console.log colors.magenta "<< #{JSON.stringify res,0,2}"
          _p.resolve res
      else _p.reject "link failed because build or test failed"

  run: ->
    fs.getConfigAsync configPath
    .then (config) ->
      argv._[0] ?= 'all'
      resolvedName = argv._[1] || config.name || graph.resolveDepName config
      try
        cli.parse argv
      catch e
        return console.log e
      if config
        switch argv._[0]
          when 'clean'
            if resolvedName == 'all'
              db.find name: resolvedName
              .then (deps) ->
                _p.each deps, (dep) -> execute dep, ["clean"]
              .then ->
                fs.nuke path.join(runDir, argv.cachePath)
                console.log 'so fresh'
            else
              db.findOne name: resolvedName
              .then (dep) ->
                if dep then execute dep, ["clean"]
                else console.log 'didn\'t find dep for', resolvedName
          when 'link'
            db.findOne name: resolvedName
            .then (dep) -> link dep || config
          when 'unlink'
            db.findOne name: resolvedName
            .then (dep) -> unlink dep || config
          when 'push'
            db.findOne name: resolvedName
            .then (dep) -> push dep || config
          when 'test'
            execute config, ["test"]
          when 'fetch'
            execute config, ["fetch"]
          when 'transform'
            execute config, ["fetch","transform"]
          when 'configure'
            execute config, ["fetch","transform","configure"]
          when 'build'
            execute config, ["build"]
          when 'install'
            execute config, ["install"]
          when 'all'
            execute config, ["fetch","transform","configure","build","install"]
          when 'example'
            console.log "there's already a project in this folder"
          when 'path'
            selector = {}
            if argv._[1]
              selector = name: argv._[1]
              db.find selector
              .then (deps) ->
                console.log JSON.stringify _.map(deps, (dep) -> graph.resolvePaths dep),0,2
          when 'ls'
            selector = {}
            repo = localRepo
            if argv._[1] == 'project' then repo = db
            else if argv._[1] then selector = name: argv._[1]
            repo.find selector
            .then (deps) -> console.log JSON.stringify deps,0,2
          else console.log cli.manual()
      else
        switch argv._[0]
          when 'init'
            init()
          when 'example'
            example = argv._[1] || "served"
            examplePath = path.join npmDir, "examples/#{example}"
            targetFolder = argv._[2] || example
            console.log colors.magenta "copy from #{example} to #{targetFolder}"
            fs.src ["**/*"], cwd: examplePath
            .pipe fs.dest path.join runDir, targetFolder
          when 'help', 'man', 'manual' then console.log cli.manual()
          else
            console.log cli.hello()