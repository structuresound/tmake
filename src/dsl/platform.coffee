os = require('os')
# sh = require('./sh')
_ = require('underscore')
cascade = require './cascade'
check = require '../util/check'
sh = require('../util/sh')


_ = require 'underscore'
path = require('path')
colors = require ('chalk')
interpolate = require('./interpolate')
Promise = require 'bluebird'

fs = require '../util/fs'
check = require '../util/check'

iosArches = ["arm64", "armv7s", "armv7"]
# androidArches = iosArches

platformNames =
  linux: "linux"
  darwin: "mac"
  mac: "mac"
  win: "win"
  win32: "win"
  ios: "ios"
  android: "android"

validSelectors = [
  # IDE's
  "xcode"
  "clion"
  "msvs"
  "vscode"
  "codeblocks"
  "appcode"
  # Platforms
  "cocoa"
  "sdl"
  "juce"
]

architectureNames =
  x86: "x86"
  x32: "x86"
  x64: "x64"
  arm: "arm"
  mac:
    x64: "x86_64"
  ios:
    x64: iosArches
    x86: iosArches
    arm: iosArches

macros =
  'mac ios':
    DEVELOPER: "$(xcode-select -print-path)"
  mac:
    PLATFORM: "darwin64-x86_64-cc"
    OSX_DEPLOYMENT_VERSION: "10.8"
    OSX_SDK_VERSION: "$(xcrun --sdk macosx --show-sdk-version)"
    OSX_PLATFORM: "$(xcrun --sdk macosx --show-sdk-platform-path)"
    OSX_SDK: "$(xcrun --sdk macosx --show-sdk-path)"
  'mac linux':
    OS_ENDIANNESS: os.endianness()
    ARCH: "x86_64"
  ios:
    ARCH: "arm64"
    SDK_VERSION: "$(xcrun --sdk iphoneos --show-sdk-version)"
    CROSS_TOP: "{DEVELOPER}/Platforms/iPhoneOS.platform/Developer"
    CROSS_SDK: "iPhoneOS{SDK_VERSION}.sdk"
    IPHONEOS_DEPLOYMENT_VERSION: "6.0"
    IPHONEOS_SDK_VERSION: "$(xcrun --sdk iphoneos --show-sdk-version)"
    IPHONEOS_PLATFORM: "$(xcrun --sdk iphoneos --show-sdk-platform-path)"
    IPHONEOS_SDK: "$(xcrun --sdk iphoneos --show-sdk-path)"

keywords = _.uniq(Object.keys(platformNames)
.concat(Object.keys(architectureNames))
.concat(validSelectors))

cache = {}
macro = {}

module.exports = (argv, rootConfig) ->
  argvSelectors = Object.keys _.pick argv, validSelectors
  targetPlatform = ->
    argv.platform || rootConfig.platform || platformNames[os.platform()]

  shellReplace = (m) ->
    if cache[m] then cache[m]
    else
      commands = m.match(/\$\([^\)\r\n]*\)/g)
      if commands
        interpolated = m
        _.each commands, (c) ->
          # console.log 'sh $: ', c
          interpolated = interpolated.replace c, sh.get(c.slice(2, -1))
        cache[m] = interpolated
      else m

  objectReplace = (m, dict) ->
    throw new Error "object must have macro key and optional map #{JSON.stringify m}" unless m.macro
    res = _parse m.macro, dict
    if m.map then m.map[res]
    else res

  replace = (m, dict) ->
    if check(m, String)
      shellReplace m
    else if check(m, Object)
      console.log 'replacing object', m,'with', objectReplace m, dict
      objectReplace m, dict
    else m

  allStrings = (o, fn) ->
    for k of o
      if check o[k], String
        o[k] = fn o[k]
      else if check(o[k], Object) || check(o[k], Array)
        allStrings o[k], fn
    o

  _parse = (val, dict) ->
    if dict
      val = interpolate(val, dict)
    val = interpolate(val, macro)
    replace val, dict

  parse = (conf, dict) ->
    if check conf, String
      _parse conf, dict
    else if check conf, Object
      unless dict
        dict = conf
      allStrings _.clone(conf), (val) -> parse val, dict
    else conf

  _.extend macro, cascade.deep(macros, keywords, [targetPlatform()])

  # console.log macro, 'cache\n', cache
  arrayify = (val) ->
    if check(val, Array) then val
    else [ val ]

  fullPath = (p) ->
    if p.startsWith('/') then p else path.join rootConfig.d.root, p

  pathArray = (val) ->
    _.map arrayify(val), (v) -> pathSetting v

  pathSetting = (val) ->
    fullPath parse(val)

  globArray = (val) ->
    _.map arrayify(val), (v) -> parse v

  leaves = (root, fn) ->
    if Array.isArray(root) || (root != null and typeof val == 'object')
      for i of root
        leaves i, fn
    else
      fn root

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
      string += "#{k} : #{parse(v)}\n"
    string

  replaceInFile = (f, r) ->
    unless fs.existsSync f then throw new Error "no file at #{f}"
    stringFile = fs.readFileSync f, 'utf8'
    inputs = r.inputs
    _.each inputs, (v, k) ->
      if r.directive then k = "#{r.directive.prepost || r.directive.pre || ''}#{k}#{r.directive.prepost || r.directive.post || ''}"
      unless argv.quiet then console.log colors.green "[ replace ] #{k}", colors.magenta ": #{parse v}"
      stringFile = replaceAll stringFile, k, parse(v)
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

  force: (dep) ->
    argv.forceAll || (argv.force && (argv.force == dep.name))
  pathArray: pathArray
  globArray: globArray
  pathSetting: pathSetting
  parse: parse
  arrayify: arrayify
  replaceInFile: replaceInFile
  interpolate: interpolate
  iterable: iterable
  iterate: iterateConf
  macro: macro
  cache: cache
  printRepl: printRepl
  replaceAll: replaceAll
  replace: replace
  name: -> targetPlatform()
  keywords: -> keywords
  selectors: ->
    [ targetPlatform(), process.arch ].concat(argvSelectors)
  j: -> os.cpus().length
