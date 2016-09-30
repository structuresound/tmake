_p = require("bluebird")
_ = require 'underscore'
fs = require('fs')
path = require('path')
CSON = require('cson')
glob = require('glob-all')
check = require('./check')

module.exports = (->
  fs.nuke = (path) ->
    if fs.existsSync path
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
  fs.wait = (stream, readOnly) ->
    new _p (resolve, reject) ->
      stream.on 'error', reject
      if readOnly then stream.on 'finish', resolve
      else stream.on 'end', resolve

  fs.deleteAsync = (path) ->
    new _p (resolve, reject) ->
      fs.unlink path, (err) ->
        if err then reject err else resolve 1

  fs._glob = (srcPattern, relative, cwd) ->
    new _p (resolve, reject) ->
      glob srcPattern, {cwd: cwd || process.cwd(), root: relative || process.cwd(), nonull: false}, (er, results) ->
        if er then reject er
        else if results
          resolve _.map results, (file) ->
            filePath = cwd + '/' + file
            if relative then path.relative(relative, filePath)
            else filePath
        else reject 'no files found'

  fs.glob = (pattern_s, relative, cwd) ->
    patterns = []
    if check pattern_s, String then patterns.push pattern_s
    else if check pattern_s, Array then patterns = pattern_s
    fs._glob patterns, relative, cwd

  fs.globDirs = (srcPattern, relative, cwd) ->
    fs.glob srcPattern, relative, cwd
    .then (list) ->
      _p.resolve _.uniq _.reduce(list, (memo, header) ->
        if relative then memo.concat path.dirname(path.relative relative, header)
        else memo.concat path
      , [])

  fs.existsAsync = (filePath) ->
    new _p (resolve) ->
      fs.exists filePath, (exists) ->
        resolve exists

  fs.readFileAsync = (filePath, format) ->
    new _p (resolve, reject) ->
      fs.readFile filePath, format, (err,data) ->
        reject err if err
        resolve data

  fs.writeFileAsync = (filePath, data, options) ->
    new _p (resolve, reject) ->
      fs.writeFile filePath, data, options, (err,data) ->
        reject err if err
        resolve data

  fs.findAsync = fs.glob
  fs.findOneAsync = (srcPattern, relative, cwd) ->
    fs.findAsync srcPattern, relative, cwd
    .then (array) ->
      if array.length then _p.resolve array[0]
      else _p.resolve undefined

  fs.getConfigAsync = (configPath) ->
    fs.findConfigAsync configPath
    .then (resolved) ->
      if resolved then fs.readConfigAsync resolved

  fs.findConfigAsync = (configPath) ->
    fs.existsAsync configPath
    .then (exists) ->
      if exists
        _p.resolve configPath
      else
        # base = path.dirname configPath
        prefix = path.basename configPath, path.extname configPath
        # console.log 'config not found at', configPath
        # console.log 'searching', prefix
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
              _p.resolve CSON.parse(data)
            when '.json' then _p.resolve JSON.parse(data)
            else _p.reject 'unknown config type', configPath
      else
        console.log "no cson or json file present at #{path}"
        _p.resolve undefined

  fs.readConfigSync = (configPath) ->
    if fs.existsSync(configPath)
      data = fs.readFileSync(configPath, 'utf8')
      switch path.extname configPath
        when '.cson' then CSON.parse(data)
        when '.json' then JSON.parse(data)
        else throw new Error 'unknown config ext'
    else
      console.log "no cson or json file present at #{path}"
      {}

  return fs
)()
