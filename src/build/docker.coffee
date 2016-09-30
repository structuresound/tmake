_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../util/fs'
colors = require ('chalk')
sh = require('shelljs')

module.exports = (argv, dep) ->
  run = (command) ->
    command = "docker run -it --rm --name my-running-script -v \"$PWD\":/usr/src/app -w /usr/src/app node:4 node your-daemon-or-script.js"
    if argv.verbose then console.log("run cmake command: ", command)
    new Promise (resolve, reject) ->
      sh.cd dep.d.build
      sh.exec command, (code, stdout, stderr) ->
        if code then reject "docker exited with code " + code + "\n" + command
        else if stdout then resolve stdout
        else if stderr then resolve stderr
