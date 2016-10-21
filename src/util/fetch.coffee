Promise = require("bluebird")
colors = require ('chalk')
path = require('path')
require './string'
fs = require('./fs')
sh = require('./sh')
_log = require('../util/log')

{ stringHash } = require './hash'

request = require('request')
progress = require('request-progress')
ProgressBar = require('progress')

download = (url, cacheDir) ->
  unless fs.existsSync cacheFile
    sh.mkdir '-p', cacheDir
  cacheFile = path.join cacheDir, stringHash url
  if fs.existsSync cacheFile
    Promise.resolve cacheFile
  else
    new Promise (resolve, reject) ->
      progressBar = undefined
      progress(request(url),
        throttle: 100
        delay: 100
        lengthHeader: 'x-transfer-length').on('progress', (state) ->
          if !progressBar && state.size.total
            progressBar = new ProgressBar("downloading [:bar] :percent :etas #{url}",
              complete: '='
              incomplete: ' '
              width: 20
              total: state.size.total)
          else if !progressBar
            progressBar = new ProgressBar("downloading #{url} :elapsed",
              complete: '='
              incomplete: ' '
              width: 20
              total: 100000000)
          if progressBar
            progressBar.tick(state.size.transferred)
        # The state is an object that looks like this:
        # {
        #     percentage: 0.5,           // Overall percentage (between 0 to 1)
        #     speed: 554732,             // The download speed in bytes/sec
        #     size: {
        #         total: 90044871,       // The total payload size in bytes
        #         transferred: 27610959  // The transferred payload size in bytes
        #     },
        #     time: {
        #         elapsed: 36.235,      // The total elapsed seconds since the start (3 decimals)
        #         remaining: 81.403     // The remaining seconds to finish (3 decimals)
        #     }
        # }
      ).on 'error', reject
      .pipe fs.createWriteStream cacheFile
      .on 'finish', ->
        resolve cacheFile


findGit = ->
  if not sh.which 'git'
    sh.echo 'Sorry, this script requires git'
    sh.exit 1

module.exports = (argv, dep, platform, db) ->
  log = _log argv
  parsePath = (s) ->
    if s.startsWith '/' then s
    else path.join argv.runDir, s

  _fetch = (url) -> download url, path.join(argv.userCache, 'cache')

  unarchiveSource = (filePath, toDir)->
    tempDir = path.join argv.userCache, 'temp', stringHash(filePath)
    fs.unarchive filePath, tempDir, toDir

  resolveUrl = ->
    config = dep.git || dep.fetch || {}
    if dep.git
      if typeof config == 'string'
        config = repository: dep.git
      if !config.repository
        throw new Error "dependency has git configuration, but no repository was specified"
      base = "https://github.com/#{config.repository}"
      archive = config.archive || config.tag || config.branch || dep.tag || "master"
      "#{base}/archive/#{archive}.tar.gz"
    else if dep.link
      parsePath dep.link
    else if dep.fetch
      if typeof config == 'string'
        config = archive: dep.fetch
      if !config.archive
        throw new Error "dependency has fetch configuration, but no archive was specified"
      config.archive
    else
      "rootConfig"
      # throw new Error "unable to resolve url for dependency #{dep.name}: #{JSON.stringify(dep,0,2)}"

  getSource = ->
    fs.existsAsync dep.d.clone
    .then (exists) ->
      url = resolveUrl()
      hash = stringHash url
      if exists && dep.cache.url == hash && !platform.force(dep)
        if argv.verbose then console.log colors.yellow 'using cache'
        Promise.resolve()
      else
        sh.mkdir '-p', dep.d.root
        _fetch url
        .then (file) ->
          unarchiveSource file, dep.d.clone
        .then ->
          db.update
              name: dep.name
            ,
              $set:
                "cache.url": hash
            ,
              upsert: true
          .then ->
            if argv.verbose then console.log colors.magenta "inserted new record #{dep.name}"

  linkSource = ->
    url = resolveUrl()
    unless argv.quiet then console.log colors.green 'link source from', url
    unless argv.quiet then console.log colors.yellow 'to', dep.d.root
    fs.existsAsync dep.d.clone
    .then (exists) ->
      if exists
        Promise.resolve()
      else
        new Promise (resolve, reject) ->
          fs.symlink url, dep.d.root, 'dir', (err) ->
            if err then reject err
            db.update
                name: dep.name
              ,
                $set: "cache.url": stringHash url
              ,
                upsert: true
            .then (res) ->
              if argv.verbose then console.log colors.magenta "inserted new record #{dep.name}"
              resolve res

  # clone = ->
  #   return checkout() if (dep.cache.git && fs.existsSync(dep.d.clone) && !platform.force(dep))
  #   fs.nuke dep.d.clone
  #   unless argv.quiet then console.log colors.green "cloning #{config.url} into #{dep.d.clone}"
  #   new Promise (resolve, reject) ->
  #     git.clone config.url, dep.d.clone, (err) ->
  #       return reject err if err
  #       dep.cache.git = checkout: "master"
  #       db.update
  #           name: dep.name
  #         ,
  #           $set:
  #             "cache.git.checkout": "master"
  #             "tag": config.checkout
  #         ,
  #           upsert: true
  #       .then ->
  #         checkout()
  #       .then ->
  #         resolve()
  #       .catch (e) ->
  #         reject e

  # checkout = ->
  #   if ((dep.cache.git?.checkout == config.checkout) && !platform.force(dep))
  #     unless argv.quiet then console.log 'using ', dep.name, '@', config.checkout
  #     return Promise.resolve()
  #   sh.Promise "git checkout #{config.checkout}", dep.d.clone, argv.verbose
  #   .then ->
  #     db.update
  #         name: dep.name
  #       ,
  #         $set: "cache.git.checkout": config.checkout
  #       ,
  #         {}

  validate: ->
    if fs.existsSync(dep.d.clone) && !platform.force(dep)
      Promise.resolve()
    else
      getSource()

  findGit: findGit
  fetch: _fetch
  resolveUrl: resolveUrl
  getSource: getSource
  linkSource: linkSource
