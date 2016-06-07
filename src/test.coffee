Promise = require 'bluebird'
fs = require './fs'
check = require('./check')
sh = require('./sh')

module.exports = (dep, argv, db, parse) ->
  execute: ->
    return Promise.resolve() if (dep.cache.test.success && !parse.force())
    db.update {name: dep.name}, {$set: {"cache.test.success": true}}, {}
