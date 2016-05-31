os = require('os')
sh = require('./sh')
_ = require('underscore')
cascade = require './cascade'

module.exports = (argv, conf) ->
  iosArches = ["arm64", "armv7s", "armv7"]
  androidArches = iosArches

  platformNames =
    linux: "linux"
    darwin: "mac"
    mac: "mac"
    win: "win"
    win32: "win"
    ios: "ios"
    android: "android"

  architectureNames =
    x86: "x86"
    x32: "x86"
    x64: "x64"
    arm: "arm"
    mac:
      x86: "x86_64"
    ios:
      x64: iosArches
      x86: iosArches
      arm: iosArches

  keywords = _.uniq(Object.keys(platformNames).concat(Object.keys(architectureNames)))

  targetPlatform = -> argv.platform || conf.platform || platformNames[os.platform()]
  targetArch = ->
    architectures = cascade.deep architectureNames, keywords, targetPlatform()
    argv.arch || conf.arch || architectures[process.arch]

  homeDir: -> process.env[if process.platform == 'win32' then 'USERPROFILE' else 'HOME']
  name: -> targetPlatform()
  keywords: -> keywords
  selectors: -> [ targetPlatform(), targetArch() ]
  j: -> os.cpus().length
  macro:
    OS_ENDIANNESS: os.endianness()
