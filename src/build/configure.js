import _ from 'lodash';
import Promise from 'bluebird';
import path from 'path';
import {diff, check} from 'js-object-tools';

import fs from '../util/fs';
import sh from '../util/sh';
import log from '../util/log';
import toolchain from './toolchain';
import graph from '../graph';
import fetch from '../util/fetch';
import argv from '../util/argv';
import profile from '../profile';

import * as db from '../db';

import {jsonStableHash, stringHash} from '../util/hash';
import cmake from './cmake';
import ninja from './ninja';

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

function resolveConfiguration(dep, configureTests) {
  const filter = ['with', 'ninja', 'xcode', 'cmake', 'make'].concat(settings);

  let _build = _.pick(dep.build, filter);
  let _configuration = dep.configure;

  if (configureTests && dep.test) {
    _build = _.pick(dep.test.build, filter);
    _configuration = dep.test.configure;
  }

  return _.extend(_build, _configuration);
}

function functionIterable(dep) {
  return (name, obj) => {
    switch (name) {
      case 'ninja':
      case 'cmake':
        return createBuildFileFor(name);
      case 'any':
      case 'shell':
      default:
        return Promise.each(profile.iterable(obj), (command) => {
          const c = check(command, String)
            ? {
              cmd: command
            }
            : command;
          const setting = profile.pathSetting(c.cwd || dep.d.source, dep);
          return sh.Promise(profile.parse(c.cmd, dep), setting, !argv.quiet);
        });
      case 'replace':
        return Promise.each(profile.iterable(obj), (replEntry) => {
          const pattern = profile.globArray(replEntry.matching, dep);
          return fs
            .glob(pattern, undefined, dep.d.source)
            .then((files) => {
              return Promise.each(files, (file) => {
                return profile.replaceInFile(file, replEntry, dep);
              });
            });
        });
      case 'create':
        return Promise.each(profile.iterable(obj), (e) => {
          const filePath = path.join(dep.d.source, e.path);
          const existing = fs.readIfExists(filePath);
          if (existing !== e.string) {
            log.verbose(`create file ${filePath}`);
            return fs.writeFileAsync(filePath, e.string, {encoding: 'utf8'});
          }
        });
      case 'copy':
        return Promise.each(profile.iterable(obj), (e) => {
          log.quiet(`copy ${e}`);
          const fromDir = profile.pathSetting(e.from, dep);
          return copy(e.matching, fromDir, profile.pathSetting(e.to, dep), false);
        });
    }
  };
}

function copy(patterns, options) {
  const filePaths = [];
  return fs.wait(fs.src(patterns, {
    cwd: options.from,
    followSymlinks: false
  }).pipe(fs.map((file, emit) => {
    const mutable = file;
    log.verbose(`+ ${path.relative(mutable.cwd, mutable.path)}`);
    if (options.flatten) {
      mutable.base = path.dirname(mutable.path);
    }
    const newPath = path.join(options.to, path.relative(mutable.base, mutable.path));
    filePaths.push(path.relative(options.relative, newPath));
    return emit(null, file);
  })).pipe(fs.dest(options.to))).then(() => {
    return Promise.resolve(filePaths);
  });
}

function globHeaders(dep, configuration) {
  const patterns = profile.globArray(configuration.headers
    ? configuration.headers.matching
    : [
      '**/*.h',
      '**/*.hpp',
      '**/*.ipp',
      '!test/**',
      '!tests/**',
      '!build/**'
    ], dep);
  return Promise.map(dep.d.includeDirs, (includePath) => {
    return fs.glob(patterns, dep.d.project, includePath);
  }).then((stack) => {
    return Promise.resolve(_.flatten(stack));
  });
}

function globSources(dep, configuration) {
  const patterns = profile.globArray(configuration.sources.matching || [
    '**/*.cpp', '**/*.cc', '**/*.c', '!test/**', '!tests/**'
  ], dep);
  return fs.glob(patterns, dep.d.project, dep.d.source);
}

function globDeps(dep) {
  return graph.deps(dep);
}

const flags = require('./flags');

const stdCompilerFlags = {
  clang: {
    ios: {
      arch: 'arm64',
      isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}',
      'miphoneos-version-min': '={SDK_VERSION}',
      simulator: {
        'mios-simulator-version-min': '=6.1',
        isysroot: '{CROSS_TOP}/SDKs/{CROSS_SDK}'
      }
    }
  }
};
// arch: '{ARCH}'

// stdMmFlags =
//   'fobjc-abi-version': 2

const stdCxxFlags = {
  O: 2,
  mac: {
    std: 'c++11',
    stdlib: 'libc++'
  },
  linux: {
    std: 'c++0x',
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
    'lstdc++': true,
    'lpthread': true
  },
  mac: {
    'lc++': true
  }
};

function selectHostToolchain(dep) {
  let compiler = argv.compiler;
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
}

function resolveJsonFlags(configuration) {
  return {
    frameworks: profile.select(configuration.frameworks || stdFrameworks),
    cFlags: _.omit(_.extend(profile.select(stdCxxFlags), profile.select(configuration.cFlags || configuration.cxxFlags)), ['std', 'stdlib']),
    cxxFlags: _.extend(profile.select(stdCxxFlags), profile.select(configuration.cxxFlags || configuration.cFlags)),
    linkerFlags: _.extend(profile.select(stdLinkerFlags), profile.select(configuration.linkerFlags)),
    compilerFlags: _.extend(profile.select(stdCompilerFlags), profile.select(configuration.compilerFlags))
  };
}

function createContext(input) {
  const output = diff.clone(input);
  output.configuration = resolveConfiguration(output);
  const jsonFlags = resolveJsonFlags(output.configuration);
  output.toolchainConfiguration = {
    target: output.target,
    frameworks: flags.parseFrameworks(jsonFlags.frameworks),
    cFlags: flags.parseC(jsonFlags.cFlags),
    cxxFlags: flags.parseC(jsonFlags.cxxFlags),
    linkerFlags: flags.parse(jsonFlags.linkerFlags),
    compilerFlags: flags.parse(jsonFlags.compilerFlags, {join: ' '})
  };
  _.extend(output.toolchainConfiguration, selectHostToolchain());
  output.configuration = _.clone(output.toolchainConfiguration);
  return output;
}

function globFiles(input) {
  const output = diff.clone(input);
  return globHeaders(output).then((headers) => {
    output.configuration.headers = headers;
    return globSources();
  }).then((sources) => {
    output.configuration.sources = sources;
    return globDeps();
  }).then((depGraph) => {
    if (depGraph.length) {
      output.configuration.libs = _
        .chain(depGraph)
        .map(d => {
          return _.map(d.libs, (lib) => {
            return path.join(d.d.home, lib);
          });
        })
        .flatten()
        .value()
        .reverse();
    }
    output.configuration.includeDirs = _.union([`${output.d.home}/include`], output.d.includeDirs);
    return Promise.resolve(output);
  });
}

function getBuildFile(dep, systemName) {
  const buildFileNames = {
    ninja: 'build.ninja',
    cmake: 'CMakeLists.txt',
    gyp: 'binding.gyp',
    make: 'Makefile',
    xcode: `${dep.name}.xcodeproj`
  };
  return buildFileNames[systemName];
}

function getBuildFilePath(dep, systemName) {
  return path.join(dep.d.project, getBuildFile(systemName));
}

function createBuildFileFor(input, systemName) {
  const dep = diff.clone(input);
  return fs
    .existsAsync(getBuildFilePath(dep, systemName))
    .then((exists) => {
      if (exists) {
        const buildFileName = getBuildFile(dep, systemName);
        log.quiet(`using pre-existing build file ${buildFileName}`);
        dep.cache.buildFile = buildFileName;
        return db.update({
          name: dep.name
        }, {
          $set: {
            'cache.buildFile': dep.cache.buildFile
          }
        });
      }
      return generateConfig(systemName);
    })
    .then(() => {
      return Promise.resolve(dep);
    });
}

function generateConfig(input, systemName) {
  return globFiles(input).then((conf) => {
    return generateBuildFile(conf, systemName);
  }).then((conf) => {
    return processConfig(conf, systemName);
  });
}

function generateBuildFile(input, systemName) {
  const buildFile = getBuildFilePath(systemName);
  switch (systemName) {
    case 'ninja':
      return ninja.generate(input, buildFile);
    case 'cmake':
      return cmake
        .generate(input)
        .then((CMakeLists) => {
          return fs.writeFileAsync(buildFile, CMakeLists);
        })
        .then((conf) => {
          return Promise.resolve(conf);
        });
    default:
      throw new Error(`bad build system ${systemName}`);
  }
}

function processConfig(input, systemName) {
  const conf = diff.clone(input);
  const buildFileName = getBuildFile(systemName);
  conf.cache.buildFile = buildFileName;
  return db.update({
    name: conf.name
  }, {
    $set: {
      'cache.buildFile': conf.cache.buildFile,
      'cache.generatedBuildFile': conf.cache.buildFile
    }
  }).then(() => {
    return Promise.resolve(conf);
  });
}

function hashMetaConfiguration(configuration) {
  const urlHash = stringHash(fetch.resolveUrl());
  return stringHash(urlHash + jsonStableHash(configuration));
}

function needsReconfigure(dep, cumulativeHash) {
  if (dep.cache.metaConfiguration) {
    if (cumulativeHash !== dep.cache.metaConfiguration) {
      const url = fetch.resolveUrl();
      if (dep.cache.url !== stringHash(url)) {
        log.error(`url is stale, now ${url}`);
      } else {
        log.error(`${dep.name} configuration is stale ${dep.cache.metaConfiguration}, now ${cumulativeHash}`);
        log.error(dep.configuration);
      }
      return true;
    }
  } else {
    return true;
  }
}

export default {
  hashMetaConfiguration,
  execute(input) {
    const conf = createContext(input);
    const configHash = hashMetaConfiguration(conf);
    if (profile.force(conf) || needsReconfigure(conf, configHash)) {
      return profile.iterate(conf.configuration, functionIterable(conf), settings).then(() => {
        return db.update({
          name: conf.name
        }, {
          $set: {
            'cache.metaConfiguration': configHash
          }
        });
      });
    }
    log.verbose(`configuration ${configHash} is current, use --force=${conf.name} if you suspect the cache is stale`);
    return Promise.resolve(conf);
  }
};
