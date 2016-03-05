#git = require('nodegit')
Promise = require("bluebird")
git = require 'gift'
fs = require('./fs')
sh = require 'shelljs'

module.exports = (dep, db) ->
  if typeof dep.git == 'string'
    config = url: "https://github.com/#{dep.git}.git"
  else
    config = dep.git || {}

  metaPath = ->
    dep.cacheDir + '/' + 'versions'

  remove = ->
    new Promise (resolve) ->
      if fs.existsSync dep.d.clone
        fs.nuke dep.d.clone
      resolve()

  clone = ->
    console.log 'cloning', config.url, 'into', dep.d.clone
    new Promise (resolve, reject) ->
      git.clone config.url, dep.d.clone, ->
        db.deps.updateAsync
            name: dep.name
          ,
            $set:
              version: (dep.version || "master")
              name: dep.name
          ,
            upsert: true
        .then resolve
        .catch reject

  validate: ->
    db.deps.findOneAsync {name:dep.name}
    .then (module) ->
      if fs.existsSync(dep.d.clone)
        if module?.version == (dep.version || "master")
          console.log 'using ', dep.name, '@', dep.version || '*'
          return Promise.resolve()
        else
          remove()
          .then ->
            clone()
      else
        clone()

  findGit: findGit
findGit = ->
  if not sh.which 'git'
    sh.echo 'Sorry, this script requires git'
    sh.exit 1
