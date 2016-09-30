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
        src: ['**/*.coffee', '!*.test.coffee']
        dest: 'lib/'
        ext: '.js'
      tests:
        expand: true
        options:
          bare: true
          sourceMap: true
        flatten: false
        cwd: "#{__dirname}/src/test"
        src: ['*.test.coffee']
        dest: 'test/'
        ext: '.js'
    copy: js: files: [
      expand: true
      cwd: "#{__dirname}/src/"
      src: [ "**/*.js" ]
      dest: 'lib/'
      filter: 'isFile'
    ]
    simplemocha:
      options:
        globals: ['expect']
        timeout: 10000
        ignoreLeaks: true
        ui: 'bdd'
        reporter: 'tap'
      all:
        src: ['test/*.js']
    jshint:
      options: jshintrc: '.jshintrc'
      lib: src: [ 'lib/**/*.js' ]
      # test: src: [ 'test/**/*.js' ]
    watch:
      coffee:
        files: 'src/**/*.coffee'
        tasks: [ 'coffee', 'copy' ]

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-simple-mocha'
  grunt.loadNpmTasks 'grunt-contrib-copy'

  grunt.registerTask 'test', ['coffee', 'simplemocha']
  grunt.registerTask 'default', ['coffee', 'copy', 'simplemocha', 'watch']
