module.exports = function (grunt) {
  grunt.loadNpmTasks('dts-generator');
  grunt.initConfig({
    dtsGenerator: {
      options: {
        name: 'tmake-file',
        project: './',
        out: 'tmake-file.d.ts'
      },
      default: {
        src: ['/src/**/*.ts']
      }
    }
  });
  grunt.registerTask('default', ['dtsGenerator']);
};
