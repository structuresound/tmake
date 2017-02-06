module.exports = (grunt) ->
  grunt.initConfig
    babel:
      lib:
        expand: true
        options:
          sourceMap: true
          presets: ['babel-preset-es2015']
        cwd: "#{__dirname}/src/"
        src: ['**/*.js']
        dest: 'lib/'
        ext: '.js'
    ts:
      dev:
        src: ['src/**/*.ts']
        outDir: 'lib',
        watch: 'src'
      options:
        noImplicitAny: true
        moduleResolution: 'node'
        target: 'es5'
        module: 'commonjs'
        noLib: false
        removeComments: true
        preserveConstEnums: true
        allowSyntheticDefaultImports: true
        allowJs: true
        declaration: false
        sourceMap: true
    dtsGenerator:
      options:
        name: 'tmake'
        project: './'
        out: 'tmake.d.ts'
      default:
        src: [ '/src/**/*.ts' ]

  grunt.loadNpmTasks 'dts-generator'

  grunt.loadNpmTasks 'grunt-ts'
  grunt.loadNpmTasks 'grunt-babel'

  grunt.registerTask 'build', ['ts', 'babel']
  grunt.registerTask 'default', ['build']
  grunt.registerTask 'declare', ['dtsGenerator']
