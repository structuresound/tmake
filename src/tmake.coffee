_ = require('underscore')
_p = require("bluebird")
path = require('path')
fs = require('./fs')
require('./string')
colors = require ('chalk')
Datastore = require('nedb-promise')
cascade = require('./cascade')
check = require('./check')

module.exports = (argv, rootConfig, cli, db, localRepo, settings) ->
  argv.runDir ?= process.cwd()
  runDir = argv.runDir

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

  prompt = require('./prompt')(argv)
  platform = require('./platform')(argv, rootConfig)
  graph = require('./graph')(argv, db, platform)
  cloud = require('./cloud')(argv, settings, prompt)

  allStrings = (o, fn) ->
    rec = (o) ->
      # console.log 'parsing', o
      for k of o
        if check o[k], String
          o[k] = fn o[k]
        else if check(o[k], Object) || check(o[k], Array)
          rec o[k]
    rec o

  buildPhase = (dep, phase) ->
    parse = require('./parse')(dep, argv)
    switch phase
      when "fetch"
        if dep.fetch || dep.git || dep.link
          fetch = require('./fetch')(dep, db, argv, parse)
          if dep.link
            fetch.linkSource()
          else
            fetch.validate()
        else
          _p.resolve()
      when "transform"
        if dep.transform then require('./transform')(dep, argv, db).execute()
      when "configure"
        require('./build/configure')(dep, argv, db, graph, parse).execute()
      when "build"
        require('./build/build')(dep, argv, db, parse, false).execute()
      when "install"
        require('./install')(dep, argv, db, parse).execute()
      when "clean"
        cleanDep dep
      when "test"
        require('./build/configure')(dep, argv, db, graph, parse, true).execute()
        .then ->
          require('./build/build')(dep, argv, db, parse, true).execute()
        .then ->
          require('./test')(dep, argv, db).execute()
      when "parse"
        if argv._[2]
          console.log colors.magenta parse.configSetting argv._[2]
        copy = _.clone dep
        allStrings copy, parse.configSetting
        console.log colors.magenta JSON.stringify copy, 0, 2

  cleanDep = (dep) ->
    if fs.existsSync(dep.d.build)
      fs.nuke dep.d.build
    fs.nuke path.join dep.d.root, 'temp'
    _.each dep.libs, (libFile) ->
      if fs.existsSync(libFile) then fs.unlinkSync libFile
    _.each dep.headers, (headerFile) ->
      if fs.existsSync(headerFile) then fs.unlinkSync headerFile
    fs.prune dep.d.root
    modifier =
      $unset:
        "cache.configured": true
        "cache.built": true
        "cache.installed": true
        "cache.git.checkout": true
        "cache.buildFile": true
    preserve = ["_id", "cache", "name"]
    _.each dep, (v,k) ->
      unless _.contains preserve, k then modifier.$unset[k] = true
    db.update {name: dep.name}, modifier, {}
    .then ->
      parse = require('./parse')(dep, argv)
      generatedBuildFile = dep.cache.generatedBuildFile
      if generatedBuildFile
        prompt.ask colors.green("remove auto generated Configuration file #{colors.yellow generatedBuildFile}?"), 'y', parse.force()
        .then (approved) ->
          if approved
            modifier = $unset:
              "cache.generatedBuildFile": true
            fs.unlinkSync generatedBuildFile
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
      if dep then graph.resolveDep dep
      else throw new Error "no dependency matching " + argv._[1]
    else
      graph.resolveDep _.extend configFile, d: root: runDir

  execute = (rawConfig, steps) ->
    runConfig = cascade.deep rawConfig, platform.keywords(), platform.selectors()
    resolveRoot runConfig
    .then (root) ->
      graph.all root
      .then (deps) ->
        if argv._[1] && argv.verbose then console.log JSON.stringify deps, 0, 2
        unless argv.quiet then console.log colors.green _.map(deps, (d) -> d.name).join(' >> ')
        if argv.nodeps
          processDep root, steps
        else
          _p.each deps, (dep) -> processDep dep, steps

  processDep = (dep, steps) ->
    unless argv.quiet then console.log colors.magenta "<< #{dep.name} >>"
    parse = require('./parse')(dep, argv)
    if (!dep.cached || argv._[0] == "clean" || parse.force())
      _p.each steps, (phase) ->
        if argv.verbose then console.log colors.gray ">> #{phase} >>"
        process.chdir runDir
        buildPhase dep, phase
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
      if json.cache.built
        unless argv.quiet then console.log colors.magenta "#{json.name} >> local repo"
        doc = _.omit json, '_id', 'cache'
        if argv.verbose then console.log JSON.stringify doc,0,2
        query = {name: doc.name, tag: doc.tag || "master"}
        localRepo.update query, {$set: doc}, {upsert: true}
      else _p.reject "link failed because build or test failed"

  push = (config) ->
    prompt.ask colors.green "push will do a clean, full build, test and if successful will upload to the #{colors.yellow "public repository"}\n#{colors.yellow "do that now?"} #{colors.gray "(yy = disable this warning)"}"
    .then (res) ->
      if res then execute config, ["fetch","transform","configure","build","install","test"]
      else _p.reject 'user abort'
    .then ->
      db.findOne name: config.name
    .then (json) ->
      if json.cache.built
        cloud.post json
        .then (res) ->
          if argv.v then console.log colors.magenta "<< #{JSON.stringify res,0,2}"
          _p.resolve res
      else _p.reject "link failed because build or test failed"

  execute: execute
  push: push
  link: link
  unlink: unlink
  run: ->
    resolvedName = argv._[1] || rootConfig.name || graph.resolveDepName rootConfig
    switch argv._[0]
      when 'rm'
        db.remove name: resolvedName
        .then ->
          console.log "cleared cache for #{resolvedName}"
      when 'clean'
        if resolvedName == 'all'
          db.find name: resolvedName
          .then (deps) ->
            _p.each deps, (dep) -> cleanDep dep
          .then ->
            fs.nuke path.join(runDir, argv.cachePath)
            console.log 'so fresh'
        else
          db.findOne name: resolvedName
          .then (dep) ->
            if dep
              graph.resolveDep dep
              .then (resolved) ->
                cleanDep resolved
              .then ->
                db.findOne name: resolvedName
                .then (cleaned) ->
                  console.log JSON.stringify cleaned, 0, 2
            else console.log colors.red 'didn\'t find dep for', resolvedName
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
        execute rootConfig, ["test"]
      when 'fetch'
        execute rootConfig, ["fetch"]
      when 'parse'
        execute rootConfig, ["parse"]
      when 'transform'
        execute rootConfig, ["fetch","transform"]
      when 'configure'
        execute rootConfig, ["fetch","transform","configure"]
      when 'build'
        execute rootConfig, ["build"]
      when 'install'
        execute rootConfig, ["install"]
      when 'all'
        execute rootConfig, ["fetch","transform","configure","build","install"]
      when 'example', 'init'
        console.log colors.red "there's already a #{argv.program} project file in this directory"
      when 'path'
        selector = {}
        if argv._[1]
          selector = name: argv._[1]
          db.find selector
          .then (deps) ->
            console.log JSON.stringify _.map(deps, (dep) -> graph.resolvePaths dep),0,2
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
