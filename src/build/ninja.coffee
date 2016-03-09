ps = require('promise-streams')
unzip = require('unzip')
request = require('request-promise')
path = require('path')
sh = require "shelljs"
_ = require 'underscore'
Promise = require 'bluebird'

platform = require '../platform'
fs = require('../fs')

ninjaVersion = "1.6.0"

ninjaUrl = "https://github.com/ninja-build/ninja/releases/download/v#{ninjaVersion}/ninja-#{platform.name()}.zip"
ninjaPath = "#{process.cwd()}/.bbt"
ninjaLocal = ninjaPath + "/ninja"

module.exports = (task, dep, argv) ->
  useSystemNinja = ->
    if task.useSystemNinja
      if sh.which 'ninja' then return "ninja"
    false

  getNinja = ->
    ninjaExecutable = ninjaLocal || useSystemNinja()
    fs.existsAsync ninjaExecutable
    .then (exists) ->
      if exists
        if argv.verbose then console.log 'found ninja'
        Promise.resolve ninjaExecutable
      else
        if argv.verbose then console.log 'fetch ninja binaries . . . '
        ps.wait(request(ninjaUrl).pipe(unzip.Extract(path: ninjaPath)))
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
    if argv.verbose then console.log 'ninjabuild, context:', context
    getRule = (ext) ->
      switch ext
        when "cpp", "cc", "c" then "cc"
        else "cc"
    ninjaConfig = require('ninja-build-gen')(ninjaVersion, 'build')
    includeString = " -I" + context.includeDirs.join(" -I")

    cc = context.compiler or "gcc"

    compileCommand = "#{cc} -MMD -MF $out.d #{context.cflags} -c $in -o $out #{includeString}"
    linkCommand = "ar rv $out $in #{context.ldflags}"

    ninjaConfig
    .rule 'compile'
    .depfile '$out.d'
    .run compileCommand
    .description compileCommand

    ninjaConfig
    .rule('link')
    .run linkCommand
    .description linkCommand

    linkNames = []
    _.each context.sources, (filePath) ->
      ext = path.extname filePath
      name = path.basename filePath, ext
      linkNames.push 'build/' + name + '.o'
      ninjaConfig.edge('build/' + name + '.o').from(filePath).using("compile")

    linkInput = linkNames.join(" ")
    ninjaConfig.edge('build/lib' + dep.name + '.a').from(linkInput).using("link")
    ninjaConfig.saveToStream fileStream

  generate: genBuildScript
  configure: -> return undefined
  build: build
  getNinja: getNinja
