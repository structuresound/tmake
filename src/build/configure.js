import _ from 'underscore';
import Promise from 'bluebird';
import fs from '../util/fs';
import path from 'path';
import check from '../util/check';
import sh from '../util/sh';
import log from '../util/log';
import {jsonStableHash} from '../util/hash';
import {stringHash} from '../util/hash';
import {fileHash} from '../util/hash';
import toolchain from './toolchain';
import graph from '../graph';
import fetch from '../util/fetch';

const commands = {
  any(obj) {
    return commands.shell(obj);
  },
  ninja() {
    return commands.with ('ninja') ;
    }
  ,
  cmake() {
    return commands.with ('cmake') ;
    }
  ,
  make() {
    return commands.with ('make') ;
    }
  ,
  xcode() {
    return commands.with ('xcode') ;
    }
  ,
  replace(obj) {
    return _p(platform.iterable(obj), replEntry => fs.glob(platform.globArray(replEntry.matching, dep), undefined, dep.d.source).then(files => _p(files, file => platform.replaceInFile(file, replEntry, dep))));
  },

  shell(obj) {
    return _p(platform.iterable(obj), function(c) {
      if (check(c, String)) {
        c = {
          cmd: c
        };
      }
      return sh.Promise(platform.parse(c.cmd, dep), platform.pathSetting(c.cwd || dep.d.source, dep), !argv.quiet);
    });
  },

  create(obj) {
    return _p(platform.iterable(obj), function(e) {
      const filePath = path.join(dep.d.source, e.path);
      const existing = fs.readIfExists(filePath);
      if (existing !== e.string) {
        log.verbose(`create file ${filePath}`);
        return fs.writeFileAsync(filePath, e.string, {encoding: 'utf8'});
      }
    });
  },

  with(system) {
    log.verbose(`configure for: ${system}`);
    return createBuildFileFor(system);
  },

  copy(obj) {
    return _p(platform.iterable(obj), function(e) {
      log.quiet(`copy ${e}`);
      return copy(e.matching, platform.pathSetting(e.from, dep), platform.pathSetting(e.to, dep), false);
    });
  }
};

const settings = [
  'linkerFlags',
  'cFlags',
  'cxxFlags',
  'compilerFlags',
  'defines',
  'frameworks',
  'sources',
  'headers',
  'outputFile'
];
const filter = ['with', 'ninja', 'xcode', 'cmake', 'make'].concat(settings);

const _build = _.pick(dep.build, filter);
const _configuration = dep.configure;

if (configureTests && dep.test) {
  _build = _.pick(dep.test.build, filter);
  _configuration = dep.test.configure;
}

const configuration = _.extend(_build, _configuration);
var copy = function(patterns, from, to, flatten) {
  const filePaths = [];
  return fs.wait(fs.src(patterns, {
    cwd: from,
    followSymlinks: false
  }).pipe(fs.map(function(file, emit) {
    log.verbose(`+ ${path.relative(file.cwd, file.path)}`);
    if (flatten) {
      file.base = path.dirname(file.path);
    }
    const newPath = to + '/' + path.relative(file.base, file.path);
    filePaths.push(path.relative(dep.d.home, newPath));
    return emit(null, file);
  })).pipe(fs.dest(to))).then(() => Promise.resolve(filePaths));
};

const globHeaders = function() {
  const patterns = platform.globArray(__guard__(configuration.headers, x => x.matching) || [
    '**/*.h',
    '**/*.hpp',
    '**/*.ipp',
    '!test/**',
    '!tests/**',
    '!build/**'
  ], dep);
  return Promise.map(dep.d.includeDirs, path => fs.glob(patterns, dep.d.project, path)).then(stack => Promise.resolve(_.flatten(stack)));
};

const globSources = function() {
  const patterns = platform.globArray(__guard__(configuration.sources, x => x.matching) || [
    '**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**'
  ], dep);
  return fs.glob(patterns, dep.d.project, dep.d.source);
};

const globDeps = () => graph.deps(dep);

const flags = require('./flags');

const stdCompilerFlags = {
  clang: {
    ios: {
      arch: "arm64",
      isysroot: "{CROSS_TOP}/SDKs/{CROSS_SDK}",
      "miphoneos-version-min": "={SDK_VERSION}",
      simulator: {
        "mios-simulator-version-min": "=6.1",
        isysroot: "{CROSS_TOP}/SDKs/{CROSS_SDK}"
      }
    }
  }
};
// arch: "{ARCH}"

// stdMmFlags =
//   "fobjc-abi-version": 2

const stdCxxFlags = {
  O: 2,
  mac: {
    std: "c++11",
    stdlib: "libc++"
  },
  linux: {
    std: "c++0x",
    pthread: true
  }
};

const stdFrameworks = {
  mac: {
    CoreFoundation: true
  }
};

const stdLinkerFlags = {
  // static: true
  linux: {
    "lstdc++": true,
    "lpthread": true
  },
  mac: {
    "lc++": true
  }
};

const jsonFlags = {
  frameworks: platform.select(configuration.frameworks || stdFrameworks),
  cFlags: _.omit(_.extend(platform.select(stdCxxFlags), platform.select(configuration.cFlags || configuration.cxxFlags)), ['std', 'stdlib']),
  cxxFlags: _.extend(platform.select(stdCxxFlags), platform.select(configuration.cxxFlags || configuration.cFlags)),
  linkerFlags: _.extend(platform.select(stdLinkerFlags), platform.select(configuration.linkerFlags)),
  compilerFlags: _.extend(platform.select(stdCompilerFlags), platform.select(configuration.compilerFlags))
};

const selectHostToolchain = function() {
  const {compiler} = argv;
  if (dep.build) {
    if (typeof compiler === 'undefined' || compiler === null) {
      compiler = dep.build.cc;
    }
  }
  if (dep.configure) {
    if (typeof compiler === 'undefined' || compiler === null) {
      compiler = dep.configure.cc;
    }
  }

  const hostToolchain = toolchain.select(dep.toolchain);
  log.verbose(hostToolchain);
  log.verbose(`look for compiler ${compiler}`);
  const cc = toolchain.pathForTool(hostToolchain[compiler]);
  return {hostToolchain, compiler, cc};
};

const createContext = function() {
  dep.toolchainConfiguration = {
    target: dep.target,
    frameworks: flags.parseFrameworks(jsonFlags.frameworks),
    cFlags: flags.parseC(jsonFlags.cFlags),
    cxxFlags: flags.parseC(jsonFlags.cxxFlags),
    linkerFlags: flags.parse(jsonFlags.linkerFlags),
    compilerFlags: flags.parse(jsonFlags.compilerFlags, {join: " "})
  };
  _.extend(dep.toolchainConfiguration, selectHostToolchain());
  return dep.configuration = _.clone(dep.toolchainConfiguration);
};

const globFiles = () => globHeaders().then(function(headers) {
  dep.configuration.headers = headers;
  return globSources();
}).then(function(sources) {
  dep.configuration.sources = sources;
  return globDeps();
}).then(function(depGraph) {
  if (depGraph.length) {
    dep.configuration.libs = _.chain(depGraph).map(d => _.map(d.libs, lib => path.join(d.d.home, lib))).flatten().value().reverse();
  }
  dep.configuration.includeDirs = _.union([`${dep.d.home}/include`], dep.d.includeDirs);
  return Promise.resolve();
});

const getBuildFile = function(systemName) {
  const buildFileNames = {
    ninja: 'build.ninja',
    cmake: 'CMakeLists.txt',
    gyp: 'binding.gyp',
    make: 'Makefile',
    xcode: `${dep.name}.xcodeproj`
  };
  return buildFileNames[systemName];
};

const getBuildFilePath = systemName => path.join(dep.d.project, getBuildFile(systemName));

var createBuildFileFor = systemName => fs.existsAsync(getBuildFilePath(systemName)).then(function(exists) {
  if (exists) {
    const buildFileName = getBuildFile(systemName);
    log.quiet(`using pre-existing build file ${buildFileName}`);
    dep.cache.buildFile = buildFileName;
    return db.update({
      name: dep.name
    }, {
      $set: {
        "cache.buildFile": dep.cache.buildFile
      }
    });
  } else {
    return generateConfig(systemName);
  }
});

var generateConfig = function(systemName) {
  const buildFileName = getBuildFile(systemName);
  const buildFile = getBuildFilePath(systemName);
  return globFiles().then(function() {
    switch (systemName) {
      case 'ninja':
        return require('./ninja')(dep, platform, db).generate(buildFile);
      case 'cmake':
        return require('./cmake')(dep, platform, db).generate().then(CMakeLists => fs.writeFileAsync(buildFile, CMakeLists));
      case 'gyp':
        return require('./gyp')(dep, platform, db).generate().then(binding => fs.writeFileAsync(buildFile, JSON.stringify(binding, 0, 2)));
      case 'make':
        return require('./make')(dep.configuration).generate().then(Makefile => fs.writeFileAsync(buildFile, JSON.stringify(Makefile, 0, 2)));
      case 'xcode':
        return require('./xcode')(dep, platform, db).generate(buildFile);
    }
  }).then(function() {
    dep.cache.buildFile = buildFileName;
    return db.update({
      name: dep.name
    }, {
      $set: {
        "cache.buildFile": dep.cache.buildFile,
        "cache.generatedBuildFile": dep.cache.buildFile
      }
    });
  });
};

const hashMetaConfiguration = function() {
  const urlHash = stringHash(fetch.resolveUrl());
  return stringHash(urlHash + jsonStableHash(configuration));
};

const needsReconfigure = function(cumulativeHash) {
  if (dep.cache.metaConfiguration) {
    if (cumulativeHash !== dep.cache.metaConfiguration) {
      const url = fetch.resolveUrl();
      if (dep.cache.url !== stringHash(url)) {
        log.error(`url is stale, now ${url}`);
      } else {
        log.error(`${dep.name} configuration is stale ${dep.cache.metaConfiguration}, now ${cumulativeHash}`);
        log.error(configuration);
      }
      return true;
    }
  } else {
    return true;
  }
};

export default {
  hashMetaConfiguration,
  commands,
  execute() {
    createContext();
    const configHash = hashMetaConfiguration();
    if (platform.force(dep) || needsReconfigure(configHash)) {
      return platform.iterate(configuration, commands, settings).then(() => db.update({
        name: dep.name
      }, {
        $set: {
          "cache.metaConfiguration": configHash
        }
      }));
    } else {
      log.verbose(`configuration ${configHash} is current, use --force=${dep.name} if you suspect the cache is stale`);
      return Promise.resolve();
    }
  }
};
