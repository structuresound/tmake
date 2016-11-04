import Promise from 'bluebird';
import fs from '../util/fs';
import check from '../util/check';
import sh from '../util/sh';
import path from 'path';
// _toolchain = require './toolchain'
import log from '../util/log';

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
const buildSettings = dep.build;

const buildFolder = function() {
  if (buildTests) {
    return dep.d.test;
  } else {
    return dep.d.build;
  }
};

const buildFile = function() {
  if (buildTests) {
    return path.join(dep.d.project, dep.test.buildFile);
  } else {
    return path.join(dep.d.project, dep.cache.buildFile);
  }
};

const commandBlock = {
  any(obj) {
    return commandBlock.shell(obj);
  },
  ninja() {
    return commandBlock.with ('ninja') ;
    }
  ,
  cmake() {
    return commandBlock.with ('cmake') ;
    }
  ,
  make() {
    return commandBlock.with ('make') ;
    }
  ,
  xcode() {
    return commandBlock.with ('xcode') ;
    }
  ,
  shell(obj) {
    return _p(platform.iterable(obj), function(c) {
      if (check(c, String)) {
        c = {
          cmd: c
        };
      }
      return sh.Promise(platform.parse(c.cmd, dep), platform.pathSetting(c.cwd || dep.d.source, dep), true);
    });
  },
  with(name) {
    return buildWith(name);
  }
};

const ensureBuildFolder = function() {
  if (!fs.existsSync(buildFolder())) {
    return fs.mkdirSync(buildFolder());
  }
};

const ensureBuildFile = function() {
  if (!check(buildFile(), "String")) {
    throw new Error("no build file specified");
  }
  if (!fs.existsSync(buildFile())) {
    throw new Error(`no build file @ ${buildFile()}`);
  }
};

var buildWith = function(system) {
  ensureBuildFolder();
  ensureBuildFile();
  switch (system) {
    case 'ninja':
      var runner = require('./ninja')(dep, platform, db);
      break;
    case 'cmake':
      runner = require('./cmake')(dep, platform, db);
      break;
    case 'gyp':
      runner = require('./gyp')(dep, platform, db);
      break;
    case 'make':
      runner = require('./make')(dep, platform, db);
      break;
    case 'xcode':
      runner = require('./xcode')(dep, platform, db);
      break;
  }
  return runner.build();
};

// hashSourceFolder = ->
//   cumulativeHash = dep.cache.url
//   globHeaders()
//   .then (headers) ->
//     _p headers, (header) ->
//       fileHash path.join dep.d.project, header
//       .then (hash) ->
//         cumulativeHash = stringHash(cumulativeHash + hash)
//     globSources()
//   .then (sources) ->
//     _p sources, (source) ->
//       fileHash path.join dep.d.project, source
//       .then (hash) ->
//         cumulativeHash = stringHash(cumulativeHash + hash)
//   .then ->
//     Promise.resolve cumulativeHash

export default {
  execute() {
    if (!buildSettings) {
      return Promise.resolve();
    }
    return platform.iterate(buildSettings, commandBlock, settings);
  }
};
