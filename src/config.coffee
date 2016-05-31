_ = require('underscore')
_p = require("bluebird")
path = require('path')
request = require('request-promise')
fs = require('./fs')
require('./string')
colors = require ('chalk')
check = require './check'
Datastore = require('nedb-promise')

module.exports = (argv, binDir, npmDir) ->
  platform = require('./platform')(argv)

  pgname = "tmake"
  runDir = process.cwd()

  argv.cachePath ?= "trie_modules"
  argv.program ?= pgname
  argv.userCache ?= "#{platform.homeDir()}/.#{pgname}"
  argv.npmDir ?= npmDir
  if argv.v then argv.verbose ?= argv.v

  cli = require('./cli')(pgname)

  defaultConfig = 'package.cson'
  configPath = runDir + '/' + (argv.config || defaultConfig)

  init = ->
    unless fs.existsSync(configPath)
      cli.createPackage()
      .then (config) ->
        fs.writeFileSync defaultConfig, config
    else
      console.log "aborting init, this folder already has a package.cson file present"

  run: ->
    fs.getConfigAsync configPath
    .then (config) ->
      throw config if check config, Error
      argv._[0] ?= 'all'
      if config
        try
          cli.parse argv
          tmake = require('./tmake')(argv, config, cli)
          tmake.run()
        catch e
          console.log 'tmake error: ', e
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
