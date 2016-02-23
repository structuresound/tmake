exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
path = require('path')
fs = require('./fs')
require('./string')
npm = require("npm")
yesno = require('yesno')
ask = (q) -> new Promise (resolve) -> yesno.ask(q, false, (ok) -> resolve(ok))

defaultConfig = 'bbt.coffee'
_cwd = process.cwd()
db = require('./db')(_cwd)

module.exports = (argv, binDir, npmDir) ->
  bbtConfigPath = _cwd + '/' + (argv.config || defaultConfig)

  config = (->
    if fs.existsSync(bbtConfigPath)
      data = fs.readFileSync(bbtConfigPath, 'utf8')
      ### jshint -W061 ###
      coffee.eval(data)
      ### jshint +W061 ###
    else unless argv._[0] == 'init' then
    )()

  hello = -> console.log "if this is a new project run 'bbt init' or type 'bbt help' for more options"
  manual = ->
    console.log """

                usage: bbt command [option]

                [commands]

                init             create an empty bbt.coffee file
                example [name]   copy an example to the current directory

                all (default)    fetch, update, build, install
                fetch            git / get dependencies
                update           transform dependencies
                build            build with various build systems
                install          place libraries into main libs folder
                clean            clean project, 'clean all' to kill deps

                db [name]        list the internal state of bbt

                """

  init = ->
    unless fs.existsSync(bbtConfigPath)
      fs.writeFileSync defaultConfig, fs.readFileSync(binDir + '/' + defaultConfig, 'utf8')
    else
      console.log "this folder already has a bbt.coffee file present"

  getRelactiveDir = (dep, name) ->
    if dep.relativePath then "#{dep.rootDir}/#{name}/#{dep.relativePath}"
    else "#{dep.rootDir}/#{name}"

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
    build: (dep) -> require('./build')(dep, argv, db, npmDir).execute()
    install: (dep) -> require('./install')(dep, argv, db).execute()

  resolveDepName = (dep) ->
    if dep.name then return dep.name
    else if dep.git
      if typeof dep.git == 'string' then dep.git.slice(dep.git.indexOf('/') + 1)
      else
        lastPathComponent = dep.git?.url?.slice(dep.git?.url.lastIndexOf('/') + 1)
        lastPathComponent.slice 0, lastPathComponent.lastIndexOf '.'

  findDep = (name, root) ->
    found = undefined
    _.each root.deps, (dep) ->
      unless found
        if dep.name == name then found = dep
        else if resolveDepName(dep) == name then found = dep
        else found = findDep name, dep
    found

  execute = (steps) ->
    return hello() unless config
    config.homeDir = _cwd
    if argv._[1]
      dep = findDep argv._[1], config
      if dep then config = dep
      else throw "no dependency matching " + argv._[1]
    processDep config, steps, []
    .then (msg) ->
      console.log msg
      console.log '[ done !!! ]'

  processDep = (dep, steps, stack) ->
    dep.name ?= resolveDepName dep
    dep.homeDir ?= "#{_cwd}/.bbt"
    dep.rootDir ?= "#{dep.homeDir}/#{dep.name}"
    dep.cloneDir ?= argv.cloneDir || "#{dep.rootDir}/src"
    if dep.transform then dep.tempDir ?= argv.tempDir || "#{dep.rootDir}/transform"
    dep.srcDir ?= argv.srcDir || dep.tempDir || "#{dep.rootDir}/src"
    dep.buildDir ?= argv.buildDir || "#{dep.rootDir}"
    dep.objDir ?= argv.objDir || "#{dep.buildDir}/build"
    dep.libDir ?= argv.buildDir || "#{dep.homeDir}/lib"
    dep.includeDir ?= argv.includeDir || "#{dep.homeDir}/include"
    dep.binDir ?= argv.installDir || dep.homeDir
    stack.push dep
    (->
      if dep.deps then Promise.each dep.deps, (dep) ->
        processDep dep, steps, stack
        .then (msg) -> console.log msg
      else Promise.resolve null
    )()
    .then ->
      db.deps.updateAsync {name: dep.name}, {$set: dep}, {upsert: true}
    .then ->
      db.deps.findOneAsync
        name: dep.name
    .then (depState) ->
      if argv._[0] == "rebuild" || !depState?.built
        Promise.each steps, (step) ->
          if argv.verbose then console.log _.map(stack, (d) -> d.name), step
          process.chdir _cwd
          BuildPhases[step](dep)
        .then (dep)->
          stack.pop()
          Promise.resolve "[ bbt built . . . #{dep.name}]"
      else
        stack.pop()
        Promise.resolve "[ CACHED: #{dep.name}]"

  run: ->
    switch argv._[0] || 'all'
      when 'init'
        init()
      when 'clean'
        depToClean = argv._[1] || config.name
        if depToClean == 'all'
          fs.nuke _cwd + '/.bbt'
          fs.nuke _cwd + '/bbt'
          fs.nuke _cwd + '/build'
          console.log 'so fresh'
        else
          db.deps.findOneAsync name: depToClean
          .then (dep) ->
            if dep
              console.log 'clean module', dep.name
              fs.nuke dep.cloneDir
              fs.nuke dep.tempDir
              _.each dep.libs, (libFile) ->
                if fs.existsSync(libFile) then fs.unlinkSync libFile
              _.each dep.headers, (headerFile) ->
                if fs.existsSync(headerFile) then fs.unlinkSync headerFile
              fs.prune dep.includeDir
              modifier =
                $unset:
                  libs: true
                  headers: true
                $set: built: false
              if dep.cMakeFile && fs.existsSync(dep.cMakeFile)
                ask "remove auto generated CMakeLists file?"
                .then (approved) ->
                  if approved
                    modifier.$unset.cMakeFile = true
                    fs.unlinkSync dep.cMakeFile
                  db.deps.updateAsync {name: dep.name}, modifier
                  .then -> process.exit()
              else
                db.deps.updateAsync {name: dep.name}, modifier
      when 'fetch'
        execute ["npmDeps","fetch"]
      when 'update'
        execute ["npmDeps","fetch","transform"]
      when 'example'
        example = argv._[1] || "served"
        fs.src ["**/*"], cwd: path.join npmDir, "examples/#{example}"
        .pipe fs.dest _cwd
      when 'build', 'rebuild'
        execute ["npmDeps","fetch","transform","build"]
      when 'all'
        execute ["npmDeps","fetch","transform","build","install"]
      when 'install'
        execute ["install"]
      when 'db'
        selector = {}
        if argv._[1] then selector = name: argv._[1]
        db.deps.findAsync selector
        .then (deps) -> console.log deps
      when 'help', 'man', 'manual' then manual()
      else hello()
