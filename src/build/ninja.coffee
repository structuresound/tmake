unzip = require('unzip')
request = require('request-promise')
path = require('path')
sh = require "shelljs"
_ = require 'underscore'
Promise = require 'bluebird'
platform = require '../platform'
fs = require('../fs')
colors = require ('chalk')

module.exports = (dep, argv) ->
  ninjaVersion = "1.6.0"

  ninjaUrl = "https://github.com/ninja-build/ninja/releases/download/v#{ninjaVersion}/ninja-#{platform.name()}.zip"
  ninjaPath = "#{process.cwd()}/.bbt"
  ninjaLocal = ninjaPath + "/ninja"

  useSystemNinja = ->
    if dep.system?.ninja
      if sh.which 'ninja' then return "ninja"
      else console.log "system ninja specified, but can't find it"
    false

  getNinja = ->
    ninjaExecutable = useSystemNinja() || ninjaLocal
    fs.existsAsync ninjaExecutable
    .then (exists) ->
      if exists
        if argv.verbose then console.log 'found ninja'
        Promise.resolve ninjaExecutable
      else
        if argv.verbose then console.log 'fetch ninja binaries . . . '
        fs.wait(request(ninjaUrl).pipe(unzip.Extract(path: ninjaPath)))
        .then ->
          if argv.verbose then console.log 'installed . . . chmod'
          sh.chmod "+x", "#{ninjaLocal}"
          if argv.verbose then console.log '. . . ninja installed'
          Promise.resolve ninjaLocal

  build = ->
    new Promise (resolve, reject) ->
      getNinja()
      .then (ninjaPath) ->
        directory = path.dirname dep.buildFile
        command = "#{ninjaPath} -C #{directory}"
        sh.exec command, (code, stdout, stderr) ->
          if code then reject "ninja exited with code " + code + "\n" + command
          else if stdout then resolve stdout
          else if stderr then resolve stderr

  genBuildScript = (context, fileStream) ->
    if argv.verbose then console.log colors.green('configure ninja with context:'), context
    getRule = (ext) ->
      switch ext
        when ".cpp", ".cc" then "cxx"
        when ".c" then "c"
        else throw "unknown extension, no coresponding ninja rule"
    ninjaConfig = require('ninja-build-gen')(ninjaVersion, 'build')
    includeString = " -I" + context.includeDirs.join(" -I")

    cc = context.compiler or "gcc"

    cCommand = "#{cc} -MMD -MF $out.d #{context.cFlags} -c $in -o $out #{includeString}"
    cxxCommand = "#{cc} -MMD -MF $out.d #{context.cxxFlags} -c $in -o $out #{includeString}"
    linkCommand = "ar rv $out $in #{context.ldFlags}"

    ninjaConfig
    .rule 'c'
    .depfile '$out.d'
    .run cCommand
    .description cCommand

    ninjaConfig
    .rule 'cxx'
    .depfile '$out.d'
    .run cxxCommand
    .description cxxCommand

    ninjaConfig
    .rule('link')
    .run linkCommand
    .description linkCommand

    linkNames = []
    _.each context.sources, (filePath) ->
      ext = path.extname filePath
      name = path.basename filePath, ext
      linkNames.push 'build/' + name + '.o'
      ninjaConfig.edge('build/' + name + '.o').from(filePath).using(getRule ext)

    linkInput = linkNames.join(" ")
    ninjaConfig.edge('build/lib' + dep.name + '.a').from(linkInput).using("link")
    ninjaConfig.saveToStream fileStream

  generate: genBuildScript
  configure: -> return undefined
  build: build
  getNinja: getNinja
