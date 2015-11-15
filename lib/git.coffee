git = require('nodegit')
fs = require('fs')
Promise = require("bluebird")

module.exports = (config) ->
  gitDir = ->
    config.srcDir + '/' + config.name

  metaPath = ->
    config.srcDir + '/' + '.versions'

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
    git.Clone(config.url, gitDir())
    .then ->
      json = versions.read()
      json[config.name] = config.version
      versions.write(json)

  deleteFolderRecursive = (path) ->
    files = []
    if fs.existsSync(path)
      files = fs.readdirSync(path)
      files.forEach (file, index) ->
        curPath = path + '/' + file
        if fs.lstatSync(curPath).isDirectory()
          deleteFolderRecursive curPath
        else
          fs.unlinkSync curPath
      fs.rmdirSync path

  validate: ->
    if fs.existsSync(gitDir())
      if versions.read()[config.name] == config.version
        return Promise.resolve()
      else
        @remove()
        .then ->
          clone()
    else
      clone()

  remove: ->
    new Promise (resolve, reject) ->
      if fs.existsSync gitDir()
        deleteFolderRecursive gitDir()
      resolve()
