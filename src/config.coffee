require './util/string'
path = require('path')
colors = require ('chalk')
check = require './util/check'
yaml = require 'js-yaml'
fs = require('./util/fs')


module.exports = (argv, binDir, npmDir) ->
  homeDir = ->
    process.env[if process.platform == 'win32' then 'USERPROFILE' else 'HOME']

  pgname = "tmake"
  runDir = process.cwd()

  argv.cachePath ?= "trie_modules"
  argv.program ?= pgname
  argv.userCache ?= "#{homeDir()}/.#{pgname}"
  argv.npmDir ?= npmDir
  argv.binDir ?= binDir
  if argv.v then argv.verbose ?= argv.v

  cli = require('./cli')(pgname)

  init = ->
    unless fs.findConfigAsync runDir
      cli.createPackage()
      .then (config) ->
        fs.writeFileSync "#{runDir}/tmake.yaml", yaml.dump config
    else
      console.log "aborting init, this folder already has a package file present"

  run: ->
    fs.readConfigAsync runDir
    .then (config) ->
      throw config if check config, Error
      argv._[0] ?= 'all'
      if config
        try
          cli.parse argv
          tmake = require('./tmake')(argv, config, cli)
          tmake.run()
        catch error
          console.log 'tmake error: ', error
      else
        switch argv._[0]
          when 'init'
            init()
          when 'example'
            example = argv._[1] || "served"
            examplePath = path.join npmDir, "examples/#{example}"
            targetFolder = argv._[2] || example
            console.log colors.magenta "copy from #{example} to #{targetFolder}"
            fs.src ["**/*"], cwd: examplePath
            .pipe fs.dest path.join runDir, targetFolder
          when 'help', 'man', 'manual' then console.log cli.manual()
          else
            console.log cli.hello()
