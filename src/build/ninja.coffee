unzip = require('unzip')
request = require('request-promise')
path = require('path')
sh = require "shelljs"
_ = require 'underscore'
Promise = require 'bluebird'
fs = require('../fs')
colors = require ('chalk')

module.exports = (dep, argv) ->
  platform = require('../platform')(argv, dep)

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
        directory = path.dirname dep.cache.buildFile
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
        linkCommand = "#{cc} -o $out $in #{staticLibs} #{context.ldFlags}"

    ninjaConfig
    .rule('link')
    .run linkCommand
    .description linkCommand

    linkNames = _.map context.sources, (filePath) ->
      ext = path.extname filePath
      name = path.basename filePath, ext
      ninjaConfig.edge("build/#{name}.o").from(filePath).using(getRule ext)
      "build/#{name}.o"

    linkInput = linkNames.join(" ")
    ninjaConfig.edge("build/#{libName}").from(linkInput).using("link")

    ninjaConfig.saveToStream fileStream

  generate: genBuildScript
  build: build
  getNinja: getNinja
