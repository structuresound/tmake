_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")

module.exports = (task) ->
  context =
    src: (glob, opt) ->
      options = opt or {}
      options.cwd ?= task.buildDir
      patterns = _.map glob, (string) ->
        if string.startsWith '/'
          return string.slice(1)
        string
      fs.src patterns, options
    dest: fs.dest
    map: require 'map-stream'

  if task.config
    _.extend context, task.config()

  streamPromise = (stream) ->
    new Promise (resolve, reject) ->
      stream.bind(context)()
      .on 'finish', resolve
      .on 'end', resolve
      .on 'error', reject

  execute = ->
    pipeline = task.pipeline || ->
      glob = ['**/*.a']
      if task.type == 'dynamic' then glob = ['**/*.dylib', '**/*.so', '**/*.dll']
      @src glob
      .pipe @dest task.dstDir
    publicHeaders =  ->
      @src task.glob || ['**/*.h', '**.hpp']
      .pipe @dest task.dstDir + '/include'
    libHeader = ->
      @src(task.glob || ['**/' + task.name + '.h'], cwd: task.srcDir)
      .pipe @dest task.dstDir + '/include'

    streamPromise pipeline
    .then -> streamPromise publicHeaders
    .then -> streamPromise libHeader

  execute: execute
