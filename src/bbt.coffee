exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
path = require('path')
fs = require('./fs')
require('./string')
npm = require("npm")
util = require('util')
colors = require ('chalk')

defaultConfig = 'bbt.cson'
_cwd = process.cwd()
db = require('./db')(_cwd)

pgname = "chroma"
forceYes = false

_check = (val, type) ->
  switch type
    when "String" then typeof val == 'string'
    when "Number" then !isNaN(parseFloat(val)) && isFinite(val)
    when "Array" then Array.isArray val
    when "Object" then val != null and typeof val == 'object'
    when "Boolean" then typeof val == 'boolean'
    when "Undefined" then true

check = (val, type) ->
  if _check type, "String"
    _check val, type
  else if _check type, "Array"
    _.reduce type, (memo, sType) ->
      memo + _check(val, sType)
    , 0
  else
    throw "checking unsupported type"

cmdOptionTypes = (cmd) ->
  switch cmd
    when 'example'
      name: "examples"
      type: ["Number", "Undefined"]
    when 'ls', 'list'
      name: "collection"
      type: ["String", "Undefined"]
    when 'ssh'
      name: "node"
      type: ["String", "Undefined"]
    when 'provision'
      name: "script"
      type: "String"
    when 'test'
      name: "cluster"
      type: ["String", "Undefined"]
    else
      name: ""
      type: "Undefined"

prompt =
  done: -> process.stdin.pause()
  prompt: -> process.stdout.write prompt.message
  ask: (q, a) ->
    new Promise (resolve) ->
      prompt.message = colors.yellow(q) + ': '
      prompt.onReceived = (data) ->
        prompt.done()
        if a
          if data == (a + '\n') then return resolve true
        else if data == 'y\n' or data == 'yes\n' or forceYes then return resolve true
        resolve false
      prompt.start()
  start: ->
    process.stdin.resume()
    process.stdin.setEncoding 'utf8'
    process.stdin.on 'data', (text) -> prompt.onReceived text
    prompt.prompt()
  onReceived: (text) -> console.log 'received data:', text, util.inspect(text)

module.exports = (argv, binDir, npmDir) ->
  bbtConfigPath = _cwd + '/' + (argv.config || defaultConfig)
  hello = -> console.log "if this is a new project run 'bbt example' or type 'bbt help' for more options"
  manual = ->
    console.log """

                usage: bbt command [option]

                [commands]

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

  getBuildFile = (dep) ->
    if dep.cMakeFile && fs.existsSync(dep.cMakeFile) then dep.cMakeFile
    else if dep.ninjaFile && fs.existsSync(dep.ninjaFile) then dep.ninjaFile

  cleanDep = (dep) ->
    console.log 'clean module', dep.name
    fs.nuke dep.buildDir
    _.each dep.libs, (libFile) ->
      if fs.existsSync(libFile) then fs.unlinkSync libFile
    _.each dep.headers, (headerFile) ->
      if fs.existsSync(headerFile) then fs.unlinkSync headerFile
    fs.prune dep.rootDir
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
          db.deps.updateAsync {name: dep.name}, modifier
      else
    else
      db.deps.updateAsync {name: dep.name}, modifier

  execute = (config, steps) ->
    config.homeDir = _cwd
    if argv._[1]
      dep = findDep argv._[1], config
      if dep then config = dep
      else throw "no dependency matching " + argv._[1]
    processDep config, steps, []
    .then (msg) ->
      console.log msg
      console.log '[ done !!! ]'

  upload = ->

  processDep = (dep, steps, stack) ->
    defaultPathOptions = _.extendOwn
      source: ""
      headers: ""
      tests: "test"
      clone: "src"
      build: "build"
      libs: "lib"
      install: ""
      temp: "transform"
      include: "include"
    , dep.path || {}
    pathOptions = _.extendOwn defaultPathOptions, argv
    dep.name = resolveDepName dep
    dep.homeDir = "#{_cwd}/.bbt"
    dep.rootDir = "#{dep.homeDir}/#{dep.name}"
    dep.cloneDir = path.join dep.rootDir, pathOptions.clone
    if dep.transform
      dep.tempDir = path.join dep.rootDir, pathOptions.temp
      dep.srcDir = path.join dep.tempDir, pathOptions.source
    else
      dep.srcDir = path.join dep.cloneDir, pathOptions.source
    dep.buildDir ?= path.join dep.rootDir, pathOptions.build
    dep.libDir ?= path.join dep.rootDir, pathOptions.libs
    dep.includeDir ?= path.join dep.rootDir, pathOptions.include
    dep.installDir ?= path.join dep.homeDir, pathOptions.install

    console.log dep
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
      if argv._[0] == "rebuild" || argv.force || !depState?.built
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
      if config
        switch argv._[0] || 'all'
          when 'clean'
            depToClean = argv._[1] || config.name
            if depToClean == 'all'
              db.deps.find name: depToClean
              .then (deps) ->
                Promise.each deps, cleanDep
              .then ->
                fs.nuke _cwd + '/.bbt'
              console.log 'so fresh'
            else
              db.deps.findOneAsync name: depToClean
              .then (dep) ->
                cleanDep dep
          when 'push'
            upload()
          when 'fetch'
            execute config, ["npmDeps","fetch"]
          when 'update'
            execute config, ["npmDeps","fetch","transform"]
          when 'build', 'rebuild'
            execute config, ["npmDeps","fetch","transform","build"]
          when 'all'
            execute config, ["npmDeps","fetch","transform","build","install"]
          when 'install'
            execute config, ["install"]
          when 'db'
            selector = {}
            if argv._[1] then selector = name: argv._[1]
            db.deps.findAsync selector
            .then (deps) -> console.log deps
          else hello()
      else
        switch argv._[0]
          when 'init'
            init()
          when 'example'
            example = argv._[1] || "served"
            fs.src ["**/*"], cwd: path.join npmDir, "examples/#{example}"
            .pipe fs.dest _cwd
          when 'help', 'man', 'manual' then manual()
          else
            hello()
