`require('source-map-support').install()`
coffee = require('coffee-script')
_ = require('underscore')
_p = require("bluebird")
path = require('path')
request = require('request-promise')
fs = require('./fs')
require('./string')
npm = require("npm")
prompt = require('./prompt')
colors = require ('chalk')
pgname = "bbt"

module.exports = (argv, binDir, npmDir) ->
  runDir = process.cwd()
  db = require('./db')(runDir)
  cli = require('./cli')(pgname)
  graph = require('./graph')(db, runDir)

  defaultConfig = 'bbt.cson'
  bbtConfigPath = runDir + '/' + (argv.config || defaultConfig)

  init = ->
    unless fs.existsSync(bbtConfigPath)
      fs.writeFileSync defaultConfig, fs.readFileSync(binDir + '/' + defaultConfig, 'utf8')
    else
      console.log "this folder already has a bbt.coffee file present"

  clone = (dep) ->
    return unless dep.git
    require('./git')(dep, db)
    .validate()

  BuildPhases =
    npmDeps: (dep) ->
      if dep.require
        new _p (resolve, reject) ->
          npm.load (err) ->
            return reject err if err
            npm.commands.install dep.require, '.bbt', (err, data) ->
              return reject err if err
              resolve data
            npm.on 'log', (message) ->
              console.log message

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

  resolveRoot = (config) ->
    config.d =
      root: runDir
    if argv._[1]
      dep = recurDeps argv._[1], config
      if dep then config = dep
      else throw "no dependency matching " + argv._[1]
    graph.resolveDep config

  execute = (config, steps) ->
    resolveRoot config
    .then (root) ->
      graph.all root
    .then (deps) ->
      unless argv.quiet then console.log colors.green _.map(deps, (d) -> d.name).join(' >> ')
      _p.each deps, (dep) -> processDep dep, steps
    .then ->
      console.log colors.green '[ done !!! ]'

  processDep = (dep, steps) ->
    console.log colors.green "#{dep.name} >> #{steps.join(' >> ')}"
    if (!dep.cached || argv._[0] == "clean" || argv.force)
      _p.each steps, (step) ->
        process.chdir runDir
        BuildPhases[step](dep)
    else _p.resolve dep

  run: ->
    fs.getConfigAsync bbtConfigPath
    .then (config) ->
      argv._[0] ?= 'all'
      try
        cli.parse argv
      catch e
        return console.log e
      if config
        switch argv._[0]
          when 'clean'
            depToClean = argv._[1] || config.name || graph.resolveDepName config
            if depToClean == 'all'
              db.find name: depToClean
              .then (deps) ->
                _p.each deps, (dep) -> execute dep, ["clean"]
              .then -> fs.nuke runDir + '/.bbt'
              console.log 'so fresh'
            else
              db.findOne name: depToClean
              .then (dep) ->
                if dep then execute dep, ["clean"]
                else console.log 'didn\'t find dep for', depToClean
          when 'push'
            console.log 'not implemented' #upload()
          when 'fetch'
            execute config, ["npmDeps","fetch"]
          when 'transform'
            execute config, ["npmDeps","fetch","transform"]
          when 'configure'
            execute config, ["npmDeps","fetch","transform","configure"]
          when 'build'
            execute config, ["build"]
          when 'install'
            execute config, ["install"]
          when 'all'
            execute config, ["npmDeps","fetch","transform","configure","build","install"]
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
            if argv._[1] then selector = name: argv._[1]
            db.find selector
            .then (deps) -> console.log JSON.stringify deps,0,2
          else console.log cli.manual()
      else
        switch argv._[0]
          when 'init'
            init()
          when 'example'
            example = argv._[1] || "served"
            examplePath = path.join npmDir, "examples/#{example}"
            console.log "installing #{example} to #{examplePath}"
            fs.src ["**/*"], cwd: examplePath
            .pipe fs.dest path.join runDir, example
          when 'help', 'man', 'manual' then console.log cli.manual()
          else
            console.log cli.hello()
