import Promise from 'bluebird';
const gyp = require('node-gyp')();

const manualRebuild = () => new Promise((resolve, reject) => gyp.commands.clean([], function(error) {
  if (error) {
    return reject(error);
  }
  return gyp.commands.configure([], function(error) {
    if (error) {
      return reject(error);
    }
    return gyp.commands.build([], resolve);
  });
}));

export default {
  generate(context) {
    return Promise.resolve({
      includes: context.headers,
      targets: [
        {
          target_name: task.outputFile,
          type: 'static_library',
          sources: context.sources,
          include_dirs: context.includeDirs,
          libraries: context.libs,
          dependencies: [],
          cflags: context.cflags || ['-fPIC', '-Wall', '-Wno-c++11-extensions', '-std=c++0x']
        }
      ]
    });
  },

  build() {
    const defaultArgv = ['node', dep.d.root, '--loglevel=silent'];
    const gyp_argv = defaultArgv.slice();
    if (argv.verbose) {
      console.log('gyp argv:', JSON.stringify(gyp_argv, 0, 2));
    }
    gyp.parseArgv(gyp_argv);
    process.chdir(dep.d.build);
    return manualRebuild();
  }
};
