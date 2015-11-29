#git = require('nodegit')
Promise = require("bluebird")
git = require 'gift'
fs = require('./fs')

module.exports = (config) ->
  gitDir = ->
    config.srcDir + '/' + config.name

  metaPath = ->
    config.srcDir + '/' + 'versions'

  versions =
    read: ->
      if fs.existsSync metaPath()
        registryData = fs.readFileSync metaPath()
        JSON.parse(registryData) or {}
      else
        {}
    write: (json) ->
      fs.writeFileSync metaPath(), JSON.stringify(json)

  clone = ->
    console.log 'cloning', config.url, 'into', gitDir()
    new Promise (resolve) ->
      git.clone config.url, gitDir(), ->
        json = versions.read()
        json[config.name] = config.version
        versions.write(json)
        resolve()

  validate: ->
    if fs.existsSync(gitDir())
      if versions.read()[config.name] == config.version
        console.log 'using ', config.name, '@', config.version
        return Promise.resolve()
      else
        @remove()
        .then ->
          clone()
    else
      clone()

  remove: ->
    new Promise (resolve) ->
      if fs.existsSync gitDir()
        fs.deleteFolderRecursive gitDir()
      resolve()
