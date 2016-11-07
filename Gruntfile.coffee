module.exports = (grunt) ->
  grunt.initConfig
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

  grunt.loadNpmTasks 'grunt-babel'

  grunt.registerTask 'default', ['babel']
