module.exports = function (grunt) {
  grunt.loadNpmTasks('dts-generator');
  grunt.initConfig({
    dtsGenerator: {
      options: {
        name: 'tmake-core',
        project: './',
        out: 'tmake-core.d.ts'
      },
      default: {
        src: ['/src/**/*.ts']
      }
    }
  });
  grunt.registerTask('default', ['dtsGenerator']);
};
