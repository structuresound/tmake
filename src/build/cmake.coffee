_ = require 'underscore'
Promise = require 'bluebird'
fs = require '../fs'
numCPUs = require('os').cpus().length
path = require('path')
sh = require('shelljs')
colors = require ('chalk')

module.exports = (dep, argv) ->
  ninja = require('./ninja')(dep, argv)

  run = (command) ->
    if argv.verbose then console.log colors.green("run cmake command: " + command)
    new Promise (resolve, reject) ->
      sh.cd dep.d.build
      sh.exec command, (code, stdout, stderr) ->
        if code then reject "cmake exited with code " + code + "\n" + command
        else if stdout then resolve stdout
        else if stderr then resolve stderr

  configure = (ninjaPath) ->
    cMakeDefines = _.extend
      LIBRARY_OUTPUT_PATH: dep.d.install.libraries[0].from
    , dep.build.cmake?.configure
    command = "cmake -G Ninja -DCMAKE_MAKE_PROGRAM=#{ninjaPath} #{dep.d.project}"
    _.each cMakeDefines, (value, key) ->
      if typeof value == 'string' or value instanceof String
        if value.startsWith '~/'
          value = "#{dep.d.home}/#{value.slice(2)}"
      command += " -D#{key}=#{value}"
    run command

  ###
  # CONFIG GEN
  ###

  cmakeArrayToQuotedList = (array) ->
    s = ""
    _.each array, (el, i) ->
      if i == 0 then s += "\"#{el}\""
      else s += " \"#{el}\""
    s

  header = -> """
              # generated by trieMake
              cmake_minimum_required(VERSION #{@cmake?.minimumVersion || '3.2'})
              project(#{@name} VERSION #{@version || '0.0.1'})
              """

  boost = ->
    if @boost
      if typeof @boost == 'string' or @boost instanceof String
        @boost = libs: [@boost]
      """\n
      # Include BoostLib module
      SET(CMAKE_MODULE_PATH "#{path.join @npmDir, "node_modules/boost-lib/cmake"}")
      include(BoostLib)
      # Locate/Download Boost (semver)
      require_boost_libs("#{@boost.version || ">= 1.59.0"}" "#{@boost.libs.join ";"}")
      include_directories(${Boost_INCLUDE_DIRS})
      """

  includeDirectories = ->
    switch @target
      when 'static', 'dynamic', 'bin'
        """\n
        include_directories(#{cmakeArrayToQuotedList @includeDirs})
        """
      when 'node'
        """\n
        # Essential include files to build a node addon,
        # you should add this line in every CMake.js based project.
        include_directories(${CMAKE_JS_INC})
        include_directories(#{cmakeArrayToQuotedList @includeDirs})
        """

  sources = ->
    """\n
    set(SOURCE_FILES ${SOURCE_FILES} #{cmakeArrayToQuotedList @sources})
    """

  flags = ->
    """\n
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} #{@cxxFlags}")
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} #{@cFlags}")
    """

  target = ->
    switch @target
      when 'static'
        """\n
        add_library(#{@name} STATIC ${SOURCE_FILES})
        """
      when 'bin'
        """\n
        add_executable(#{@name} ${SOURCE_FILES})
        """

  link = ->
    libs = cmakeArrayToQuotedList @libs
    if @boost then libs += " ${Boost_LIBRARIES}"
    if @target == 'node' then libs += " ${CMAKE_JS_LIB}"
    if libs.length
      """\n
      target_link_libraries(${PROJECT_NAME} #{libs})
      """

  generateLists = (funcs, context) ->
    list = ""
    Promise.each funcs, (fn) ->
      Promise.resolve fn.bind(context)()
      .then (val) -> if val then list += val
    .then ->
      Promise.resolve list

  generate: (context) ->
    if argv.verbose then console.log colors.green('configure cmake with context:'), JSON.stringify context,0,2
    generateLists [header, boost, includeDirectories, sources, flags, target, link], context

  configure: ->
    ninja.getNinja()
    .then (ninjaPath) ->
      configure ninjaPath

  build: ->
    ninja.getNinja()
    .then (ninjaPath) ->
      configure ninjaPath
      .then -> run ninjaPath
