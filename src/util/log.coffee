check = require './check'
yaml = require 'js-yaml'
colors = require ('chalk')
# status = require('node-status')
# console = status.console()

getMessage = (msg) ->
  if check msg, Object
    yaml.dump msg
  else if check msg, Array
    msg.join ','
  else
    msg

module.exports = (argv) ->
  verbose: (msg, color) ->
    if argv.verbose
      console.log colors[color || 'gray'] getMessage msg

  quiet: (msg, color) ->
    if !argv.quiet || argv.verbose
      console.log colors[color || 'white'] getMessage msg

  info: (msg, color) -> console.log colors[color || 'white'] getMessage msg
  error: (msg) ->
    console.log colors['red'] getMessage msg
