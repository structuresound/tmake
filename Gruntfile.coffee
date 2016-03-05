module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      compile:
        expand: true
        options:
          bare: true
          sourceMap: true
        flatten: false
        cwd: "#{__dirname}/src/"
        src: ['*.coffee']
        dest: 'lib/'
        ext: '.js'
    nodeunit: files: [ 'test/**/*_test.js' ]
    jshint:
      options: jshintrc: '.jshintrc'
      lib: src: [ 'lib/**/*.js' ]
      test: src: [ 'test/**/*.js' ]
    watch:
      coffee:
        files: 'src/*.coffee'
        tasks: [ 'coffee', 'jshint' ]

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-nodeunit'
  grunt.loadNpmTasks 'grunt-contrib-jshint'

  grunt.registerTask 'default', ['coffee', 'jshint', 'watch']
