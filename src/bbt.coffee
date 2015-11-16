exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
fs = require('./fs')
require('./string')

defaultConfig = 'bbt.coffee'

module.exports =
  run: (argv, libdir) ->
    configPath = process.cwd() + '/' + (argv.config || defaultConfig)

    switch argv._[0] || 'update'
      when 'init'
        unless fs.existsSync(configPath)
          fs.writeFileSync defaultConfig, fs.readFileSync(libdir + '/' + defaultConfig, 'utf8')
      when 'update'
        if fs.existsSync(configPath)
          fs.readFileAsync(configPath, 'utf8').then (data) ->
            config = coffee.eval(data)
            Promise.each config.deps, (dep) ->
              if dep.provider
                switch dep.provider
                  when 'local' then console.log "copying", dep.name, 'from', dep.path
                  when 'git' then clone(dep)
                  else
                    console.log "fetching", dep.provider, ':', dep.name, dep.version
              else
                console.log "skipping", dep.name, "bad format", JSON.stringify(dep)
        else
          console.log "if this is a new project run 'bbt init' or 'bbt help'"

gitDir = ->
  process.cwd() + '/.bbt/src'

clone = (dep) ->
  gitConfig = dep.git
  gitConfig.name ?= dep.name
  gitConfig.srcDir ?= gitDir()
  gitConfig.version ?= dep.version

  git = require('./git')(gitConfig)
  git.validate().then -> transform(dep)

transform = (dep) ->
  new Promise (resolve) ->
    if dep.transform
      console.log 'excecuting pipeline'
      ctx = dep.transform
      ctx.srcDir = gitDir() + '/' + dep.name
      transform = require('./transform')(ctx)
      transform.pipeline()
    resolve()
