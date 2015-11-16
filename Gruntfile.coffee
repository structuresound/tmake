module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      compile:
        expand: true,
        flatten: true,
        cwd: "#{__dirname}/lib/",
        src: ['*.coffee'],
        dest: 'build/',
        ext: '.js'
    nodeunit: files: [ 'test/**/*_test.js' ]
    jshint:
      options: jshintrc: '.jshintrc'
      lib: src: [ 'build/**/*.js' ]
      test: src: [ 'test/**/*.js' ]
    watch:
      coffee:
        files: 'lib/*.coffee'
        tasks: [ 'coffee', 'jshint' ]

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-nodeunit'
  grunt.loadNpmTasks 'grunt-contrib-jshint'

  grunt.registerTask 'default', ['coffee', 'jshint']

# module.exports = (grunt) ->
#   grunt.initConfig
#     coffee:
#       compileJoined:
#         options:
#           join: true
#         files:
#           'js/application.js':
#             [
#               'lib/*.coffee'
#             ]
    # nodeunit: files: [ 'test/**/*_test.js' ]
    # jshint:
    #   options: jshintrc: '.jshintrc'
    #   gruntfile: src: 'Gruntfile.js'
    #   lib: src: [ 'lib/**/*.js' ]
    #   test: src: [ 'test/**/*.js' ]
#     watch:
#       gruntfile:
#         files: '<%= jshint.gruntfile.src %>'
#         tasks: [ 'jshint:gruntfile' ]
#       lib:
#         files: 'lib/*.coffee'
#         tasks:
#           [
#             'coffee'
#           ]
      # libjs:
      #   files: '<%= jshint.lib.src %>'
      #   tasks: [
      #     'jshint:lib'
      #     'nodeunit'
      #   ]
      # test:
      #   files: '<%= jshint.test.src %>'
      #   tasks: [
      #     'jshint:test'
      #     'nodeunit'
      #   ]
#   # These plugins provide necessary tasks.

#   grunt.loadNpmTasks 'grunt-contrib-watch'
#   # Default task.
#   grunt.registerTask 'default', [
#     'jshint'
#     'nodeunit'
#   ]
