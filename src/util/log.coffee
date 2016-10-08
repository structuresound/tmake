check = require './check'
yaml = require 'js-yaml'
colors = require ('chalk')

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
      console.log colors[color || 'gray'] getMessage msg
