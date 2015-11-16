exec = require('child_process').exec;
coffee = require('coffee-script')
_ = require('underscore')
Promise = require("bluebird")
request = require('request-promise')
fs = require('./fs')
require('./string')

defaultConfig = 'bbt.coffee'

module.exports =
  run: (argv) ->
    configPath = process.cwd() + '/' + (argv.config || defaultConfig)

    switch argv._[0] || 'update'
      when 'init'
        unless fs.existsSync(configPath)
          fs.writeFileSync defaultConfig, """
          name: "project"
          version: "0.1.0"
          provider: "myuser"
          deps: [
            name: "hello"
            version: "0.1.0"
            provider: "leif"
          ,
            name: "hello"
            version: "0.1.0"
            provider: "git"
            git:
              url: "https://github.com/structuresound/hello-bbt.git"
              config:
                user: ""
                password: ""
                rsa: ""
            transform:
              config:
                walk: require('walk')
              pipeline: ->
                src ['./**/*.coffee', '!./bbt.coffee']
                .pipe map(log)
                .pipe dest('./output')
          ]
          """
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
