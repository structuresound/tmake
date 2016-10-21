path = require('path')
sh = require "shelljs"
_ = require 'underscore'
Promise = require 'bluebird'
# fs = require('../util/fs')
# colors = require ('chalk')
ninjaVersion = '1.6.0'
_log = require('../util/log')

_toolchain = require './toolchain'

module.exports = (argv, dep, platform, db) ->
  log = _log argv
  toolchain = _toolchain(argv, dep, platform, db)

  getNinja = ->
    resolved = toolchain.select
      ninja:
        version: ninjaVersion
        url: "https://github.com/ninja-build/ninja/releases/download/v{ninja.version}/ninja-{HOST_PLATFORM}.zip"
    toolchain.fetch resolved
    .then ->
      Promise.resolve toolchain.pathForTool(resolved.ninja)

  verifyToolchain = ->
    toolchain.fetch dep.configuration.hostToolchain

  build = ->
    new Promise (resolve, reject) ->
      verifyToolchain()
      .then ->
        getNinja()
      .then (ninjaPath) ->
        directory = dep.d.project
        command = "#{ninjaPath} -C #{directory}"
        log.verbose command
        sh.exec command, (code, stdout, stderr) ->
          if code then reject "ninja exited with code " + code + "\n" + command
          else if stdout then resolve stdout
          else if stderr then resolve stderr

  genBuildScript = (fileName) ->
    context = dep.configuration
    # if argv.verbose then console.log colors.green('configure ninja with context:'), context
    getRule = (ext) ->
      switch ext
        when ".cpp", ".cc" then "cxx"
        when ".c" then "c"
        else throw "unknown extension, no coresponding ninja rule"
    ninjaConfig = require('ninja-build-gen')(ninjaVersion, 'build')
    includeString = " -I" + context.includeDirs.join(" -I")

    cc = context.cc or "gcc"

    cCommand = "#{cc} #{context.compilerFlags.join(' ')} -MMD -MF $out.d #{context.cFlags.join(' ')} -c $in -o $out #{includeString}"
    cxxCommand = "#{cc} #{context.compilerFlags.join(' ')} -MMD -MF $out.d #{context.cxxFlags.join(' ')} -c $in -o $out #{includeString}"

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

    libName = dep.build.outputFile
    linkCommand = "ar rv $out $in"

    switch context.target
      when 'static'
        if dep.name.indexOf('lib') == -1
          libName ?= "lib#{dep.name}.a"
        else
          libName ?= "#{dep.name}.a"
        linkCommand = "ar rv $out $in"
      when 'bin'
        libName ?= "#{dep.name}"
        staticLibs = ''
        if context.libs then staticLibs = context.libs.join(' ')
        linkCommand = "#{cc} -o $out $in #{staticLibs} #{context.linkerFlags.join(' ')}"

    ninjaConfig
    .rule('link')
    .run linkCommand
    .description linkCommand

    linkNames = _.map context.sources, (filePath) ->
      # console.log 'process source file', filePath
      dir = path.dirname filePath
      relative = path.relative dep.p.clone, dir
      # console.log "relative from #{dep.p.clone} is #{relative}"
      outBase = path.join "build/", relative
      ext = path.extname filePath
      name = path.basename filePath, ext
      linkName = "#{outBase}/#{name}.o"
      # console.log 'add build file', linkName
      ninjaConfig.edge(linkName).from(filePath).using(getRule ext)
      linkName

    linkInput = linkNames.join(" ")
    ninjaConfig.edge("build/#{libName}").from(linkInput).using("link")

    ninjaConfig.save fileName

  generate: genBuildScript
  build: build
  getNinja: getNinja
