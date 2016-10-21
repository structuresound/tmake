_p = require("bluebird")
_ = require 'underscore'
fs = require('fs')
path = require('path')
CSON = require('cson')
glob = require('glob-all')
check = require('./check')
yaml = require 'js-yaml'
sh = require('shelljs')
{ unarchive } = require('./archive')

module.exports = (->
  fs.nuke = (folderPath) ->
    if !folderPath || (folderPath == '/')
      throw new Error "don't nuke everything"
    if fs.existsSync folderPath
      files = []
      if fs.existsSync(folderPath)
        files = fs.readdirSync(folderPath)
        files.forEach (file) ->
          curPath = folderPath + '/' + file
          if fs.lstatSync(curPath).isDirectory()
            fs.nuke curPath
          else
            fs.unlinkSync curPath
        fs.rmdirSync folderPath

  fs.prune = (folderPath) ->
    files = []
    if fs.existsSync(folderPath)
      files = fs.readdirSync(folderPath)
      if files.length
        modified = false
        files.forEach (file) ->
          curPath = folderPath + '/' + file
          if fs.lstatSync(curPath).isDirectory()
            if fs.prune curPath then modified = true
        if modified then return fs.prune folderPath
        false
      else
        fs.rmdirSync folderPath
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

  fs.deleteAsync = (filePath) ->
    new _p (resolve, reject) ->
      fs.unlink filePath, (err) ->
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

  fs.readIfExists = (filePath) ->
    if fs.existsSync filePath
      fs.readFileSync(filePath, 'utf8')

  fs.readConfigSync = (configDir) ->
    configPath = fs.configExists(configDir)
    if configPath
      fs.parseFileSync configPath
    else {}

  fs.unarchive = (archive, tempDir, toDir, toPath) ->
    unarchive archive, tempDir
    .then ->
      fs.moveArchive tempDir, toDir, toPath

  fs.moveArchive = (tempDir, toDir, toPath) ->
    files = fs.readdirSync(tempDir)
    if files.length == 1
      file = files[0]
      fullPath = "#{tempDir}/#{file}"
      if fs.lstatSync(fullPath).isDirectory()
        if fs.existsSync toDir
          fs.nuke toDir
        sh.mv fullPath, toDir
      else
        toPath ?= "#{toDir}/#{file}"
        if !fs.existsSync(toDir)
          sh.mkdir '-p', toDir
        else if fs.existsSync toPath
          fs.unlinkSync toPath
        sh.mv fullPath, toPath
    else
      unless fs.existsSync toDir
        sh.mkdir '-p', toDir
      files.forEach (file) ->
        fullPath = "#{tempDir}/#{file}"
        newPath = path.join toDir, file
        sh.mv fullPath, newPath

  return fs
)()
