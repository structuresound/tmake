#git = require('nodegit')
Promise = require("bluebird")
git = require 'gift'
fs = require('./fs')

module.exports = (dep, db) ->
  if typeof dep.git == 'string'
    config = url: "https://github.com/#{dep.git}.git"
  else
    config = dep.git || {}
  config.name ?= dep.name
  config.srcDir ?= dep.cloneDir
  config.version ?= dep.version

  metaPath = ->
    dep.cacheDir + '/' + 'versions'

  remove = ->
    new Promise (resolve) ->
      if fs.existsSync dep.cloneDir
        fs.nuke dep.cloneDir
      resolve()

  clone = ->
    console.log 'cloning', config.url, 'into', dep.cloneDir
    new Promise (resolve, reject) ->
      git.clone config.url, dep.cloneDir, ->
        db.deps.updateAsync
          name: dep.name
        ,
          $set:
            version: (config.version || "master")
            name: dep.name
        ,
          upsert: true
        .then resolve
        .catch reject

  validate: ->
    db.deps.findOneAsync {name:config.name}
    .then (module) ->
      if fs.existsSync(dep.cloneDir)
        if module?.version == (config.version || "master")
          console.log 'using ', config.name, '@', config.version || '*'
          return Promise.resolve()
        else
          remove()
          .then ->
            clone()
      else
        clone()
