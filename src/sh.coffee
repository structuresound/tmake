_ = require 'underscore'
exec = require('child-process-promise').exec
spawn = require('child-process-promise').spawn
splitargs = require('splitargs')
# Bluebird = require("bluebird")

module.exports = (task, argv) ->
  if argv.verbose then console.log('[   build   ]')

  config = task.options || {}

  applyArgv = (dest) ->
    dest ?= []
    _.each config.flags, (value, key) ->
      dest.push "--#{key}=#{value}"
    _.each argv, (value, key) ->
      return if key == '_'
      unless _.contains dest, key
        dest.push "--#{key}=#{value}"
    if !config.flags?.debug then dest.push '--no-debug'
    dest

  exec: (command) ->
    process.chdir task.srcDir
    if argv.verbose then console.log "exec #{command} process"
    exec(command, stdio: 'inherit')
    .progress (childProcess) ->
      unless argv.quiet
        childProcess?.stdout?.on 'data', (data) -> console.log "[ #{command} ]", data.toString()
        childProcess?.stderr?.on 'data', (data) -> console.log "[ error ][ #{command} ]", data.toString()
    .fail (err) -> console.error "[ #{command} ] ERROR: ", err

  run: (command) ->
    args = splitargs(command)
    name = args[0]
    args.splice 0, 1
    spawn(name, args, stdio: 'inherit')
    .progress (childProcess) ->
      unless argv.quiet
        childProcess?.stdout?.on 'data', (data) -> console.log "[ #{command} ]", data.toString()
        childProcess?.stderr?.on 'data', (data) -> console.log "[error][ #{command} ]", data.toString()
    .fail (err) -> console.error "[ #{command} ] ERROR: ", err
