exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
fs = Promise.promisifyAll(require('fs'))
require('./string')

module.exports =
  run: (args) ->
    configPath = process.cwd() + '/bbt.coffee'
    if fs.existsSync(configPath)
      fs.readFileAsync(configPath, 'utf8').then (data) ->
        config = coffee.eval(data)
        Promise.each config.deps, (dep) ->
          if dep.path
            console.log "copying", dep.name, 'from', dep.path
          else if dep.git
            clone(dep)
          else if dep.bbt
            console.log "fetching", dep.bbt.user, ':', dep.name, dep.bbt.version
          else
            console.log "skipping", dep.name, "bad format", JSON.stringify(dep)
    else
      throw new Error "can't find " + configPath

gitDir = ->
  process.cwd() + '/.bbt/git'

clone = (dep) ->
  gitConfig = dep.git
  gitConfig.name ?= dep.name
  gitConfig.srcDir ?= gitDir()
  gitConfig.version ?= dep.version

  git = require('./git')(gitConfig)
  git.validate().then -> move(dep)

move = (dep) ->
  new Promise (resolve,reject) ->
    if dep.move
      console.log 'moving files into place . . .'
      moveConfig = dep.move
      moveConfig.srcDir = gitDir() + '/' + dep.name
      move = require('./move')(moveConfig)
      move.moveFiles()
    resolve()
