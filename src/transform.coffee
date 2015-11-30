_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")
#pipe = require('gulp-pipe')

module.exports = (task) ->
  context =
    src: (glob, opt) ->
      options = opt or {}
      options.cwd = task.srcDir
      patterns = _.map glob, (string) ->
        if string.startsWith '/'
          return string.slice(1)
        string
      fs.src patterns, options
    dest: fs.dest
    map: require 'map-stream'

  if task.config
    _.extend context, task.config()

  execute = ->
    pipeline = task.pipeline || ->
      @src task.glob || ['**/*', '!.git', '!.gitignore']
      .pipe @dest task.dstDir
    new Promise (resolve, reject) ->
      pipeline.bind(context)()
      .on 'finish', resolve
      .on 'end', resolve
      .on 'error', reject

  execute: execute
