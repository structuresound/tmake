_ = require('underscore')
fs = require('vinyl-fs')
Promise = require("bluebird")
#pipe = require('gulp-pipe')

module.exports = (dep, argv, db) ->
  task = dep.transform
  task.name ?= dep.name
  task.srcDir ?= dep.srcDir
  task.dstDir ?= dep.tempDir

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

  transform = ->
    pipeline = task.pipeline || ->
      @src task.glob || ['**/*', '!.git', '!.gitignore']
      .pipe @dest task.dstDir
    new Promise (resolve, reject) ->
      pipeline.bind(context)()
      .on 'finish', resolve
      .on 'end', resolve
      .on 'error', reject

  execute: -> transform().then -> db.deps.update {name: dep.name}, $set: transformed: true
