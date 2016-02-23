os = require('os')
ps = require('promise-streams')
fs = require('fs')
unzip = require('unzip')
request = require('request-promise')
numCPUs = require('os').cpus().length
path = require('path')
sh = require "shelljs"
_ = require 'underscore'
Promise = require 'bluebird'

ninjaVersion = "1.6.0"
platformName =
  linux: "linux"
  darwin: "mac"
  win32: "win"

ninjaUrl = "https://github.com/ninja-build/ninja/releases/download/v#{ninjaVersion}/ninja-#{platformName[os.platform()]}.zip"
ninjaPath = "#{process.cwd()}/.bbt"
ninjaLocal = ninjaPath + "/ninja"

module.exports = (step, argv) ->
  useSystemNinja = ->
    if step.useSystemNinja
      if sh.which 'ninja' then return "ninja"
    false

  getNinja = ->
    if fs.existsSync ninjaLocal || useSystemNinja()
      if argv.verbose then console.log 'found ninja'
      ninjaPath = ninjaLocal || useSystemNinja
      Promise.resolve(ninjaPath)
    else
      if argv.verbose then console.log 'fetch ninja binaries . . . '
      ps.wait(request(ninjaUrl).pipe(unzip.Extract(path: ninjaPath)))
      .then ->
        sh.chmod "+x", "#{ninjaLocal}"
        Promise.resolve ninjaLocal

  stdOptions =
    fPIC: true
    std: "c++11"
    stdlib: "libc++"

  optionsToFlags = (options) ->
    flags = ""
    _.each options, (opt, key) ->
      if typeof opt == 'string'
        flags += " -#{key}=#{opt}"
      else if opt
        flags += " -#{key}"
    flags

  build = (dir) ->
    getNinja()
    .then (ninjaPath) ->
      new Promise (resolve, reject) ->
        sh.cd dir
        sh.exec "#{ninjaPath}", (code, stdout, stderr) ->
          if code then resolve code
          else if stdout then console.log stdout
          else if stderr then reject stderr

  genBuildScript = (context, fileStream) ->
    if argv.verbose then console.log 'ninjabuild, context:', context
    getRule = (ext) ->
      switch ext
        when "cpp", "cc", "c" then "cc"
        else "cc"
    ninjaConfig = require('ninja-build-gen')(ninjaVersion, 'build')
    ninjaConfig.rule('cc').run("gcc#{optionsToFlags context.cxxFlags || stdOptions} -c $in -o $out").description 'CC \'$in\' to \'$out\'.'
    _.each context.sources, (filePath) ->
      ext = path.extname filePath
      name = path.basename filePath, ext
      ninjaConfig.edge(name + '.o').from(filePath).using(getRule ext)
    ninjaConfig.saveToStream fileStream

  configure: genBuildScript
  build: build
