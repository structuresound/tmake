#git = require('nodegit')
Promise = require("bluebird")
git = require 'gift'
fs = require('./fs')
sh = require('./sh')
colors = require ('chalk')

findGit = ->
  if not sh.which 'git'
    sh.echo 'Sorry, this script requires git'
    sh.exit 1

module.exports = (dep, db, argv) ->
  if typeof dep.git == 'string'
    config = repository: dep.git
  else
    config = dep.git || {}

  config.url = "https://github.com/#{config.repository}.git"
  config.checkout = config.tag || config.branch || "master"

  remove = ->
    new Promise (resolve) ->
      if fs.existsSync dep.d.clone
        fs.nuke dep.d.clone
      resolve()

  clone = ->
    return checkout() if (dep.cache?.git && !argv.force)
    console.log colors.green "cloning #{config.url} into #{dep.d.clone}"
    new Promise (resolve, reject) ->
      git.clone config.url, dep.d.clone, ->
        dep.cache ?= git: checkout: "master"
        dep.cache.git.checkout = "master"
        db.update
            name: dep.name
          ,
            $set:
              "cache.git.checkout": "master"
              "tag": "master"
          ,
            upsert: true
        .then ->
          checkout()
          .then resolve
        .catch reject

  checkout = ->
    return Promise.resolve() if (dep.cache?.git.checkout == config.checkout && !argv.force)
    sh.Promise "git checkout #{config.checkout}", dep.d.clone, argv.verbose
    .then ->
      db.update
          name: dep.name
        ,
          $set: "cache.git.checkout": config.checkout
        ,
          {}

  validate: ->
    if fs.existsSync(dep.d.clone)
      if dep.cache?.git.checkout == config.checkout
        console.log 'using ', dep.name, '@', config.checkout
        return Promise.resolve()
      else
        return checkout()
    else
      return clone()

  findGit: findGit
  checkout: checkout
