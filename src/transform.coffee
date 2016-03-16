_ = require('underscore')
_p = require("bluebird")
fs = require('./fs')

module.exports = (dep, argv, db) ->
  task = dep.transform
  task.name ?= dep.name

  transform = ->
    new _p (resolve) ->
      resolve()

  execute: -> transform().then ->
    db.update name: dep.name,
      $set: transformed: true
    , {}
