_p = require("bluebird")
_ = require 'underscore'
fs = require('fs')
path = require('path')
CSON = require('cson')
glob = require('glob-all')
check = require('./check')
yaml = require 'js-yaml'

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

  defaultConfig = 'tmake'

  fs.configExists = (configDir) ->
    ext = ['yaml', 'json', 'cson']
    for i of ext
      filePath = "#{configDir}/#{defaultConfig}.#{ext[i]}"
      return filePath if fs.existsSync(filePath)
    console.log "no tmake.{yaml, json, cson} file present at #{configDir}"
    return false

  fs.findConfigAsync = (configDir) ->
    _p.resolve fs.configExists configDir

  fs.readConfigAsync = (configDir) ->
    fs.findConfigAsync configDir
    .then (configPath) -> fs.parseFileAsync configPath

  fs.parseFileAsync = (configPath) ->
    if configPath
      fs.readFileAsync configPath, 'utf8'
      .then (data) ->
        switch path.extname configPath
          when '.cson' then _p.resolve CSON.parse(data)
          when '.json' then _p.resolve JSON.parse(data)
          when '.yaml' then _p.resolve yaml.load(data)
          else _p.reject 'unknown config type', configPath
    else
      _p.resolve undefined

  fs.parseFileSync = (configPath) ->
    data = fs.readFileSync(configPath, 'utf8')
    switch path.extname configPath
      when '.cson' then CSON.parse(data)
      when '.json' then JSON.parse(data)
      when '.yaml' then yaml.load(data)
      else throw new Error 'unknown config ext'

  fs.readConfigSync = (configDir) ->
    configPath = fs.configExists(configDir)
    if configPath
      fs.parseFileSync configPath
    else {}
  return fs
)()
