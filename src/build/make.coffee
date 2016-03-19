Promise = require 'bluebird'
sh = require "shelljs"
platform = require '../platform'

module.exports = (context) ->
  build = ->
    new Promise (resolve, reject) ->
      command = "CXXFLAGS=\"#{context.cFlags}\" make -j#{platform.j()}"
      sh.exec command, (code, stdout, stderr) ->
        if code then reject "ninja exited with code " + code + "\n" + command
        else if stdout then resolve stdout
        else if stderr then resolve stderr

  build: build
  generate: -> Promise.reject "sorry, no support for Makefile creation yet - use cmake or ninja instead"
