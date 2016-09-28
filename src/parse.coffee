_ = require 'underscore'
path = require('path')
colors = require ('chalk')
check = require './check'
interpolate = require('./interpolate')
fs = require './fs'
Promise = require 'bluebird'

module.exports = (dep, argv) ->
  platform = require('./platform')(argv, dep)
  replaceMacro = require('./macro')(dep, platform)

  arrayify = (val) ->
    if check(val, Array) then val
    else [ val ]

  fullPath = (p) ->
    if p.startsWith('/') then p else path.join dep.d.root, p

  pathArray = (val) ->
    _.map arrayify(val), (v) -> pathSetting v

  pathSetting = (val) ->
    fullPath configSetting(val)

  globArray = (val) ->
    _.map arrayify(val), (v) -> configSetting v

  configSetting = (val) ->
    replaceMacro interpolate(val, dep)

  replaceAll = (str, find, replace) ->
    escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    str.replace new RegExp(escaped, 'g'), replace

  iterable = (val) ->
    if check(val, Array) then val
    else if check(val, Object) then _.map val, (v) -> v
    else [ val ]

  iterateConf = (confObject, commandObject, ignore) ->
    ignore ?= []
    if check confObject, String then confObject = [ confObject ]
    validCommands = []
    _.each confObject, (v, k) ->
      if check k, Number then k = 'shell'
      else if _.contains ignore, k then return
      validCommands.push
        obj: v
        key: k
    Promise.each validCommands, (i) ->
      if commandObject[i.key] then commandObject[i.key](i.obj)
      else
        console.log colors.red 'failed to find command for', i.key
        commandObject.any(i.obj)

  printRepl = (r) ->
    string = "\n"
    _.each r.inputs, (v, k) ->
      if r.directive then k = "#{r.directive.prepost || r.directive.pre || ''}#{k}#{r.directive.prepost || r.directive.post || ''}"
      string += "#{k} : #{configSetting(v)}\n"
    string

  replaceInFile = (f, r) ->
    unless fs.existsSync f then throw new Error "no file at #{f}"
    stringFile = fs.readFileSync f, 'utf8'
    inputs = r.inputs
    _.each inputs, (v, k) ->
      if r.directive then k = "#{r.directive.prepost || r.directive.pre || ''}#{k}#{r.directive.prepost || r.directive.post || ''}"
      unless argv.quiet then console.log colors.green "[ replace ] #{k}", colors.magenta ": #{configSetting v}"
      stringFile = replaceAll stringFile, k, configSetting(v)
    format =
      ext: path.extname f
      name: path.basename f, path.extname f
      dir: path.dirname f
      base: path.basename f
    if format.ext = '.in'
      parts = f.split('.')
      format.dir = path.dirname parts[0]
      format.name = path.basename parts[0]
      format.ext = parts.slice(1).join('.')
    editedFormat = _.extend format, _.pick r, Object.keys(format)
    editedFormat.base = format.name + format.ext
    newPath = path.format editedFormat
    existingString = ""
    if fs.existsSync newPath
      existingString = fs.readFileSync newPath, 'utf8'
    if existingString != stringFile
      console.log '!!! write to', newPath
      fs.writeFileAsync newPath, stringFile, encoding: 'utf8'

  force: ->
    argv.forceAll || (argv.force && (argv.force == dep.name))
  pathArray: pathArray
  globArray: globArray
  pathSetting: pathSetting
  configSetting: configSetting
  arrayify: arrayify
  replaceInFile: replaceInFile
  interpolate: (s) -> interpolate s, dep
  iterable: iterable
  iterate: iterateConf
  printRepl: printRepl
  replaceAll: replaceAll
