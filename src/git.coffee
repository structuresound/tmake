#git = require('nodegit')
Promise = require("bluebird")
git = require 'gift'
fs = require('./fs')
sh = require('./sh')
colors = require ('chalk')
unzip = require('unzip')
tar = require('tar-fs')
gunzip = require('gunzip-maybe')
request = require('request-promise')

findGit = ->
  if not sh.which 'git'
    sh.echo 'Sorry, this script requires git'
    sh.exit 1

module.exports = (dep, db, argv, parse) ->
  config = dep.git || {}
  if typeof dep.git == 'string'
    config = repository: dep.git

  if dep.source
    config.url = dep.source
  else
    base = "https://github.com/#{config.repository}"
    if config.archive
      config.url = "#{base}/archive/#{config.archive}.tar.gz"
      config.checkout = config.archive
    else
      config.url = "#{base}.git"
      config.checkout = config.tag || config.branch || dep.tag || "master"

  getSource = ->
    unless argv.quiet then console.log colors.green 'fetch source from', config.url
    unless argv.quiet then console.log colors.yellow 'to', dep.d.clone
    fs.existsAsync dep.d.clone
    .then (exists) ->
      if exists && dep.cache.source == config.url && !parse.force()
        if argv.verbose then console.log colors.yellow 'using cache'
        Promise.resolve()
      else
        new Promise (resolve, reject) ->
          finish = ->
            db.update
                name: dep.name
              ,
                $set:
                  "cache.source": config.url
              ,
                upsert: true
            .then (res) ->
              if argv.verbose then console.log colors.magenta "inserted new record #{dep.name}"
              resolve res
          request config.url
          .pipe gunzip()
          .pipe tar.extract(dep.d.root)
          .on 'finish', finish
          .on 'close', finish
          .on 'end', finish
          .on 'error', reject

  clone = ->
    return checkout() if (dep.cache.git && fs.existsSync(dep.d.clone) && !parse.force())
    fs.nuke dep.d.clone
    unless argv.quiet then console.log colors.green "cloning #{config.url} into #{dep.d.clone}"
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
    if ((dep.cache.git.checkout == config.checkout) && !parse.force())
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
    if fs.existsSync(dep.d.clone) && !parse.force()
      if config.archive
        Promise.resolve()
      else
        checkout()
    else
      if config.archive
        getSource()
      else
        clone()

  findGit: findGit
  checkout: checkout
  getSource: getSource
