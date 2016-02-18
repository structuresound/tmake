_ = require 'underscore'
Promise = require 'bluebird'
numCPUs = require('os').cpus().length

module.exports = (step, argv, db, context) ->
  silence = ->
    argv = db = step

  build = ->
    console.log context

  execute: build
