Promise = require 'bluebird'
# fs = require './util/fs'
# check = require('./util/check')
# sh = require('./util/sh')

module.exports = (argv, dep, platform, db, parse) ->
  execute: ->
    return Promise.resolve() if (dep.cache.test.success && !parse.force(dep))
    db.update {name: dep.name}, {$set: {"cache.test.success": true}}, {}
