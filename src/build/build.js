import Promise from 'bluebird';
import path from 'path';
import {check} from '1e1f-tools';

import fs from '../util/fs';
import sh from '../util/sh';
import platform from '../platform';
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

function buildFolder(dep) {
  if (dep.build.buildTests) {
    return dep.d.test;
  }
  return dep.d.build;
}

function buildFile(dep) {
  if (dep.build.buildTests) {
    return path.join(dep.d.project, dep.test.buildFile);
  }
  return path.join(dep.d.project, dep.cache.buildFile);
}

function commandBlock(dep) {
  return (name, obj) => {
    switch (name) {
      case 'ninja':
      case 'cmake':
        return buildWith(name);
      case 'shell':
        return Promise.each(platform.iterable(obj), (c) => {
          let lc = check(c, String)
            ? lc = {
              cmd: c
            }
            : c;
          const setting = platform.pathSetting(lc.cwd || dep.d.source, dep);
          return sh.Promise(platform.parse(lc.cmd, dep), setting, true);
        });
      case 'any':
      default:
        return commandBlock.shell(obj);
    }
  };
}

function ensureBuildFolder(dep) {
  if (!fs.existsSync(buildFolder(dep))) {
    return fs.mkdirSync(buildFolder(dep));
  }
}

function ensureBuildFile(dep) {
  if (!check(buildFile(dep), 'String')) {
    throw new Error('no build file specified');
  }
  if (!fs.existsSync(buildFile(dep))) {
    throw new Error(`no build file @ ${buildFile(dep)}`);
  }
}

function buildWith(dep, system) {
  ensureBuildFolder(dep);
  ensureBuildFile(dep);
  switch (system) {
    case 'ninja':
      return ninja.build(dep);
    case 'cmake':
      return cmake.build(dep);
    default:
      throw new Error(`bad build system ${system}`);
  }
}

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
  execute(dep) {
    if (!dep.build) {
      return Promise.resolve();
    }
    return platform.iterate(dep.build, commandBlock(dep), settings);
  }
};
