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
  ninjaPath = argv.userCache
  ninjaDownload = path.join ninjaPath, "ninja"
  ninjaLocal = path.join ninjaPath, "ninja_#{ninjaVersion}"

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
        new Promise (resolve, reject) ->
          request(ninjaUrl).pipe(unzip.Extract(path: ninjaPath))
          .on 'close', ->
            if argv.verbose then console.log "chmod 755 #{ninjaLocal}"
            sh.mv ninjaDownload, ninjaLocal
            fs.chmod "#{ninjaLocal}", 755, (err) ->
              if err then reject err
              else
                if argv.verbose then console.log '. . . ninja installed'
                resolve ninjaLocal

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
      linkNames.push "build/#{name}.o"
      ninjaConfig.edge("build/#{name}.o").from(filePath).using(getRule ext)

    linkInput = linkNames.join(" ")

    libName = dep.build.outputFile

    if dep.name.indexOf('lib') == -1
      libName ?= "lib#{dep.name}.a"
    else
      libName ?= "#{dep.name}.a"

    ninjaConfig.edge("build/#{libName}").from(linkInput).using("link")
    ninjaConfig.saveToStream fileStream

  generate: genBuildScript
  build: build
  getNinja: getNinja
