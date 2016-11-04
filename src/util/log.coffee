check = require './check'
yaml = require 'js-yaml'
colors = require ('chalk')
_ = require 'underscore'
# status = require('node-status')
# console = status.console()
# stringify = require 'json-stable-stringify'

getMessage = (msg) ->
  if check msg, Object
    # yaml.dump(JSON.parse(stringify(msg)))
    yaml.dump msg, sortKeys: true
  else if check msg, Array
    _.map msg, getMessage
    .join ','
  else
    msg

module.exports = (argv) ->
  verbose: (msg, color) ->
    if argv.verbose
      console.log colors[color || 'gray'](getMessage(msg))

  quiet: (msg, color) ->
    if !argv.quiet || argv.verbose
      console.log colors[color || 'white'](getMessage(msg))

  info: (msg, color) -> console.log colors[color || 'white'](getMessage(msg))
  error: (msg) ->
    console.log colors['red'](getMessage(msg))

  throw: (msg) ->
    console.log colors['magenta'](getMessage(msg))
    throw new Error "log wants you to stop and look at the magenta message"
