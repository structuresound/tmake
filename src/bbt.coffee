exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
fs = require('./fs')
require('./string')
npm = require("npm")

defaultConfig = 'bbt.coffee'

_cwd = process.cwd()

module.exports = (argv, libdir) ->
  bbtConfigPath = _cwd + '/' + (argv.config || defaultConfig)

  srcDir = argv.srcDir || (_cwd + '/.bbt/src')
  tempDir = argv.tempDir || (_cwd + '/.bbt/transform')
  includeDir = argv.includeDir || (_cwd + '/.bbt/include')
  libDir = argv.buildDir || (_cwd + '/.bbt/lib')
  installDir = argv.installDir || (_cwd + '/')

  config = (->
    if fs.existsSync(bbtConfigPath)
      data = fs.readFileSync(bbtConfigPath, 'utf8')
      # match = data.match /\require '(.)/
      # console.log 'match', match
      return coffee.eval(data)
    else
      unless argv._[0] == 'init'
        console.log "if this is a new project run 'bbt init' or 'bbt help'"
    )()

  clone = (dep) ->
    return unless dep.git
    t = dep.git
    t.name ?= dep.name
    t.srcDir ?= srcDir
    t.version ?= dep.version

    git = require('./git')(t)
    git.validate()

  transform = (dep) ->
    return unless dep.transform
    t = {}
    _.extend(t, dep.transform)
    t.name ?= dep.name
    t.srcDir ?= srcDir + '/' + dep.name
    t.dstDir ?= tempDir + '/' + dep.name
    require('./transform')(t)
    .execute()

  build = (dep) ->
    t = {}
    _.extend(t, dep.build)
    t.name ?= dep.name
    if dep.transform
      t.srcDir ?= tempDir + '/' + dep.name
    else
      t.srcDir ?= srcDir + '/' + dep.name
    require('./build')(t, argv)
    .execute()

  install = (dep) ->
    t = {}
    _.extend(t, dep.install)
    t.name ?= dep.name
    if dep.transform
      t.srcDir ?= tempDir + '/' + dep.name
    else
      t.srcDir ?= srcDir + '/' + dep.name
    t.buildDir ?= t.srcDir + '/' + 'build'
    t.dstDir ?= libDir
    console.log 'install from', t.srcDir, 'to', t.dstDir
    require('./install')(t, argv)
    .execute()

  init = ->
    unless fs.existsSync(bbtConfigPath)
      fs.writeFileSync defaultConfig, fs.readFileSync(libdir + '/' + defaultConfig, 'utf8')

  deps = (dep) ->
    if dep.require
      new Promise (resolve, reject) ->
        npm.load (err) ->
          return reject err if err
          npm.commands.install dep.require, '.bbt', (err, data) ->
            return reject err if err
            resolve data
          npm.on 'log', (message) ->
            console.log message


  fetch = (dep) ->
    if dep.provider
      switch dep.provider
        when 'local' then console.log "copying", dep.name, 'from', dep.path
        when 'git' then clone(dep)
        else
          console.log "fetching", dep.provider, ':', dep.name, dep.version
    else
      if dep.git then clone(dep)
      else console.log "skipping", dep.name, "bad format", JSON.stringify(dep)

  execute = (steps) ->
    return unless config
    Promise.each config.deps, (dep) ->
      Promise.each steps, (step) ->
        process.chdir _cwd
        step(dep)

  run: ->
    switch argv._[0] || 'all'
      when 'init'
        init(libdir)
      when 'clean'
        fs.deleteFolderRecursive _cwd + '/.bbt'
        fs.deleteFolderRecursive _cwd + '/bbt'
        fs.deleteFolderRecursive _cwd + '/build'
        console.log 'so fresh'
      when 'fetch'
        execute [deps,fetch]
      when 'update'
        execute [deps,fetch,transform]
      when 'build'
        execute [deps,fetch,transform,build]
      when 'all'
        init libdir
        execute [deps,fetch,transform,build,install]
