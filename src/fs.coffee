Promise = require("bluebird")
fs = Promise.promisifyAll(require('fs'))
path = require('path')
_ = require 'underscore'
ps = require('promise-streams')

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
        modified = false
        files.forEach (file) ->
          curPath = path + '/' + file
          if fs.lstatSync(curPath).isDirectory()
            if fs.prune curPath then modified = true
        if modified then return fs.prune path
        false
      else
        fs.rmdirSync path
        true

  fs.vinyl = require 'vinyl-fs'
  fs.map = require 'map-stream'
  fs.src = fs.vinyl.src
  fs.dest = fs.vinyl.dest
  fs.glob = (srcPattern, relative, cwd) ->
    list = []
    ps.wait(fs.vinyl.src(srcPattern, cwd: cwd)
    .pipe fs.map (file, cb) ->
      list.push path.relative(relative, file.path)
      cb null, file
    ).then -> list

  fs.fileStreamPromise = (file) ->
    ps.wait(file)

  fs.globDirs = (srcPattern, relative, cwd) ->
    fs.glob srcPattern, relative, cwd
    .then (list) ->
      Promise.resolve _.uniq _.reduce(list, (memo, header) ->
        memo.concat path.dirname(path.relative relative, header)
      , [])
  fs
)()
