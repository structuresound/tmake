`require('source-map-support').install()`
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
path = require('path')
fs = require('./fs')
require('./string')
npm = require("npm")
prompt = require('./prompt')
pgname = "dbmake"

deepObjectExtend = (target, source) ->
  for prop of source
    if source.hasOwnProperty(prop)
      if target[prop] and typeof source[prop] == 'object'
        deepObjectExtend target[prop], source[prop]
      else
        target[prop] = source[prop]
  target

module.exports = (argv, binDir, npmDir) ->
  _cwd = process.cwd()
  db = require('./db')(_cwd)
  cli = require('./cli')(pgname)
  graph = require('./graph')(db)

  defaultConfig = 'bbt.cson'
  bbtConfigPath = _cwd + '/' + (argv.config || defaultConfig)

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
        new Promise (resolve, reject) ->
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
      require('./build/configure')(dep, argv, db, npmDir).execute()
    build: (dep) ->
      configure = require('./build/configure')(dep, argv, db, npmDir)
      require('./build/build')(dep, argv, db, configure).execute()
    install: (dep) -> require('./install')(dep, argv, db).execute()
    clean: (dep) -> cleanDep dep

  resolveDepName = (dep) ->
    if dep.name then return dep.name
    else if dep.git
      if typeof dep.git == 'string' then dep.git.slice(dep.git.indexOf('/') + 1)
      else
        lastPathComponent = dep.git?.url?.slice(dep.git?.url.lastIndexOf('/') + 1)
        lastPathComponent.slice 0, lastPathComponent.lastIndexOf '.'

  findDep = (name, root) ->
    if root?.name == name then return root
    found = undefined
    _.each root.deps, (dep) ->
      unless found
        if dep.name == name then found = dep
        else if resolveDepName(dep) == name then found = dep
        else found = findDep name, dep
    found

  getBuildFile = (dep) ->
    if dep.cMakeFile && fs.existsSync(dep.cMakeFile) then dep.cMakeFile
    else if dep.ninjaFile && fs.existsSync(dep.ninjaFile) then dep.ninjaFile

  cleanDep = (dep) ->
    console.log 'clean module', dep.name
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
      $set: built: false
    if !argv.force
      buildFile = getBuildFile dep
      if buildFile
        prompt.ask "remove auto generated Configuration file ?"
        .then (approved) ->
          if approved
            modifier.$unset.cMakeFile = true
            modifier.$unset.ninjaFile = true
            fs.unlinkSync buildFile
    db.update {name: dep.name}, modifier, {}

  execute = (config, steps) ->
    config.d =
      root: _cwd
      clone: _cwd
    if argv._[1]
      dep = findDep argv._[1], config
      if dep then config = dep
      else throw "no dependency matching " + argv._[1]
    processDep config, steps, []
    .then (msg) ->
      console.log msg
      console.log '[ done !!! ]'

  resolvePaths = (dep) ->
    defaultPathOptions =
      source: ""
      headers: ""
      tests: "test"
      clone: "source"
      temp: "transform"
      build: "build"
      include: ""
      project: ""
      install:
        headers:
          from: ""
          to: "include"
        libraries:
          from: "build"
          to: "libraries"

    pathOptions = deepObjectExtend defaultPathOptions, dep.path

    d = _.extend {}, dep.d

    # fetch
    d.home ?= "#{_cwd}/.bbt" # reference for build tools, should probably remove
    d.root ?= "#{d.home}/#{dep.name}" # lowest level a package should have access to
    d.temp ?= path.join d.root, pathOptions.temp
    d.clone ?= path.join d.root, pathOptions.clone
    # build
    if dep.transform
      d.source = path.join d.temp, pathOptions.source
    else
      d.source = path.join d.clone, pathOptions.source
    d.project = path.join d.root, pathOptions.project
    d.include ?= path.join d.source, pathOptions.include
    d.build ?= path.join d.root, pathOptions.build
    # install
    d.install =
      headers:
        from: path.join d.source, pathOptions.install.headers.from
        to: path.join d.root, pathOptions.install.headers.to
      libraries:
        from: path.join d.root, pathOptions.install.libraries.from
        to: path.join d.root, pathOptions.install.libraries.to
    console.log d
    d

  processDep = (dep, steps, stack) ->
    dep.name = resolveDepName dep
    dep.d = resolvePaths dep
    stack.push dep
    (->
      if dep.deps then Promise.each dep.deps, (dd) ->
        processDep dd, steps, stack
      else Promise.resolve null
    )()
    .then ->
      db.update {name: dep.name}, {$set: dep}, {upsert: true}
    .then ->
      if (argv._[0] == "clean" || argv.force)
        Promise.each steps, (step) ->
          if argv.verbose then console.log _.map(stack, (d) -> d.name), step
          process.chdir _cwd
          BuildPhases[step](dep)
        .then ->
          stack.pop()
          Promise.resolve "[ bbt built . . . #{dep.name}]"
      else
        stack.pop()
        Promise.resolve "[ CACHED: #{dep.name}]"

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
            depToClean = argv._[1] || config.name
            if depToClean == 'all'
              db.find name: depToClean
              .then (deps) ->
                Promise.each deps, (dep) -> execute dep, ["clean"]
              .then ->
                fs.nuke _cwd + '/.bbt'
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
          when 'ls'
            selector = {}
            if argv._[1] then selector = name: argv._[1]
            db.find selector
            .then (deps) -> console.log deps
          else console.log cli.manual()
      else
        switch argv._[0]
          when 'init'
            init()
          when 'example'
            example = argv._[1] || "served"
            examplePath = path.join npmDir, "examples/#{example}"
            console.log 'installed', example, "type '#{pgname}' to build"
            fs.src ["**/*"], cwd: examplePath
            .pipe fs.dest _cwd
          when 'help', 'man', 'manual' then console.log cli.manual()
          else
            console.log cli.hello()
