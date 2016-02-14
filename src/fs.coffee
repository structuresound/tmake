Promise = require("bluebird")
fs = Promise.promisifyAll(require('fs'))
path = require('path')
_ = require 'underscore'

module.exports = (->
  fs.nuke = (path) ->
    files = []
    if fs.existsSync(path)
      files = fs.readdirSync(path)
      files.forEach (file) ->
        curPath = path + '/' + file
        if fs.lstatSync(curPath).isDirectory()
          fs.nuke curPath
        else
          fs.unlinkSync curPath
      fs.rmdirSync path

  fs.prune = (path) ->
    files = []
    if fs.existsSync(path)
      files = fs.readdirSync(path)
      if files.length
        files.forEach (file) ->
          curPath = path + '/' + file
          if fs.lstatSync(curPath).isDirectory()
            fs.prune curPath
      else
        fs.rmdirSync path

  fs.vinyl = require 'vinyl-fs'
  fs.map = require 'map-stream'
  fs.gather = (srcPattern, destList, relative, cwd) ->
    new Promise (resolve, reject) ->
      fs.src srcPattern, cwd: cwd
      .pipe fs.map (file, cb) ->
        destList.push path.relative relative, file.path
        cb null, file
      .on 'error', reject
      .on 'finish', resolve
      .on 'end', resolve

  fs.gatherDirectories = (srcPattern, destList, relative, cwd) ->
    list = []
    fs.gather srcPattern, list, relative, cwd
    .then ->
      destList = _.uniq _.reduce(list, (memo, header) ->
        memo.concat path.dirname(path.relative relative, header)
      , [])
  fs
)()
