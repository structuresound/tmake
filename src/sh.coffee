_ = require 'underscore'
Promise = require 'bluebird'
colors = require ('chalk')
sh = require('shelljs')

sh.Promise = (command, cwd, verbose) ->
  throw new Error 'no command' unless command
  if verbose then console.log colors.green("[ sh ] #{command}")
  new Promise (resolve, reject) ->
    sh.cd cwd
    sh.exec command, (code, stdout, stderr) ->
      if code then reject "#{command} exited with code " + code + "\n" + command
      else if stdout then resolve stdout
      else if stderr then resolve stderr
      else resolve()

sh.get = (command, verbose) -> sh.exec(command, {silent: !verbose}).stdout.replace('\n','')

module.exports = sh
