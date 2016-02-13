exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
fs = require('./fs')
require('./string')
npm = require("npm")
npmconf = require('npmconf')

defaultConfig = 'bbt.coffee'

_cwd = process.cwd()

# pass in the cli options that you read from the cli
# or whatever top-level configs you want npm to use for now.
# npmconf.load {}, (er, conf) ->
#   conf.set 'CMAKE_SEARCH_PATH', "#{_cwd}/.bbt/lib", 'project'
#   conf.set 'CMAKE_LIBRARY_PATH', "#{_cwd}/.bbt/lib", 'project'
#   conf.save 'project', (er) ->
#     if er then console.log er
#     else console.log 'saved'

module.exports = (argv, bbtDir) ->
  bbtConfigPath = _cwd + '/' + (argv.config || defaultConfig)

  config = (->
    if fs.existsSync(bbtConfigPath)
      data = fs.readFileSync(bbtConfigPath, 'utf8')
      ### jshint -W061 ###
      coffee.eval(data)
      ### jshint +W061 ###
    else unless argv._[0] == 'init' then console.log "if this is a new project run 'bbt init' or 'bbt help'"
    )()

  init = ->
    unless fs.existsSync(bbtConfigPath)
      fs.writeFileSync defaultConfig, fs.readFileSync(bbtDir + '/' + defaultConfig, 'utf8')

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
    require('./git')(dep)
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
        else console.log "skipping", dep.name, "bad format", JSON.stringify(dep)

    transform: (dep) ->
      return unless dep.transform
      require('./transform')(dep)
      .execute()

    build: (dep) ->
      dep.bbtDir = bbtDir
      require('./build')(dep, argv)
      .execute()

    install: (dep) ->
      require('./install')(dep, argv)
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
    bpk.rootDir = "#{_cwd}/.bbt"
    bpk.cacheDir = argv.cachedDir || "#{bpk.rootDir}/src"
    bpk.cloneDir = argv.cloneDir || "#{bpk.rootDir}/src/#{bpk.name}"
    bpk.srcDir = argv.srcDir || getRelativeDir bpk, bpk.transform
    bpk.tempDir = argv.tempDir || "#{bpk.rootDir}/transform/#{bpk.name}"
    bpk.buildDir = argv.buildDir || getBuildDir bpk, bpk.build
    bpk.objDir = argv.objDir || "#{bpk.buildDir}/build"
    bpk.libDir = argv.buildDir || "#{bpk.rootDir}/lib"
    bpk.includeDir = argv.includeDir || "#{bpk.rootDir}/include"
    bpk.installDir = argv.installDir || (_cwd + '/')
    stack.push bpk
    (->
      if bpk.deps then Promise.each bpk.deps, (dep) ->
        processModule dep, steps, stack
        .then (msg) -> console.log msg
      else Promise.resolve null
    )()
    .then ->
      unless bpk.built
        Promise.each steps, (step) ->
          console.log _.map(stack, (module) -> module.name), step
          process.chdir _cwd
          BuildPhases[step](bpk)
        .then ->
          bpk.built = true
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
        fs.deleteFolderRecursive _cwd + '/.bbt'
        fs.deleteFolderRecursive _cwd + '/bbt'
        fs.deleteFolderRecursive _cwd + '/build'
        console.log 'so fresh'
      when 'fetch'
        execute ["npmDeps","fetch"]
      when 'update'
        execute ["npmDeps","fetch","transform"]
      when 'build'
        execute ["npmDeps","fetch","transform","build"]
      when 'all'
        init()
        execute ["npmDeps","fetch","transform","build","install"]
      when 'help'
        console.log """
                    init
                    clean
                    fetch
                    update
                    build
                    all
                    """
