walk = require('walk')

module.exports = (config) ->
  moveFiles: ->
    options = {}
    walker = walk.walk(config.srcDir, config.walk)
    walker.on 'file', (root, fileStats, next) ->
      filename = fileStats.name
      console.log 'walk', filename
    walker.on 'errors', (root, nodeStatsArray, next) -> next()
    walker.on 'end', -> console.log 'all done'
  # process_files: ->
  #   options = {}
  #   walker = walk.walk(src_dir, options)
  #   walker.on 'file', (root, fileStats, next) ->
  #     filename = fileStats.name
  #     if filename.endsWith('.c') or filename.endsWith('.h')
  #       fs.readFile filename, (err, data) ->
  #         replace_includes data
  #         next()
  #     else
  #       next()
  #   walker.on 'errors', (root, nodeStatsArray, next) -> next()
  #   walker.on 'end', -> console.log 'all done'
