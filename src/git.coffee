#git = require('nodegit')
Promise = require("bluebird")
git = require 'gift'
fs = require('./fs')

module.exports = (dep) ->
  if typeof dep.git == 'string'
    config = url: "https://github.com/#{dep.git}.git"
  else
    config = dep.git || {}
  config.name ?= dep.name
  config.srcDir ?= dep.cloneDir
  config.version ?= dep.version

  metaPath = ->
    dep.cacheDir + '/' + 'versions'

  versions =
    read: ->
      if fs.existsSync metaPath()
        registryData = fs.readFileSync metaPath()
        JSON.parse(registryData) or {}
      else
        {}
    write: (json) ->
      fs.writeFileSync metaPath(), JSON.stringify(json)

  clone = ->
    console.log 'cloning', config.url, 'into', dep.cloneDir
    new Promise (resolve) ->
      git.clone config.url, dep.cloneDir, ->
        json = versions.read()
        json[config.name] = config.version
        versions.write(json)
        resolve()

  validate: ->
    if fs.existsSync(dep.cloneDir)
      if versions.read()[config.name] == config.version
        console.log 'using ', config.name, '@', config.version || '*'
        return Promise.resolve()
      else
        @remove()
        .then ->
          clone()
    else
      clone()

  remove: ->
    new Promise (resolve) ->
      if fs.existsSync dep.cloneDir
        fs.deleteFolderRecursive dep.cloneDir
      resolve()
