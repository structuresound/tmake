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
    babel:
      compile:
        expand: true
        options:
          sourceMap: true
          presets: ['babel-preset-es2015']
        cwd: "#{__dirname}/src/"
        src: ['**/*.js', '!*.test.js']
        dest: 'lib/'
        ext: '.js'
      tests:
        expand: true
        options:
          sourceMap: true
          presets: ['babel-preset-es2015']
        flatten: false
        cwd: "#{__dirname}/src/test"
        src: ['*.test.js']
        dest: 'test/'
        ext: '.js'
    simplemocha:
      options:
        globals: ['expect']
        timeout: 10000
        ignoreLeaks: true
        ui: 'bdd'
        reporter: 'tap'
      all:
        src: ['src/test/*.js']
    jshint:
      options: jshintrc: '.jshintrc'
      lib: src: [ 'lib/**/*.js' ]
      # test: src: [ 'test/**/*.js' ]
    watch:
      coffee:
        files: 'src/**/*.coffee'
        tasks: [ 'coffee', 'copy' ]

  grunt.loadNpmTasks 'grunt-babel'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-simple-mocha'
  grunt.loadNpmTasks 'grunt-contrib-copy'

  grunt.registerTask 'build', ['babel', 'coffee']
  grunt.registerTask 'test', ['babel', 'simplemocha']
  grunt.registerTask 'default', ['babel', 'simplemocha', 'watch']
