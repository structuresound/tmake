exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
fs = require('./fs')
require('./string')
npm = require("npm")
npmconf = require('npmconf')
yesno = require('yesno')
ask = (q) -> new Promise (resolve) -> yesno.ask(q, false, (ok) -> resolve(ok))

defaultConfig = 'bbt.coffee'
_cwd = process.cwd()
db = require('./db')(_cwd)

# pass in the cli options that you read from the cli
# or whatever top-level configs you want npm to use for now.
# npmconf.load {}, (er, conf) ->
#   conf.set 'CMAKE_SEARCH_PATH', "#{_cwd}/.bbt/lib", 'project'
#   conf.set 'CMAKE_LIBRARY_PATH', "#{_cwd}/.bbt/lib", 'project'
#   conf.save 'project', (er) ->
#     if er then console.log er
#     else console.log 'saved'

module.exports = (argv, binDir, npmDir) ->
  bbtConfigPath = _cwd + '/' + (argv.config || defaultConfig)

  config = (->
    if fs.existsSync(bbtConfigPath)
      data = fs.readFileSync(bbtConfigPath, 'utf8')
      ### jshint -W061 ###
      coffee.eval(data)
      ### jshint +W061 ###
    else unless argv._[0] == 'init' then console.log "if this is a new project run 'bbt init' or 'bbt help'"
    )()

  config.srcDir ?= _cwd
  config.buildDir ?= _cwd

  init = ->
    unless fs.existsSync(bbtConfigPath)
      fs.writeFileSync defaultConfig, fs.readFileSync(binDir + '/' + defaultConfig, 'utf8')

  getRelativeDir = (dep, task) ->
    base = "#{dep.rootDir}/src/#{dep.name}"
    if task?.relativePath then "#{base}/#{task?.relativePath}" else base

  getBuildDir = (dep, task) ->
    base = if dep.transform then dep.tempDir else dep.srcDir
    if task?.relativePath
      "#{base}/#{dep.build.relativePath}"
    else
      base

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
      return unless dep.transform
      require('./transform')(dep)
      .execute()

    build: (dep) ->
      dep.npmDir = npmDir
      require('./build')(dep, argv, db)
      .execute()

    install: (dep) ->
      require('./install')(dep, argv, db)
      .execute()

  execute = (steps) ->
    return unless config
    processModule config, steps, []
    .then (msg) ->
      console.log msg
      console.log '[ done !!! ]'

  processModule = (bpk, steps, stack) ->
    unless bpk.name
      if typeof bpk.git == 'string' then bpk.name = bpk.git.slice(bpk.git.indexOf('/') + 1)
      else
        lastPathComponent = bpk.git?.url?.slice(bpk.git?.url.lastIndexOf('/') + 1)
        bpk.name = lastPathComponent.slice 0, lastPathComponent.lastIndexOf '.'
    bpk.rootDir ?= "#{_cwd}/.bbt"
    bpk.cacheDir ?= argv.cachedDir || "#{bpk.rootDir}/src"
    bpk.cloneDir ?= argv.cloneDir || "#{bpk.rootDir}/src/#{bpk.name}"
    bpk.srcDir ?= argv.srcDir || getRelativeDir bpk, bpk.transform
    bpk.tempDir ?= argv.tempDir || "#{bpk.rootDir}/transform/#{bpk.name}"
    bpk.buildDir ?= argv.buildDir || getBuildDir bpk, bpk.build
    bpk.objDir ?= argv.objDir || "#{bpk.buildDir}/build"
    bpk.libDir ?= argv.buildDir || "#{bpk.rootDir}/lib"
    bpk.includeDir ?= argv.includeDir || "#{bpk.rootDir}/include"
    bpk.installDir ?= argv.installDir || (_cwd + '/')
    stack.push bpk
    (->
      if bpk.deps then Promise.each bpk.deps, (dep) ->
        processModule dep, steps, stack
        .then (msg) -> console.log msg
      else Promise.resolve null
    )()
    .then ->
      db.deps.updateAsync
        name: bpk.name
      ,
        $set: bpk
      ,
        upsert: true
    .then ->
      db.deps.findOneAsync
        name: bpk.name
    .then (module) ->
      unless module?.built
        Promise.each steps, (step) ->
          console.log _.map(stack, (module) -> module.name), step
          process.chdir _cwd
          BuildPhases[step](bpk)
        .then ->
          db.deps.update {name: bpk.name}, $set: built: true
          stack.pop()
          Promise.resolve "[ bbt built . . . #{bpk.name}]"
      else
        stack.pop()
        Promise.resolve "[ CACHED: #{bpk.name}]"

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
      when 'build'
        execute ["npmDeps","fetch","transform","build"]
      when 'all'
        init()
        execute ["npmDeps","fetch","transform","build","install"]
      when 'db'
        selector = {}
        if argv._[1] then selector = name: argv._[1]
        db.deps.findAsync selector
        .then (deps) -> console.log deps
      else
        console.log """
                    init
                    clean
                    fetch
                    update
                    build
                    all
                    """
