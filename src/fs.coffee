Promise = require("bluebird")
fs = require('fs')
path = require('path')
_ = require 'underscore'
ps = require('promise-streams')
CSON = require('cson')

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
      if relative then list.push path.relative(relative || '/', file.path)
      else list.push file.path
      cb null, file
    ).then -> list

  fs.fileStreamPromise = (file) ->
    ps.wait(file)

  fs.deleteAsync = (path) ->
    new Promise (resolve, reject) ->
      fs.unlink path, (err) ->
        if err then reject err else resolve 1

  fs.globDirs = (srcPattern, relative, cwd) ->
    fs.glob srcPattern, relative, cwd
    .then (list) ->
      Promise.resolve _.uniq _.reduce(list, (memo, header) ->
        if relative then memo.concat path.dirname(path.relative relative, header)
        else memo.concat path
      , [])

  fs.existsAsync = (configPath) ->
    new Promise (resolve) ->
      fs.exists configPath, (exists) ->
        resolve exists

  fs.readFileAsync = (configPath, format) ->
    new Promise (resolve, reject) ->
      fs.readFile configPath, format, (err,data) ->
        reject err if err
        resolve data

  fs.findAsync = fs.glob
  fs.findOneAsync = (srcPattern, relative, cwd) ->
    fs.findAsync srcPattern, relative, cwd
    .then (array) ->
      #console.log 'found', array
      if array.length then Promise.resolve array[0]
      else Promise.reject 'no config files found'

  fs.getConfigAsync = (configPath) ->
    fs.findConfigAsync configPath
    .then (resolved) -> fs.readConfigAsync resolved

  fs.findConfigAsync = (configPath) ->
    fs.existsAsync configPath
    .then (exists) ->
      if exists
        Promise.resolve configPath
      else
        base = path.dirname configPath
        prefix = path.basename configPath, path.extname configPath
        console.log 'config not found at', configPath
        console.log 'searching', prefix
        fs.findOneAsync ["#{prefix}.*"]

  fs.readConfigAsync = (configPath) ->
    #console.log 'reading', configPath
    fs.existsAsync configPath
    .then (exists) ->
      if exists
        fs.readFileAsync configPath, 'utf8'
        .then (data) ->
          switch path.extname configPath
            when '.cson'
              Promise.resolve CSON.parse(data)
            when '.json' then Promise.resolve JSON.parse(data)
            else Promise.reject 'unknown config type', configPath
      else
        Promise.reject "no json file present at #{path}"

  fs.readConfigSync = (configPath) ->
    if fs.existsSync(configPath)
      data = fs.readFileSync(configPath, 'utf8')
      switch path.extname configPath
        when '.cson' then CSON.parse(data)
        when '.json' then JSON.parse(data)
        else Promise.reject 'unknown config ext'
    else
      Promise.reject "no json file present at #{path}"

  return fs
)()
