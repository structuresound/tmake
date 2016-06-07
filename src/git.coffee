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
  config.checkout = config.tag || config.branch || dep.tag || "master"

  clone = ->
    return checkout() if (dep.cache.git && !argv.force)
    fs.nuke dep.d.clone
    console.log colors.green "cloning #{config.url} into #{dep.d.clone}"
    new Promise (resolve, reject) ->
      git.clone config.url, dep.d.clone, (err) ->
        return reject err if err
        dep.cache.git = checkout: "master"
        db.update
            name: dep.name
          ,
            $set:
              "cache.git.checkout": "master"
              "tag": config.checkout
          ,
            upsert: true
        .then ->
          checkout()
        .then ->
          resolve()
        .catch (e) ->
          reject e

  checkout = ->
    if ((dep.cache.git.checkout == config.checkout) && !argv.force)
      unless argv.quiet then console.log 'using ', dep.name, '@', config.checkout
      return Promise.resolve()
    sh.Promise "git checkout #{config.checkout}", dep.d.clone, argv.verbose
    .then ->
      db.update
          name: dep.name
        ,
          $set: "cache.git.checkout": config.checkout
        ,
          {}

  validate: ->
    if fs.existsSync(dep.d.clone) && !argv.force
      checkout()
    else
      clone()

  findGit: findGit
  checkout: checkout
