Promise = require 'bluebird'
gyp = require('node-gyp')()

manualRebuild = ->
  new Promise (resolve, reject) ->
    gyp.commands.clean [], (error) ->
      return reject(error) if error
      gyp.commands.configure [], (error) ->
        return reject(error) if error
        gyp.commands.build [], resolve

module.exports = (argv, dep) ->
  task = dep.build

  generate: (context) ->
    Promise.resolve
      includes: context.headers
      targets: [
        target_name: task.outputFile
        type: 'static_library'
        sources: context.sources
        include_dirs: context.includeDirs
        libraries: context.libs
        dependencies: []
        cflags: context.cflags || [
          '-fPIC',
          '-Wall',
          '-Wno-c++11-extensions',
          '-std=c++0x'
        ]
      ]

  build: ->
    defaultArgv = ['node', dep.d.root, '--loglevel=silent']
    gyp_argv = defaultArgv.slice()
    if argv.verbose then console.log 'gyp argv:', JSON.stringify(gyp_argv, 0, 2)
    gyp.parseArgv gyp_argv
    process.chdir dep.d.build
    manualRebuild()
